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
        int otpExpiryMinutes,
        int otpMaxSendCount,
        int otpResendCooldownSeconds,
        int otpMaxVerifyAttempts,
        String smtpHost,
        int smtpPort,
        String smtpUsername,
        boolean smtpPasswordConfigured,
        String smtpFromEmail,
        String smtpFromName,
        boolean smtpStartTls,
        OffsetDateTime updatedAt,
        UUID updatedBy) {
}
