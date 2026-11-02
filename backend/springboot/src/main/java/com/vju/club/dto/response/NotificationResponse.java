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
        OffsetDateTime createdAt
) {
    public NotificationResponse(UUID id, String title, String message, boolean read, UUID referenceId, OffsetDateTime createdAt) {
        this(id, title, message, read, null, referenceId, createdAt);
    }
}
