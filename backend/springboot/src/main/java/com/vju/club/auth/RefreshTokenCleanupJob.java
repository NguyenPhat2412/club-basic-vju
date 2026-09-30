package com.vju.club.auth;

import com.vju.club.repository.RefreshTokenRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Duration;
import java.time.OffsetDateTime;

/** Deletes refresh tokens that can never be used again, so the table does not grow forever. */
@Component
public class RefreshTokenCleanupJob {

    private static final Logger log = LoggerFactory.getLogger(RefreshTokenCleanupJob.class);

    private final RefreshTokenRepository refreshTokenRepository;
    private final Clock clock;
    private final Duration retention;

    public RefreshTokenCleanupJob(RefreshTokenRepository refreshTokenRepository, Clock clock,
                                  @Value("${app.security.refresh-token-cleanup.retention:7d}") Duration retention) {
        this.refreshTokenRepository = refreshTokenRepository;
        this.clock = clock;
        this.retention = retention;
    }

    /** Keeps dead tokens for {@code retention} (useful when investigating a session), then drops them. */
    @Scheduled(cron = "${app.security.refresh-token-cleanup.cron:0 30 3 * * *}")
    @Transactional
    public int purge() {
        int deleted = refreshTokenRepository.deleteDeadBefore(OffsetDateTime.now(clock).minus(retention));
        if (deleted > 0) {
            log.info("Deleted {} expired or revoked refresh tokens", deleted);
        }
        return deleted;
    }
}
