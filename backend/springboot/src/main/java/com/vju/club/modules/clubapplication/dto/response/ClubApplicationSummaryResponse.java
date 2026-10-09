package com.vju.club.modules.clubapplication.dto.response;

import com.vju.club.modules.clubapplication.entity.ClubApplication;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubApplicationSummaryResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime reviewedAt,
        OffsetDateTime cancelledAt
) {
    public static ClubApplicationSummaryResponse from(ClubApplication application) {
        return new ClubApplicationSummaryResponse(
                application.getId(), application.getClub().getId(), application.getClub().getCode(),
                application.getClub().getName(), application.getStatus().name(), application.getCreatedAt(),
                application.getReviewedAt(), application.getCancelledAt());
    }
}
