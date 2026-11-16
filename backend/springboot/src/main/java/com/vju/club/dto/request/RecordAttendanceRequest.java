package com.vju.club.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RecordAttendanceRequest(
        @NotEmpty @Size(max = 1000) List<@NotNull @Valid AttendanceItemRequest> items,
        @Size(max = 500) String reason
) {
    public RecordAttendanceRequest(List<AttendanceItemRequest> items) {
        this(items, null);
    }
}
