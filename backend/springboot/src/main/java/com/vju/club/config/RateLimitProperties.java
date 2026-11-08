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
    private int maxRequests = 60;
    private Duration window = Duration.ofMinutes(1);
}
