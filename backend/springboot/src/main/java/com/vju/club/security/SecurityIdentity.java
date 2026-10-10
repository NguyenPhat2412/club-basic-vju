package com.vju.club.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.UUID;

public final class SecurityIdentity {
    private SecurityIdentity() { }

    public static UUID userId(Authentication authentication) {
        if (!(authentication instanceof JwtAuthenticationToken jwt)) {
            throw new IllegalStateException("JWT authentication is required");
        }
        return UUID.fromString(jwt.getToken().getSubject());
    }
}
