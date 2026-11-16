package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationResponse(
        UUID id,
        String title,
        String message,
        boolean read,
        String referenceType,
        UUID referenceId,
        UUID clubId,
        OffsetDateTime createdAt
) {
    public NotificationResponse(UUID id, String title, String message, boolean read,
                                String referenceType, UUID referenceId, OffsetDateTime createdAt) {
        this(id, title, message, read, referenceType, referenceId, null, createdAt);
    }

    public NotificationResponse(UUID id, String title, String message, boolean read,
                                UUID referenceId, OffsetDateTime createdAt) {
        this(id, title, message, read, null, referenceId, null, createdAt);
    }

    public static NotificationResponse withClub(NotificationResponse n, UUID resolvedClubId) {
        return new NotificationResponse(
                n.id(), n.title(), n.message(), n.read(),
                n.referenceType(), n.referenceId(), resolvedClubId, n.createdAt()
        );
    }
}
