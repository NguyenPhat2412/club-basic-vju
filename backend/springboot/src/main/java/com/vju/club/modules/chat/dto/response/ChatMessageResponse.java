package com.vju.club.modules.chat.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ChatMessageResponse(
        UUID id,
        UUID channelId,
        UUID senderId,
        String senderFullName,
        String senderType,
        String content,
        OffsetDateTime createdAt
) {
}
