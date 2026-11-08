package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SystemSettingsResponse(
        int maxPendingApplications,
        int reapplyCooldownDays,
        int maxActiveClubs,
        int attendanceEditWindowHours,
        OffsetDateTime updatedAt,
        UUID updatedBy) {
}
