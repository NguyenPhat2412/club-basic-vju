package com.vju.club.dto.response;

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
        String editReason,
        UUID checkedBy,
        OffsetDateTime checkedAt,
        long version
) {
}
