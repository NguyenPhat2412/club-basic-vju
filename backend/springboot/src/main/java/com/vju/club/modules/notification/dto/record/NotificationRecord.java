package com.vju.club.modules.notification.dto.record;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationRecord(
        UUID id,
        UUID userId,
        String title,
        String message,
        boolean read,
        UUID referenceId,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
