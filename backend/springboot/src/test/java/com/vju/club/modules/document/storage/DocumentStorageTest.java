package com.vju.club.modules.document.storage;

import com.vju.club.config.StorageProperties;
import com.vju.club.modules.document.exception.DocumentStorageException;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;

import java.io.ByteArrayInputStream;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class DocumentStorageTest {
    @TempDir Path root;

    static StorageProperties.R2 r2Settings() {
        StorageProperties.R2 settings = new StorageProperties.R2();
        settings.setEndpoint("https://0123456789abcdef.r2.cloudflarestorage.com");
        settings.setBucket("club-basic-vju");
        settings.setAccessKeyId("test-access-key");
        settings.setSecretAccessKey("test-secret-key");
        return settings;
    }

    @Test
    void localStorageRoundTripsAndDeletes() throws Exception {
        LocalDocumentStorage storage = new LocalDocumentStorage(root);
        byte[] content = "%PDF-1.7".getBytes();
        storage.put("clubs/c/documents/a.pdf", new ByteArrayInputStream(content), content.length, "application/pdf");
        try (var object = storage.open("clubs/c/documents/a.pdf").content()) {
            assertThat(object.readAllBytes()).isEqualTo(content);
        }
        assertThat(storage.open("clubs/c/documents/a.pdf").size()).isEqualTo(content.length);
        storage.delete("clubs/c/documents/a.pdf");
        assertThat(Files.exists(root.resolve("clubs/c/documents/a.pdf"))).isFalse();
        storage.delete("clubs/c/documents/a.pdf");
        assertThat(storage.presignDownload("k", "a.pdf", "application/pdf", Duration.ofMinutes(5))).isEmpty();
    }

    @Test
    void localStorageReportsMissingFilesAsStorageErrors() {
        assertThatThrownBy(() -> new LocalDocumentStorage(root).open("clubs/none.pdf"))
                .isInstanceOf(DocumentStorageException.class)
                .extracting("code").isEqualTo("DOCUMENT_STORAGE_ERROR");
    }

    @Test
    void localStorageNeverWritesOutsideItsRoot() {
        LocalDocumentStorage storage = new LocalDocumentStorage(root.resolve("store"));
        for (String key : new String[]{"../escape.pdf", "clubs/../../escape.pdf", "/etc/passwd", ""}) {
            assertThatThrownBy(() -> storage.put(key, new ByteArrayInputStream(new byte[1]), 1, "text/plain"))
                    .as(key).isInstanceOf(IllegalArgumentException.class);
        }
        assertThat(Files.exists(root.resolve("escape.pdf"))).isFalse();
    }

    @Test
    void r2RequiresEveryCredentialAndNamesTheMissingOnes() {
        StorageProperties.R2 settings = r2Settings();
        settings.setSecretAccessKey(" ");
        settings.setBucket(null);
        assertThatThrownBy(() -> R2DocumentStorage.create(settings))
                .isInstanceOf(IllegalStateException.class)
                .hasMessageContaining("R2_BUCKET").hasMessageContaining("R2_SECRET_ACCESS_KEY")
                .hasMessageNotContaining("R2_ENDPOINT");
    }

    @Test
    void r2SignsShortLivedDownloadLinksOnTheS3Endpoint() {
        try (R2DocumentStorage storage = R2DocumentStorage.create(r2Settings())) {
            var url = storage.presignDownload("clubs/c/documents/a.pdf", "Biên bản.pdf", "application/pdf",
                    Duration.ofMinutes(5)).orElseThrow();
            assertThat(url.getHost()).isEqualTo("0123456789abcdef.r2.cloudflarestorage.com");
            assertThat(url.getPath()).isEqualTo("/club-basic-vju/clubs/c/documents/a.pdf");
            String query = URLDecoder.decode(url.getRawQuery(), StandardCharsets.UTF_8);
            assertThat(query).contains("X-Amz-Expires=300", "X-Amz-Signature=", "response-content-type=application/pdf",
                    "response-content-disposition=attachment");
            assertThat(query).doesNotContain("test-secret-key");
        }
    }
}
