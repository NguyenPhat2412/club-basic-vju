package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SystemSettingsResponse(
        int maxPendingApplications,
        int reapplyCooldownDays,
        int maxActiveClubs,
        OffsetDateTime updatedAt,
        UUID updatedBy) {
}
