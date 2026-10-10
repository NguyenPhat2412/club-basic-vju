package com.vju.club.config;

import com.vju.club.security.SecurityIdentity;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.repository.config.EnableJpaAuditing;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.UUID;

@Configuration
@EnableJpaAuditing(auditorAwareRef = "currentUserAuditor")
public class JpaAuditingConfig {
    @Bean
    AuditorAware<UUID> currentUserAuditor() {
        return () -> SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication());
    }
}
