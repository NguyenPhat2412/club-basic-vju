package com.vju.club.storage.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.StorageProperties;
import com.vju.club.exception.DocumentStorageException;
import com.vju.club.storage.DocumentStorage;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.time.Duration;
import java.util.Collections;
import java.util.HexFormat;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;
import java.util.stream.IntStream;

/**
 * Centralized Google Drive Vault adapter ("App-Controlled Vault").
 * All system, club, and department files live under {@code rootFolderId} owned by the system account,
 * organized hierarchically while enforcing RBAC exclusively through the backend.
 */
public class GoogleDriveDocumentStorage implements DocumentStorage {
    private static final Logger log = LoggerFactory.getLogger(GoogleDriveDocumentStorage.class);
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String FOLDER_MIME = "application/vnd.google-apps.folder";
    private static final int MAX_FOLDER_CACHE = 1_024;
    // ponytail: 4096 cached Drive file IDs (~512KB), swap to Caffeine if vault exceeds 50k hot files
    private static final int MAX_FILE_CACHE = 4_096;
    private static final int FOLDER_LOCK_STRIPES = 32;

    private final String apiBaseUrl;
    private final String rootFolderId;
    private final HttpClient httpClient;
    private final GoogleDriveTokenProvider tokenProvider;
    private final Object[] folderLocks = IntStream.range(0, FOLDER_LOCK_STRIPES).mapToObj(i -> new Object()).toArray();
    private final Map<String, String> folderCache = boundedLruMap(MAX_FOLDER_CACHE);
    private final Map<String, String> fileIdCache = boundedLruMap(MAX_FILE_CACHE);

    public GoogleDriveDocumentStorage(StorageProperties.GDrive settings,
                                      HttpClient httpClient,
                                      GoogleDriveTokenProvider tokenProvider) {
        this.apiBaseUrl = settings.getApiBaseUrl().strip().replaceAll("/+$", "");
        this.rootFolderId = settings.getRootFolderId().strip();
        this.httpClient = httpClient;
        this.tokenProvider = tokenProvider;
    }

