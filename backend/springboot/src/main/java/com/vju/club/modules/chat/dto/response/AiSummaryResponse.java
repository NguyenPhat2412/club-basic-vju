package com.vju.club.modules.chat.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record AiSummaryResponse(
        UUID id,
        UUID channelId,
        UUID requestedBy,
        int messageCount,
        String summary,
        List<String> decisions,
        List<String> suggestedTasks,
        List<String> suggestedEvents,
        String model,
        OffsetDateTime createdAt
) {
}
