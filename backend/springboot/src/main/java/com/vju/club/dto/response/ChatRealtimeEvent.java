package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ChatRealtimeEvent(
        String type,
        UUID clubId,
        UUID channelId,
        UUID actorId,
        String actorName,
        ChatMessageResponse message,
        ChatChannelResponse channel,
        List<UUID> recipientUserIds,
        OffsetDateTime occurredAt
) {
}
