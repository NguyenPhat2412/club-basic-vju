package com.vju.club.storage.impl;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.config.StorageProperties;
import com.vju.club.exception.DocumentStorageException;

import java.net.URI;
import java.net.URLEncoder;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.nio.charset.StandardCharsets;
import java.security.KeyFactory;
import java.security.PrivateKey;
import java.security.Signature;
import java.security.spec.PKCS8EncodedKeySpec;
import java.time.Duration;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Map;

public class GoogleDriveTokenProvider {
    private static final ObjectMapper JSON = new ObjectMapper();
    private static final String DRIVE_SCOPE = "https://www.googleapis.com/auth/drive";

    private final StorageProperties.GDrive settings;
    private final HttpClient httpClient;
    private final PrivateKey serviceAccountKey;
    private volatile CachedToken cached;

    public GoogleDriveTokenProvider(StorageProperties.GDrive settings, HttpClient httpClient) {
        validate(settings);
        this.settings = settings;
        this.httpClient = httpClient;
        this.serviceAccountKey = settings.getAuthMode() == StorageProperties.GDriveAuthMode.SERVICE_ACCOUNT
                ? parsePrivateKey(settings.getPrivateKey())
                : null;
    }

    public String accessToken() {
        CachedToken current = cached;
        Instant now = Instant.now();
        if (current != null && current.expiresAt().isAfter(now.plusSeconds(60))) {
            return current.token();
        }
        synchronized (this) {
            if (cached != null && cached.expiresAt().isAfter(Instant.now().plusSeconds(60))) {
                return cached.token();
            }
            cached = fetchNewToken();
            return cached.token();
        }
    }

    public synchronized void invalidateToken() {
        this.cached = null;
    }

    private CachedToken fetchNewToken() {
        try {
            String form = settings.getAuthMode() == StorageProperties.GDriveAuthMode.SERVICE_ACCOUNT
                    ? "grant_type=" + enc("urn:ietf:params:oauth:grant-type:jwt-bearer") + "&assertion=" + enc(buildJwtAssertion())
                    : "grant_type=refresh_token&client_id=" + enc(settings.getClientId().strip())
                      + "&client_secret=" + enc(settings.getClientSecret().strip())
                      + "&refresh_token=" + enc(settings.getRefreshToken().strip());

            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(settings.getTokenUri().strip()))
                    .timeout(Duration.ofSeconds(15))
                    .header("Content-Type", "application/x-www-form-urlencoded")
                    .POST(HttpRequest.BodyPublishers.ofString(form))
                    .build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() < 200 || response.statusCode() >= 300) {
                throw new DocumentStorageException("Google OAuth2 token exchange failed with status " + response.statusCode());
            }
            JsonNode body = JSON.readTree(response.body());
            String token = body.path("access_token").asText("");
            long expiresIn = body.path("expires_in").asLong(3600);
            if (token.isBlank()) {
                throw new DocumentStorageException("Google OAuth2 response contained no access_token");
            }
            return new CachedToken(token, Instant.now().plusSeconds(Math.max(1, expiresIn)));
        } catch (DocumentStorageException e) {
            throw e;
        } catch (Exception e) {
            throw new DocumentStorageException("Could not obtain Google Drive access token", e);
        }
    }

    private String buildJwtAssertion() throws Exception {
        long iat = Instant.now().getEpochSecond();
        String header = base64Url(JSON.writeValueAsBytes(Map.of("alg", "RS256", "typ", "JWT")));
        String claims = base64Url(JSON.writeValueAsBytes(Map.of(
                "iss", settings.getClientEmail().strip(),
                "scope", DRIVE_SCOPE,
                "aud", settings.getTokenUri().strip(),
                "iat", iat,
                "exp", iat + 3600
        )));
        String signingInput = header + "." + claims;
        Signature signer = Signature.getInstance("SHA256withRSA");
        signer.initSign(serviceAccountKey);
        signer.update(signingInput.getBytes(StandardCharsets.US_ASCII));
        return signingInput + "." + base64Url(signer.sign());
    }

    static void validate(StorageProperties.GDrive settings) {
        List<String> missing = new ArrayList<>();
        if (isBlank(settings.getRootFolderId())) missing.add("GDRIVE_ROOT_FOLDER_ID");
        if (settings.getAuthMode() == StorageProperties.GDriveAuthMode.OAUTH_REFRESH_TOKEN) {
            if (isBlank(settings.getClientId())) missing.add("GDRIVE_CLIENT_ID");
            if (isBlank(settings.getClientSecret())) missing.add("GDRIVE_CLIENT_SECRET");
            if (isBlank(settings.getRefreshToken())) missing.add("GDRIVE_REFRESH_TOKEN");
        } else {
            if (isBlank(settings.getClientEmail())) missing.add("GDRIVE_CLIENT_EMAIL");
            if (isBlank(settings.getPrivateKey())) missing.add("GDRIVE_PRIVATE_KEY");
        }
        if (!missing.isEmpty()) {
            throw new IllegalStateException("app.storage.type=gdrive needs " + String.join(", ", missing));
        }
    }

    private static PrivateKey parsePrivateKey(String pem) {
        try {
            String normalized = pem.replace("\\n", "\n")
                    .replace("-----BEGIN PRIVATE KEY-----", "")
                    .replace("-----END PRIVATE KEY-----", "")
                    .replaceAll("\\s+", "");
            byte[] der = Base64.getDecoder().decode(normalized);
            return KeyFactory.getInstance("RSA").generatePrivate(new PKCS8EncodedKeySpec(der));
        } catch (Exception e) {
            throw new IllegalStateException("Invalid PKCS#8 RSA private key for Google Drive Service Account", e);
        }
    }

    private static String base64Url(byte[] bytes) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String enc(String value) {
        return URLEncoder.encode(value, StandardCharsets.UTF_8);
    }

    private static boolean isBlank(String value) {
        return value == null || value.isBlank();
    }

    private record CachedToken(String token, Instant expiresAt) { }
}
