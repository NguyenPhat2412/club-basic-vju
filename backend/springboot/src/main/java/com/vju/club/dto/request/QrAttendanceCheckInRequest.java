package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public record QrAttendanceCheckInRequest(
        @NotBlank @Size(max = 512) String token
) {
}
