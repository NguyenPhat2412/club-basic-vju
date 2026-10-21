package com.vju.club.modules.chat.dto.record;

import com.vju.club.modules.chat.enums.ChatChannelType;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatChannelRecord(
        UUID id,
        UUID clubId,
        UUID departmentId,
        UUID eventId,
        String name,
        ChatChannelType channelType,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
