package com.vju.club.security;

import org.springframework.security.core.Authentication;

import java.util.Optional;
import java.util.UUID;

public final class SecurityIdentity {
    private SecurityIdentity() { }

    public static UUID userId(Authentication authentication) {
        return currentUserId(authentication)
                .orElseThrow(() -> new IllegalStateException("A signed-in session is required"));
    }

    public static Optional<UUID> currentUserId(Authentication authentication) {
        if (authentication != null && authentication.getPrincipal() instanceof ClubPrincipal principal) {
            return Optional.of(principal.id());
        }
        return Optional.empty();
    }
}
