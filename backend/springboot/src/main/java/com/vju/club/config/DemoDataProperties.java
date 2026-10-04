package com.vju.club.config;

import org.springframework.boot.context.properties.ConfigurationProperties;

/** Demo data for the local profile; seeding is skipped unless a password is provided. */
@ConfigurationProperties(prefix = "app.demo-data")
public class DemoDataProperties {
    private boolean enabled = true;
    private String password;

    public boolean isEnabled() { return enabled; }
    public void setEnabled(boolean enabled) { this.enabled = enabled; }
    public String getPassword() { return password; }
    public void setPassword(String password) { this.password = password; }
}
