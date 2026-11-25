package com.vju.club.dto.request;

import jakarta.validation.constraints.Size;

public record LockEventAttendanceRequest(
        @Size(max = 16) String otpCode
) {
}
