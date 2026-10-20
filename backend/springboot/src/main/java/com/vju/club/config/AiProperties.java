package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.ai")
@Getter
@Setter
public class AiProperties {
    private String baseUrl = "https://router.anhchau.all1.vn/v1";
    private String apiKey = "";
    private String model = "apmarket";
}
