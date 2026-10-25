package com.vju.club.config;

import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.nio.file.Path;
import java.time.Duration;

@ConfigurationProperties(prefix = "app.storage")
public class StorageProperties {
    public enum Type { LOCAL, R2 }

    private Type type = Type.LOCAL;
    private DataSize maxFileSize = DataSize.ofMegabytes(20);
    private Duration downloadUrlTtl = Duration.ofMinutes(5);
    private final Local local = new Local();
    private final R2 r2 = new R2();

    public Type getType() { return type; }
    public void setType(Type type) { this.type = type; }
    public DataSize getMaxFileSize() { return maxFileSize; }
    public void setMaxFileSize(DataSize maxFileSize) { this.maxFileSize = maxFileSize; }
    public Duration getDownloadUrlTtl() { return downloadUrlTtl; }
    public void setDownloadUrlTtl(Duration downloadUrlTtl) { this.downloadUrlTtl = downloadUrlTtl; }
    public Local getLocal() { return local; }
    public R2 getR2() { return r2; }

    public static class Local {
        private Path root = Path.of("data", "documents");

        public Path getRoot() { return root; }
        public void setRoot(Path root) { this.root = root; }
    }

    public static class R2 {
        private String endpoint;
        private String bucket;
        private String accessKeyId;
        private String secretAccessKey;

        public String getEndpoint() { return endpoint; }
        public void setEndpoint(String endpoint) { this.endpoint = endpoint; }
        public String getBucket() { return bucket; }
        public void setBucket(String bucket) { this.bucket = bucket; }
        public String getAccessKeyId() { return accessKeyId; }
        public void setAccessKeyId(String accessKeyId) { this.accessKeyId = accessKeyId; }
        public String getSecretAccessKey() { return secretAccessKey; }
        public void setSecretAccessKey(String secretAccessKey) { this.secretAccessKey = secretAccessKey; }
    }
}
