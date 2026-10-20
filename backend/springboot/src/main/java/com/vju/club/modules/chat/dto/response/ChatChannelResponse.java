package com.vju.club.modules.chat.dto.response;

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
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
}
