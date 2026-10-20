package com.vju.club.modules.event.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventAttendanceResponse(
        UUID id,
        UUID eventId,
        UUID userId,
        String userEmail,
        String userFullName,
        String studentCode,
        String status,
        String note,
        UUID checkedBy,
        OffsetDateTime checkedAt
) {
}
