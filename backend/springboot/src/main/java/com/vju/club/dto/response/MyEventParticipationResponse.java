package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MyEventParticipationResponse(
        UUID registrationId,
        UUID eventId,
        UUID clubId,
        String clubCode,
        String clubName,
        String eventTitle,
        String eventType,
        String eventStatus,
        String location,
        OffsetDateTime startTime,
        OffsetDateTime endTime,
        OffsetDateTime registrationDeadline,
        String participantType,
        String eventRole,
        String registrationStatus,
        OffsetDateTime registeredAt,
        OffsetDateTime cancelledAt,
        String attendanceStatus,
        String attendanceNote,
        String attendanceEditReason,
        OffsetDateTime checkedAt,
        boolean countedAsAttended
) {
}
