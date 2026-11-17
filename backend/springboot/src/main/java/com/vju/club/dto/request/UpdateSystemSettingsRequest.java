package com.vju.club.dto.request;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

public record UpdateSystemSettingsRequest(
        @NotNull @Min(0) @Max(100) Integer maxPendingApplications,
        @NotNull @Min(0) @Max(365) Integer reapplyCooldownDays,
        @NotNull @Min(0) @Max(100) Integer maxActiveClubs,
        @Min(0) @Max(720) Integer attendanceEditWindowHours,
        Boolean allowSelfRegistration,
        @Min(0) @Max(1440) Integer attendanceOpensBeforeMinutes,
        @Min(0) @Max(90) Integer eventTaskGraceDays,
        @Min(0) @Max(100) Integer chatSummariesPerHour,
        @Min(100) @Max(4000) Integer chatMaxMessageLength,
        @Min(1) @Max(20) Integer documentMaxFileMb,
        @Min(1) @Max(20) Integer clubImageMaxMb,
        @Min(1) @Max(20) Integer avatarMaxMb,
        @Min(1) @Max(60) Integer otpExpiryMinutes,
        @Min(1) @Max(30) Integer otpMaxSendCount,
        @Min(0) @Max(600) Integer otpResendCooldownSeconds,
        @Min(1) @Max(15) Integer otpMaxVerifyAttempts,
        @Size(max = 255) String smtpHost,
        @Min(1) @Max(65535) Integer smtpPort,
        @Size(max = 255) String smtpUsername,
        @Size(max = 500) String smtpPassword,
        Boolean clearSmtpPassword,
        @Email @Size(max = 320) String smtpFromEmail,
        @Size(max = 120) String smtpFromName,
        Boolean smtpStartTls) {

    public UpdateSystemSettingsRequest(
            Integer maxPendingApplications,
            Integer reapplyCooldownDays,
            Integer maxActiveClubs) {
        this(maxPendingApplications, reapplyCooldownDays, maxActiveClubs, null);
    }

    public UpdateSystemSettingsRequest(
            Integer maxPendingApplications,
            Integer reapplyCooldownDays,
            Integer maxActiveClubs,
            Integer attendanceEditWindowHours) {
        this(
                maxPendingApplications,
                reapplyCooldownDays,
                maxActiveClubs,
                attendanceEditWindowHours,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null);
    }
}
