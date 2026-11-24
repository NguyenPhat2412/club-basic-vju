package com.vju.club.service.impl;

import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.ClubFacebookPage;
import com.vju.club.repository.ClubFacebookPageRepository;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Periodically refreshes connected Facebook Fanpages so new posts, engagement counts,
 * and signed fbcdn image URLs stay fresh without manual intervention.
 * Runs on the dedicated multi-threaded {@code vjuTaskScheduler} pool.
 */
@Component
@Slf4j
@RequiredArgsConstructor
public class ClubFacebookSyncScheduler {
    public static final int MAX_CONSECUTIVE_FAILURES = 3;
    private static final long PACE_DELAY_MS = 1_000L;

    private final ClubFacebookPageRepository pageRepository;
    private final ClubFacebookServiceImpl facebookService;
    private final SystemSettingsService settingsService;

    @Scheduled(fixedDelayString = "${app.facebook.auto-sync-poll-ms:300000}")
    public void scheduledSync() {
        syncDuePages(true);
    }

    public int syncDuePages(boolean applyPacingDelay) {
        SystemSettingsResponse settings;
        try {
            settings = settingsService.current();
        } catch (RuntimeException e) {
            log.debug("Skipping Facebook auto-sync because system_settings could not be read: {}", e.getMessage());
            return 0;
        }
        if (settings == null || !settings.facebookAutoSyncEnabled()) {
            return 0;
        }

        int intervalMinutes = Math.max(15, settings.facebookAutoSyncIntervalMinutes());
        OffsetDateTime cutoff = OffsetDateTime.now().minusMinutes(intervalMinutes);
        List<ClubFacebookPage> eligible = pageRepository.findEligibleForAutoSync(MAX_CONSECUTIVE_FAILURES);
        int synced = 0;

        for (ClubFacebookPage page : eligible) {
            if (page.getLastSyncedAt() != null && !page.getLastSyncedAt().isBefore(cutoff)) {
                continue;
            }
            if (synced > 0 && applyPacingDelay) {
                try {
                    Thread.sleep(PACE_DELAY_MS);
                } catch (InterruptedException ie) {
                    Thread.currentThread().interrupt();
                    break;
                }
            }
            try {
                if (facebookService.runAutoSyncForClub(page.getClub().getId())) {
                    synced++;
                }
            } catch (RuntimeException e) {
                log.warn("Unexpected error auto-syncing Facebook page for club {}: {}",
                        page.getClub().getId(), e.getMessage());
            }
        }
        if (synced > 0) {
            log.info("Facebook auto-sync refreshed {} club page(s) (interval={}m)", synced, intervalMinutes);
        }
        return synced;
    }
}
