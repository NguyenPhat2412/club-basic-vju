package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventRegistrationResponse(
        UUID id,
        UUID eventId,
        UUID userId,
        String userEmail,
        String userFullName,
        String studentCode,
        String userAvatarUrl,
        String participantType,
        String eventRole,
        String status,
        String note,
        OffsetDateTime registeredAt,
        OffsetDateTime cancelledAt,
        String submissionFileName,
        OffsetDateTime submissionUploadedAt,
        boolean needsShuttleBus
) {
    public EventRegistrationResponse(UUID id, UUID eventId, UUID userId, String userEmail, String userFullName,
                                     String studentCode, String participantType, String eventRole, String status,
                                     String note, OffsetDateTime registeredAt, OffsetDateTime cancelledAt,
                                     String submissionFileName, OffsetDateTime submissionUploadedAt) {
        this(id, eventId, userId, userEmail, userFullName, studentCode, null, participantType, eventRole, status,
                note, registeredAt, cancelledAt, submissionFileName, submissionUploadedAt, false);
    }
}
