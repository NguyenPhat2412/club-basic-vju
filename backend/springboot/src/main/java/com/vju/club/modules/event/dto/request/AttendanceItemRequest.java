package com.vju.club.modules.event.dto.request;

import com.vju.club.modules.event.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AttendanceItemRequest(
        @NotNull UUID userId,
        @NotNull AttendanceStatus status,
        @Size(max = 500) String note
) {
}
