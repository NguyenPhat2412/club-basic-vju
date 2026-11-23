package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.stereotype.Component;

@Component
@ConfigurationProperties(prefix = "app.facebook")
@Getter
@Setter
public class FacebookProperties {
    private String appId = "";
    private String appSecret = "";
    private String graphVersion = "v22.0";
    private String graphBaseUrl = "https://graph.facebook.com";
    private String tokenEncryptionKey = "vju-clubhub-local-fb-aes256-key-2026";
    private String oauthRedirectUri = "http://localhost:8080/api/v1/integrations/facebook/oauth/callback";
    private String frontendBaseUrl = "http://localhost:3000";

    public boolean isOauthConfigured() {
        return appId != null && !appId.isBlank() && appSecret != null && !appSecret.isBlank();
    }
}
