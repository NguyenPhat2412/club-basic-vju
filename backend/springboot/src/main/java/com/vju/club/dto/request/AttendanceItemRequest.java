package com.vju.club.dto.request;

import com.vju.club.enums.AttendanceStatus;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AttendanceItemRequest(
        @NotNull UUID userId,
        @NotNull AttendanceStatus status,
        @Size(max = 500) String note,
        Long expectedVersion
) {
    public AttendanceItemRequest(UUID userId, AttendanceStatus status, String note) {
        this(userId, status, note, null);
    }
}
