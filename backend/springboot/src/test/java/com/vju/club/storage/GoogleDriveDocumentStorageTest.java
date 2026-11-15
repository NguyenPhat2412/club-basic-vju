package com.vju.club.storage;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;
import com.vju.club.config.StorageProperties;
import com.vju.club.exception.DocumentStorageException;
import com.vju.club.storage.impl.GoogleDriveDocumentStorage;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.ByteArrayInputStream;
import java.io.IOException;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.Signature;
import java.time.Duration;
import java.util.Base64;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleDriveDocumentStorageTest {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final Pattern FOLDER_QUERY = Pattern.compile("name='([^']+)' and '([^']+)' in parents");
    private static final Pattern HASH_QUERY = Pattern.compile("key='vjuKeyHash' and value='([0-9a-f]+)'");

    private HttpServer server;
    private KeyPair rsaKeys;
    private String baseUrl;
    private final AtomicInteger tokenRequests = new AtomicInteger();
    private final ConcurrentHashMap<String, StoredDriveEntry> driveEntries = new ConcurrentHashMap<>();
    private volatile int forcedDriveErrorStatus = 0;

    record StoredDriveEntry(String id, String name, String mimeType, String parentId, String keyHash, byte[] content) { }

    @BeforeEach
    void setUp() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        rsaKeys = generator.generateKeyPair();

        server = HttpServer.create(new InetSocketAddress("127.0.0.1", 0), 0);
        server.createContext("/token", this::handleToken);
        server.createContext("/upload/drive/v3/files", this::handleMultipartUpload);
        server.createContext("/drive/v3/files", this::handleFiles);
        server.start();
        baseUrl = "http://127.0.0.1:" + server.getAddress().getPort();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    @Test
    void validatesRequiredCredentialsForServiceAccountAndRefreshToken() {
        StorageProperties.GDrive sa = new StorageProperties.GDrive();
        sa.setAuthMode(StorageProperties.GDriveAuthMode.SERVICE_ACCOUNT);
        assertThatThrownBy(() -> GoogleDriveDocumentStorage.create(sa))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GDRIVE_ROOT_FOLDER_ID")
                .hasMessageContaining("GDRIVE_CLIENT_EMAIL")
                .hasMessageContaining("GDRIVE_PRIVATE_KEY");

        StorageProperties.GDrive oauth = new StorageProperties.GDrive();
        oauth.setAuthMode(StorageProperties.GDriveAuthMode.OAUTH_REFRESH_TOKEN);
        oauth.setRootFolderId("vault-root");
        assertThatThrownBy(() -> GoogleDriveDocumentStorage.create(oauth))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("GDRIVE_CLIENT_ID")
                .hasMessageContaining("GDRIVE_CLIENT_SECRET")
                .hasMessageContaining("GDRIVE_REFRESH_TOKEN")
                .hasMessageNotContaining("GDRIVE_ROOT_FOLDER_ID");
    }

    @Test
    void serviceAccountJwtUploadsCreatesFolderHierarchyStreamsColdLookupAndDeletes() throws Exception {
        StorageProperties.GDrive settings = serviceAccountSettings();
        GoogleDriveDocumentStorage storage = GoogleDriveDocumentStorage.create(settings);

        byte[] pdfBytes = "%PDF-1.7 centralized vault".getBytes(StandardCharsets.UTF_8);
        String key = "clubs/vju-it/departments/dep-1/2026-11/doc-1.pdf";
        storage.put(key, new ByteArrayInputStream(pdfBytes), pdfBytes.length, "application/pdf", Map.of(
                "vaultFolder", "CLUBS/VJU-IT/DEPARTMENTS/dep-1",
                "displayName", "Kế hoạch hoạt động.pdf",
                "scope", "DEPARTMENT",
                "clubCode", "VJU-IT"
        ));

        assertThat(driveEntries.values())
                .extracting(StoredDriveEntry::name)
                .contains("CLUBS", "VJU-IT", "DEPARTMENTS", "dep-1", "Kế hoạch hoạt động.pdf");

        try (var stream = storage.open(key).content()) {
            assertThat(stream.readAllBytes()).isEqualTo(pdfBytes);
        }

        // Cold-start instance without in-memory cache resolves via vjuKeyHash appProperties
        GoogleDriveDocumentStorage coldInstance = GoogleDriveDocumentStorage.create(settings);
        var opened = coldInstance.open(key);
        assertThat(opened.size()).isEqualTo(pdfBytes.length);
        try (var stream = opened.content()) {
            assertThat(stream.readAllBytes()).isEqualTo(pdfBytes);
        }

        assertThat(coldInstance.presignDownload(key, "Kế hoạch.pdf", "application/pdf", Duration.ofMinutes(5)))
                .isEmpty();

        coldInstance.delete(key);
        assertThatThrownBy(() -> storage.open(key))
                .isInstanceOf(DocumentStorageException.class)
                .extracting("code").isEqualTo("DOCUMENT_STORAGE_ERROR");
    }

    @Test
    void oauthRefreshTokenModeExchangesRefreshTokenAndCachesAccessToken() throws Exception {
        StorageProperties.GDrive settings = new StorageProperties.GDrive();
        settings.setAuthMode(StorageProperties.GDriveAuthMode.OAUTH_REFRESH_TOKEN);
        settings.setRootFolderId("vault-root");
        settings.setClientId("vju-client-id");
        settings.setClientSecret("vju-client-secret");
        settings.setRefreshToken("vju-refresh-token");
        settings.setTokenUri(baseUrl + "/token");
        settings.setApiBaseUrl(baseUrl);

        GoogleDriveDocumentStorage storage = GoogleDriveDocumentStorage.create(settings);
        byte[] data = "system guideline".getBytes(StandardCharsets.UTF_8);
        storage.put("system/2026-11/guide.txt", new ByteArrayInputStream(data), data.length, "text/plain",
                Map.of("vaultFolder", "SYSTEM/2026-11", "displayName", "guide.txt", "scope", "SYSTEM"));
        try (var in = storage.open("system/2026-11/guide.txt").content()) {
            assertThat(in.readAllBytes()).isEqualTo(data);
        }
        assertThat(tokenRequests.get()).isEqualTo(1);
    }

    @Test
    void rejectsPathTraversalKeysAndPropagatesDriveFailuresAsStorageErrors() {
        GoogleDriveDocumentStorage storage = GoogleDriveDocumentStorage.create(serviceAccountSettings());
        for (String badKey : List.of("", "../secret.pdf", "clubs/../../etc/passwd", "/absolute.pdf")) {
            assertThatThrownBy(() -> storage.put(badKey, new ByteArrayInputStream(new byte[]{1}), 1, "application/pdf"))
                    .isInstanceOf(IllegalArgumentException.class);
        }

        forcedDriveErrorStatus = 502;
        assertThatThrownBy(() -> storage.put("system/fail.pdf", new ByteArrayInputStream(new byte[]{1}), 1, "application/pdf"))
                .isInstanceOf(DocumentStorageException.class)
                .extracting("code").isEqualTo("DOCUMENT_STORAGE_ERROR");
    }

    private StorageProperties.GDrive serviceAccountSettings() {
        String pem = "-----BEGIN PRIVATE KEY-----\\n"
                + Base64.getEncoder().encodeToString(rsaKeys.getPrivate().getEncoded())
                + "\\n-----END PRIVATE KEY-----";
        StorageProperties.GDrive settings = new StorageProperties.GDrive();
        settings.setAuthMode(StorageProperties.GDriveAuthMode.SERVICE_ACCOUNT);
        settings.setRootFolderId("vault-root");
        settings.setClientEmail("vault-bot@vju-clubhub.iam.gserviceaccount.com");
        settings.setPrivateKey(pem);
        settings.setTokenUri(baseUrl + "/token");
        settings.setApiBaseUrl(baseUrl);
        return settings;
    }

    private void handleToken(HttpExchange exchange) throws IOException {
        tokenRequests.incrementAndGet();
        String form = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);
        if (form.contains("jwt-bearer")) {
            String assertion = URLDecoder.decode(form.substring(form.indexOf("assertion=") + 10), StandardCharsets.UTF_8);
            String[] parts = assertion.split("\\.");
            try {
                Signature verifier = Signature.getInstance("SHA256withRSA");
                verifier.initVerify(rsaKeys.getPublic());
                verifier.update((parts[0] + "." + parts[1]).getBytes(StandardCharsets.US_ASCII));
                if (!verifier.verify(Base64.getUrlDecoder().decode(parts[2]))) {
                    respondJson(exchange, 401, Map.of("error", "invalid_signature"));
                    return;
                }
            } catch (Exception e) {
                respondJson(exchange, 400, Map.of("error", e.getMessage()));
                return;
            }
        } else if (!form.contains("refresh_token=vju-refresh-token")) {
            respondJson(exchange, 401, Map.of("error", "invalid_grant"));
            return;
        }
        respondJson(exchange, 200, Map.of("access_token", "mock-drive-token", "expires_in", 3600));
    }

    private void handleMultipartUpload(HttpExchange exchange) throws IOException {
        if (forcedDriveErrorStatus != 0) {
            respondJson(exchange, forcedDriveErrorStatus, Map.of("error", "upstream_failure"));
            return;
        }
        String contentType = exchange.getRequestHeaders().getFirst("Content-Type");
        String boundary = contentType.substring(contentType.indexOf("boundary=") + 9);
        String raw = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.ISO_8859_1);
        String[] parts = raw.split("--" + Pattern.quote(boundary));
        String metaPart = new String(parts[1].getBytes(StandardCharsets.ISO_8859_1), StandardCharsets.UTF_8);
        JsonNode meta = JSON.readTree(metaPart.substring(metaPart.indexOf("\r\n\r\n") + 4).trim());

        String mediaPart = parts[2];
        int mediaStart = mediaPart.indexOf("\r\n\r\n") + 4;
        int mediaEnd = mediaPart.endsWith("\r\n") ? mediaPart.length() - 2 : mediaPart.length();
        byte[] content = mediaPart.substring(mediaStart, mediaEnd).getBytes(StandardCharsets.ISO_8859_1);

        String id = "drv_" + UUID.randomUUID().toString().replace("-", "");
        StoredDriveEntry entry = new StoredDriveEntry(
                id,
                meta.path("name").asText(),
                "application/octet-stream",
                meta.path("parents").get(0).asText(),
                meta.path("appProperties").path("vjuKeyHash").asText(),
                content
        );
        driveEntries.put(id, entry);
        respondJson(exchange, 200, Map.of("id", id, "size", content.length));
    }

    private void handleFiles(HttpExchange exchange) throws IOException {
        if (forcedDriveErrorStatus != 0) {
            respondJson(exchange, forcedDriveErrorStatus, Map.of("error", "upstream_failure"));
            return;
        }
        String path = exchange.getRequestURI().getPath();
        String query = exchange.getRequestURI().getRawQuery();
        String method = exchange.getRequestMethod();

        if ("GET".equals(method) && path.equals("/drive/v3/files")) {
            String decodedQuery = URLDecoder.decode(query != null ? query : "", StandardCharsets.UTF_8);
            Matcher folderMatcher = FOLDER_QUERY.matcher(decodedQuery);
            if (folderMatcher.find()) {
                String name = folderMatcher.group(1);
                String parent = folderMatcher.group(2);
                List<Map<String, String>> found = driveEntries.values().stream()
                        .filter(e -> "application/vnd.google-apps.folder".equals(e.mimeType())
                                && name.equals(e.name()) && parent.equals(e.parentId()))
                        .map(e -> Map.of("id", e.id()))
                        .toList();
                respondJson(exchange, 200, Map.of("files", found));
                return;
            }
            Matcher hashMatcher = HASH_QUERY.matcher(decodedQuery);
            if (hashMatcher.find()) {
                String keyHash = hashMatcher.group(1);
                List<Map<String, String>> found = driveEntries.values().stream()
                        .filter(e -> keyHash.equals(e.keyHash()))
                        .map(e -> Map.of("id", e.id()))
                        .toList();
                respondJson(exchange, 200, Map.of("files", found));
                return;
            }
            respondJson(exchange, 200, Map.of("files", List.of()));
            return;
        }

        if ("POST".equals(method) && path.equals("/drive/v3/files")) {
            JsonNode body = JSON.readTree(exchange.getRequestBody());
            String id = "fld_" + UUID.randomUUID().toString().replace("-", "");
            driveEntries.put(id, new StoredDriveEntry(
                    id,
                    body.path("name").asText(),
                    body.path("mimeType").asText(),
                    body.path("parents").get(0).asText(),
                    null,
                    new byte[0]
            ));
            respondJson(exchange, 200, Map.of("id", id));
            return;
        }

        String fileId = path.substring("/drive/v3/files/".length());
        if ("DELETE".equals(method)) {
            driveEntries.remove(fileId);
            exchange.sendResponseHeaders(204, -1);
            exchange.close();
            return;
        }
        if ("GET".equals(method)) {
            StoredDriveEntry entry = driveEntries.get(fileId);
            if (entry == null) {
                respondJson(exchange, 404, Map.of("error", "not_found"));
                return;
            }
            exchange.getResponseHeaders().set("Content-Type", "application/octet-stream");
            exchange.sendResponseHeaders(200, entry.content().length);
            exchange.getResponseBody().write(entry.content());
            exchange.close();
        }
    }

    private static void respondJson(HttpExchange exchange, int status, Object payload) throws IOException {
        byte[] bytes = JSON.writeValueAsBytes(payload);
        exchange.getResponseHeaders().set("Content-Type", "application/json");
        exchange.sendResponseHeaders(status, bytes.length);
        exchange.getResponseBody().write(bytes);
        exchange.close();
    }
}
