package com.vju.club.dto.response;

import java.util.List;
import java.util.UUID;

public record EventFeedbackSummaryResponse(
        UUID eventId,
        long totalCount,
        double averageRating,
        List<EventFeedbackResponse> items,
        boolean canSubmit
) {
    public EventFeedbackSummaryResponse(
            UUID eventId,
            long totalCount,
            double averageRating,
            List<EventFeedbackResponse> items) {
        this(eventId, totalCount, averageRating, items, false);
    }
}
