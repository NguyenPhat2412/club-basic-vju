package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@Getter
@Setter
@ConfigurationProperties(prefix = "app.telegram")
public class TelegramProperties {
    private boolean enabled = false;
    private String botToken = "";
    private String chatId = "";
    private String threadId = "";
    private String apiBaseUrl = "https://api.telegram.org";
}
