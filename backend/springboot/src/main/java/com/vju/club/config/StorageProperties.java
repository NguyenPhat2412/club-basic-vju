package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.util.unit.DataSize;

import java.nio.file.Path;
import java.time.Duration;

@ConfigurationProperties(prefix = "app.storage")
@Getter
@Setter
public class StorageProperties {
    public enum Type { LOCAL, R2 }

    private Type type = Type.LOCAL;
    private DataSize maxFileSize = DataSize.ofMegabytes(20);
    private Duration downloadUrlTtl = Duration.ofMinutes(5);
    private final Local local = new Local();
    private final R2 r2 = new R2();

    @Getter
    @Setter
    public static class Local {
        private Path root = Path.of("data", "documents");
    }

    @Getter
    @Setter
    public static class R2 {
        private String endpoint;
        private String bucket;
        private String accessKeyId;
        private String secretAccessKey;
    }
}