    public static GoogleDriveDocumentStorage create(StorageProperties.GDrive settings) {
        HttpClient client = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(15)).build();
        GoogleDriveTokenProvider provider = new GoogleDriveTokenProvider(settings, client);
        return new GoogleDriveDocumentStorage(settings, client, provider);
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType) {
        put(key, content, size, contentType, Collections.emptyMap());
    }

    @Override
    public void put(String key, InputStream content, long size, String contentType, Map<String, String> metadata) {
        if (key == null || key.isBlank() || key.contains("..") || key.startsWith("/")) {
            throw new IllegalArgumentException("Invalid object key: " + key);
        }
        try {
            String folderPath = metadata.getOrDefault("vaultFolder", parentFolderOf(key));
            String parentId = ensureFolderHierarchy(folderPath);
            String displayName = metadata.getOrDefault("displayName", fileNameOf(key));

            Map<String, String> appProps = new LinkedHashMap<>();
            appProps.put("vjuKeyHash", sha256Hex(key));
            if (metadata.containsKey("scope")) appProps.put("scope", truncate(metadata.get("scope"), 32));
            if (metadata.containsKey("clubCode")) appProps.put("clubCode", truncate(metadata.get("clubCode"), 40));

            Map<String, Object> fileMeta = new LinkedHashMap<>();
            fileMeta.put("name", displayName);
            fileMeta.put("parents", List.of(parentId));
            fileMeta.put("appProperties", appProps);

            String boundary = "vju_vault_" + UUID.randomUUID().toString().replace("-", "");
            byte[] bodyBytes = buildMultipartRelated(boundary, JSON.writeValueAsBytes(fileMeta), content, contentType);

            HttpResponse<String> response = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,size"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + token)
                    .header("Content-Type", "multipart/related; boundary=" + boundary)
                    .POST(HttpRequest.BodyPublishers.ofByteArray(bodyBytes))
                    .build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                if (response.statusCode() == 404) folderCache.remove(folderPath);
                log.error("Google Drive upload of {} failed with HTTP {}: {}", key, response.statusCode(), response.body());
                throw new DocumentStorageException("Could not store the file in Google Drive Vault");
            }
            String fileId = JSON.readTree(response.body()).path("id").asText("");
            if (fileId.isBlank()) {
                throw new DocumentStorageException("Google Drive upload returned no file ID");
            }
            fileIdCache.put(key, fileId);
        } catch (DocumentStorageException e) {
            throw e;
        } catch (Exception e) {
            log.error("Google Drive upload of {} failed", key, e);
            throw new DocumentStorageException("Could not store the file in Google Drive Vault", e);
        }
    }

    @Override
    public StoredObject open(String key) {
        String fileId = resolveFileId(key);
        try {
            HttpResponse<InputStream> response = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/drive/v3/files/" + encPath(fileId) + "?alt=media&supportsAllDrives=true"))
                    .timeout(Duration.ofSeconds(60))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build(), HttpResponse.BodyHandlers.ofInputStream());
            if (response.statusCode() == 404) {
                closeQuietly(response.body());
                fileIdCache.remove(key);
                throw new DocumentStorageException("Stored file is missing from Google Drive Vault");
            }
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                closeQuietly(response.body());
                throw new DocumentStorageException("Could not read file from Google Drive Vault (HTTP " + response.statusCode() + ")");
            }
            long length = response.headers().firstValueAsLong("Content-Length").orElse(-1L);
            if (length < 0) {
                try (InputStream stream = response.body()) {
                    byte[] bytes = stream.readAllBytes();
                    return new StoredObject(new java.io.ByteArrayInputStream(bytes), bytes.length);
                }
            }
            return new StoredObject(response.body(), length);
        } catch (DocumentStorageException e) {
            throw e;
        } catch (Exception e) {
            throw new DocumentStorageException("Could not read stored file from Google Drive Vault", e);
        }
    }

    @Override
    public void delete(String key) {
        String fileId = fileIdCache.remove(key);
        if (fileId == null) {
            fileId = findFileIdByKeyHash(sha256Hex(key)).orElse(null);
        }
        if (fileId == null) return;
        String fileIdFinal = fileId;
        try {
            HttpResponse<String> response = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/drive/v3/files/" + encPath(fileIdFinal) + "?supportsAllDrives=true"))
                    .timeout(Duration.ofSeconds(20))
                    .header("Authorization", "Bearer " + token)
                    .DELETE()
                    .build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() >= 300 && response.statusCode() != 404) {
                throw new DocumentStorageException("Could not delete orphan Google Drive file (HTTP " + response.statusCode() + ")");
            }
        } catch (DocumentStorageException e) {
            throw e;
        } catch (Exception e) {
            throw new DocumentStorageException("Could not delete orphan Google Drive file", e);
        }
    }

    @Override
    public Optional<URI> presignDownload(String key, String fileName, String contentType, Duration ttl) {
        return Optional.empty();
    }

    private String ensureFolderHierarchy(String folderPath) throws Exception {
        if (folderPath == null || folderPath.isBlank()) return rootFolderId;
        String currentParent = rootFolderId;
        StringBuilder pathSoFar = new StringBuilder();
        for (String rawSegment : folderPath.split("/")) {
            String segment = rawSegment.strip();
            if (segment.isEmpty()) continue;
            if (!pathSoFar.isEmpty()) pathSoFar.append('/');
            pathSoFar.append(segment);
            String cacheKey = pathSoFar.toString();
            String cachedId = folderCache.get(cacheKey);
            if (cachedId != null) {
                currentParent = cachedId;
                continue;
            }
            String parentRef = currentParent;
            synchronized (folderLocks[Math.floorMod(cacheKey.hashCode(), FOLDER_LOCK_STRIPES)]) {
                cachedId = folderCache.get(cacheKey);
                if (cachedId == null) {
                    cachedId = findOrCreateFolder(parentRef, segment);
                    folderCache.put(cacheKey, cachedId);
                }
            }
            currentParent = cachedId;
        }
        return currentParent;
    }

    private String findOrCreateFolder(String parentId, String folderName) throws Exception {
        String escaped = folderName.replace("\\", "\\\\").replace("'", "\\'");
        String q = "name='" + escaped + "' and '" + parentId + "' in parents and mimeType='"
                + FOLDER_MIME + "' and trashed=false";
        HttpResponse<String> queryRes = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                .uri(URI.create(apiBaseUrl + "/drive/v3/files?q=" + enc(q)
                        + "&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)&pageSize=1"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .GET()
                .build(), HttpResponse.BodyHandlers.ofString());
        if (queryRes.statusCode() >= 200 && queryRes.statusCode() < 300) {
            JsonNode files = JSON.readTree(queryRes.body()).path("files");
            if (files.isArray() && !files.isEmpty()) {
                return files.get(0).path("id").asText();
            }
        }
        byte[] payload = JSON.writeValueAsBytes(Map.of(
                "name", folderName,
                "mimeType", FOLDER_MIME,
                "parents", List.of(parentId)
        ));
        HttpResponse<String> createRes = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                .uri(URI.create(apiBaseUrl + "/drive/v3/files?supportsAllDrives=true&fields=id"))
                .timeout(Duration.ofSeconds(15))
                .header("Authorization", "Bearer " + token)
                .header("Content-Type", "application/json; charset=UTF-8")
                .POST(HttpRequest.BodyPublishers.ofByteArray(payload))
                .build(), HttpResponse.BodyHandlers.ofString());
        if (createRes.statusCode() < 200 || createRes.statusCode() >= 300) {
            throw new DocumentStorageException("Could not create Vault folder '" + folderName + "' on Google Drive");
        }
        return JSON.readTree(createRes.body()).path("id").asText();
    }

    private String resolveFileId(String key) {
        String cached = fileIdCache.get(key);
        if (cached != null) return cached;
        String found = findFileIdByKeyHash(sha256Hex(key))
                .orElseThrow(() -> new DocumentStorageException("Stored file is missing from Google Drive Vault"));
        fileIdCache.put(key, found);
        return found;
    }

    private <T> HttpResponse<T> sendWithAuthRetry(Function<String, HttpRequest> requestBuilder,
                                                  HttpResponse.BodyHandler<T> bodyHandler) throws Exception {
        HttpResponse<T> response = httpClient.send(requestBuilder.apply(tokenProvider.accessToken()), bodyHandler);
        if (response.statusCode() == 401) {
            if (response.body() instanceof InputStream stream) closeQuietly(stream);
            tokenProvider.invalidateToken();
            return httpClient.send(requestBuilder.apply(tokenProvider.accessToken()), bodyHandler);
        }
        return response;
    }

    private static Map<String, String> boundedLruMap(int maxEntries) {
        return Collections.synchronizedMap(new LinkedHashMap<>(16, 0.75f, true) {
            @Override
            protected boolean removeEldestEntry(Map.Entry<String, String> eldest) {
                return size() > maxEntries;
            }
        });
    }

    private static void closeQuietly(InputStream stream) {
        if (stream == null) return;
        try {
            stream.close();
        } catch (IOException ignored) {
        }
    }

    private Optional<String> findFileIdByKeyHash(String keyHash) {
        try {
            String q = "appProperties has { key='vjuKeyHash' and value='" + keyHash + "' } and trashed=false";
            HttpResponse<String> response = sendWithAuthRetry(token -> HttpRequest.newBuilder()
                    .uri(URI.create(apiBaseUrl + "/drive/v3/files?q=" + enc(q)
                            + "&supportsAllDrives=true&includeItemsFromAllDrives=true&fields=files(id)&pageSize=1"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + token)
                    .GET()
                    .build(), HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new DocumentStorageException("Google Drive lookup failed with HTTP " + response.statusCode());
            }
            JsonNode files = JSON.readTree(response.body()).path("files");
            if (files.isArray() && !files.isEmpty()) {
                return Optional.of(files.get(0).path("id").asText());
            }
            return Optional.empty();
        } catch (DocumentStorageException e) {
            throw e;
        } catch (Exception e) {
            throw new DocumentStorageException("Could not look up file in Google Drive Vault", e);
        }
    }

    private static byte[] buildMultipartRelated(String boundary, byte[] metadataJson, InputStream content, String contentType)
            throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        out.write(("--" + boundary + "\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        out.write(metadataJson);
        out.write(("\r\n--" + boundary + "\r\nContent-Type: " + contentType + "\r\n\r\n").getBytes(StandardCharsets.UTF_8));
        content.transferTo(out);
        out.write(("\r\n--" + boundary + "--\r\n").getBytes(StandardCharsets.UTF_8));
        return out.toByteArray();
    }

    private static String parentFolderOf(String key) {
        int slash = key.lastIndexOf('/');
        return slash > 0 ? key.substring(0, slash) : "MISC";
    }

    private static String fileNameOf(String key) {
        int slash = key.lastIndexOf('/');
        return slash >= 0 ? key.substring(slash + 1) : key;
    }

    private static String sha256Hex(String input) {
        try {
            return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256")
                    .digest(input.getBytes(StandardCharsets.UTF_8)));
        } catch (Exception e) {
            throw new IllegalStateException(e);
        }
    }

    private static String truncate(String s, int max) {
        return s == null || s.length() <= max ? s : s.substring(0, max);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static String encPath(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8).replace("+", "%20");
    }
}
