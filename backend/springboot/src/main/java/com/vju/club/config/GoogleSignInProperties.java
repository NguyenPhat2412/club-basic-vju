package com.vju.club.config;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;

import java.util.List;
import java.util.Locale;

@ConfigurationProperties(prefix = "app.auth.google")
@Getter
@Setter
public class GoogleSignInProperties {
    private String clientId = "";
    private List<String> allowedDomains = List.of("st.vju.ac.vn");
    private String jwkSetUri = "https://www.googleapis.com/oauth2/v3/certs";
    private boolean createAccounts = true;

    public boolean isEnabled() {
        return clientId != null && !clientId.isBlank();
    }

    public boolean isGoogleEmail(String email) {
        if (!isEnabled() || email == null) return false;
        int at = email.lastIndexOf('@');
        if (at < 0) return false;
        String domain = email.substring(at + 1).trim().toLowerCase(Locale.ROOT);
        return allowedDomains.stream().anyMatch(allowed -> allowed.trim().toLowerCase(Locale.ROOT).equals(domain));
    }
}
