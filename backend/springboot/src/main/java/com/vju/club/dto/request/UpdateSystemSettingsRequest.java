package com.vju.club.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

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
        @Min(1) @Max(20) Integer avatarMaxMb) {

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
        this(maxPendingApplications, reapplyCooldownDays, maxActiveClubs, attendanceEditWindowHours, null, null, null, null, null, null, null, null);
    }
}
