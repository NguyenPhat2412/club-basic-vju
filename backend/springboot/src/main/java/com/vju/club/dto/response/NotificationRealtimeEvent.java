package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record NotificationRealtimeEvent(
        String type,
        UUID userId,
        NotificationResponse notification,
        long unreadCount,
        OffsetDateTime occurredAt
) {
}
