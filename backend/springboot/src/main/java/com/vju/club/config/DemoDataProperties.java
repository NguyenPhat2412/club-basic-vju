package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.demo-data")
@Getter
@Setter
public class DemoDataProperties {
    private boolean enabled = true;
    private String password;
}
