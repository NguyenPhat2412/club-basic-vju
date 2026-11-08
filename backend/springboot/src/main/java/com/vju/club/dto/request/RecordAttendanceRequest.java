package com.vju.club.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.Size;

import java.util.List;

public record RecordAttendanceRequest(
        @NotEmpty List<@Valid AttendanceItemRequest> items,
        @Size(max = 500) String reason
) {
    public RecordAttendanceRequest(List<AttendanceItemRequest> items) {
        this(items, null);
    }
}
