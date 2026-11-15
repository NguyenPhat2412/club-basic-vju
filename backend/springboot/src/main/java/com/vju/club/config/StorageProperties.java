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
    public enum Type { LOCAL, R2, GDRIVE }

    public enum GDriveAuthMode { SERVICE_ACCOUNT, OAUTH_REFRESH_TOKEN }

    private Type type = Type.LOCAL;
    private DataSize maxFileSize = DataSize.ofMegabytes(20);
    private Duration downloadUrlTtl = Duration.ofMinutes(5);
    private final Local local = new Local();
    private final R2 r2 = new R2();
    private final GDrive gdrive = new GDrive();

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

    @Getter
    @Setter
    public static class GDrive {
        private GDriveAuthMode authMode = GDriveAuthMode.SERVICE_ACCOUNT;
        private String rootFolderId;
        private String clientEmail;
        private String privateKey;
        private String clientId;
        private String clientSecret;
        private String refreshToken;
        private String tokenUri = "https://oauth2.googleapis.com/token";
        private String apiBaseUrl = "https://www.googleapis.com";
    }
}
