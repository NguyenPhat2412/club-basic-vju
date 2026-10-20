package com.vju.club.modules.event.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record CalendarItemResponse(
        UUID id,
        String itemType,
        UUID clubId,
        String clubName,
        UUID departmentId,
        String title,
        String status,
        String location,
        OffsetDateTime startTime,
        OffsetDateTime endTime
) {
}
