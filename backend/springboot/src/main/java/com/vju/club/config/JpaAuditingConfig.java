package com.vju.club.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;

import java.util.Optional;
import java.util.UUID;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "currentUserAuditor")
public class JpaAuditingConfig {
    @Bean
    AuditorAware<UUID> currentUserAuditor() {
        return () -> Optional.ofNullable(SecurityContextHolder.getContext().getAuthentication())
                .filter(JwtAuthenticationToken.class::isInstance)
                .map(authentication -> ((JwtAuthenticationToken) authentication).getToken().getSubject())
                .flatMap(JpaAuditingConfig::parseUuid);
    }

    private static Optional<UUID> parseUuid(String subject) {
        try {
            return Optional.of(UUID.fromString(subject));
        } catch (IllegalArgumentException exception) {
            return Optional.empty();
        }
    }
}
