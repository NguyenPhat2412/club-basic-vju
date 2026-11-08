package com.vju.club.dto.response;

import java.time.OffsetDateTime;

public record TaskSummaryResponse(
        long total,
        long todoCount,
        long inProgressCount,
        long doneCount,
        long completedCount,
        long cancelledCount,
        long overdueCount,
        OffsetDateTime evaluatedAt
) {
}
