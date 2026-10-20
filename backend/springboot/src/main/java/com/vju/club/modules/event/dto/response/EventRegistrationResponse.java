package com.vju.club.modules.event.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventRegistrationResponse(
        UUID id,
        UUID eventId,
        UUID userId,
        String userEmail,
        String userFullName,
        String studentCode,
        String participantType,
        String status,
        String note,
        OffsetDateTime registeredAt,
        OffsetDateTime cancelledAt
) {
}
