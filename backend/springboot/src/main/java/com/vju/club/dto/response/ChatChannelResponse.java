package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatChannelResponse(
        UUID id,
        UUID clubId,
        UUID departmentId,
        String departmentName,
        UUID eventId,
        String eventTitle,
        String name,
        String channelType,
        long unreadCount,
        OffsetDateTime lastMessageAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public ChatChannelResponse withActivity(long unreadCount, OffsetDateTime lastMessageAt) {
        return new ChatChannelResponse(
                id, clubId, departmentId, departmentName, eventId, eventTitle,
                name, channelType, unreadCount, lastMessageAt, createdAt, updatedAt
        );
    }
}
