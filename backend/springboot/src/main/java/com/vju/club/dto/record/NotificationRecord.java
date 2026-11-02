package com.vju.club.dto.record;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationRecord(
        UUID id,
        UUID userId,
        String title,
        String message,
        boolean read,
        String referenceType,
        UUID referenceId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
