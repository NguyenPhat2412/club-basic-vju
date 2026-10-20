package com.vju.club.modules.event.dto.request;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotEmpty;

import java.util.List;

public record RecordAttendanceRequest(
        @NotEmpty List<@Valid AttendanceItemRequest> items
) {
}
