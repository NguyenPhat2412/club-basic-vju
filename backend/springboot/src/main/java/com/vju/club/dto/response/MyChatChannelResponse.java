package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MyChatChannelResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        String clubLogoUrl,
        UUID departmentId,
        String departmentName,
        UUID eventId,
        String eventTitle,
        String name,
        String channelType,
        long unreadCount,
        OffsetDateTime lastMessageAt,
        String lastMessagePreview,
        String lastSenderName,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
