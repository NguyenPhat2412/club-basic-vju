package com.vju.club.modules.setting.dto;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotNull;

public record UpdateSystemSettingsRequest(
        @NotNull @Min(0) @Max(100) Integer maxPendingApplications,
        @NotNull @Min(0) @Max(365) Integer reapplyCooldownDays,
        @NotNull @Min(0) @Max(100) Integer maxActiveClubs) {
}
