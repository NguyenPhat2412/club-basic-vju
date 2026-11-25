package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventFeedbackResponse(
        UUID id,
        UUID eventId,
        UUID userId,
        String userFullName,
        int rating,
        String comment,
        OffsetDateTime createdAt
) { }
