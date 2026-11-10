package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record SystemSettingsResponse(
        int maxPendingApplications,
        int reapplyCooldownDays,
        int maxActiveClubs,
        int attendanceEditWindowHours,
        boolean allowSelfRegistration,
        int attendanceOpensBeforeMinutes,
        int eventTaskGraceDays,
        int chatSummariesPerHour,
        int chatMaxMessageLength,
        int documentMaxFileMb,
        int clubImageMaxMb,
        int avatarMaxMb,
        OffsetDateTime updatedAt,
        UUID updatedBy) {
}
