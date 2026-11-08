package com.vju.club.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateSystemSettingsRequest(
        @NotNull @Min(0) @Max(100) Integer maxPendingApplications,
        @NotNull @Min(0) @Max(365) Integer reapplyCooldownDays,
        @NotNull @Min(0) @Max(100) Integer maxActiveClubs,
        @Min(0) @Max(720) Integer attendanceEditWindowHours) {

    public UpdateSystemSettingsRequest(
            Integer maxPendingApplications,
            Integer reapplyCooldownDays,
            Integer maxActiveClubs) {
        this(maxPendingApplications, reapplyCooldownDays, maxActiveClubs, null);
    }
}
