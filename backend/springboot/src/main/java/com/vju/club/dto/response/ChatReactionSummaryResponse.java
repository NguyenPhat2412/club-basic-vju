package com.vju.club.dto.response;

import java.util.List;
import java.util.UUID;

public record ChatReactionSummaryResponse(
        String emoji,
        int count,
        List<UUID> reactorIds,
        List<String> reactorNames
) {
}
