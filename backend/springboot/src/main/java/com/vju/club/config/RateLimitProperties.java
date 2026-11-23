package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.time.Duration;

@ConfigurationProperties(prefix = "app.rate-limit")
@Getter
@Setter
public class RateLimitProperties {
    private boolean enabled = true;
    private int maxRequests = 15;
    private Duration window = Duration.ofMinutes(1);
    private int writeMaxRequests = 60;
    private Duration writeWindow = Duration.ofMinutes(1);
    private int chatUploadMaxRequests = 15;
    private Duration chatUploadWindow = Duration.ofMinutes(5);
}
