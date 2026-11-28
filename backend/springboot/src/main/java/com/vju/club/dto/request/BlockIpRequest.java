package com.vju.club.dto.request;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record BlockIpRequest(
        @NotBlank @Size(max = 64) String ipAddress,
        @Size(max = 300) String reason,
        @Min(0) @Max(8760) Integer durationHours) {
}
