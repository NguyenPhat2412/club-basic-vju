package com.vju.club.application.dto;

import com.vju.club.entity.ClubApplication;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubApplicationResponse(
        UUID id,
        UUID applicantId,
        UUID clubId,
        String clubCode,
        String clubName,
        String message,
        String status,
        UUID reviewedBy,
        OffsetDateTime reviewedAt,
        String reviewNote,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static ClubApplicationResponse from(ClubApplication application) {
        return new ClubApplicationResponse(
                application.getId(), application.getApplicant().getId(), application.getClub().getId(),
                application.getClub().getCode(), application.getClub().getName(), application.getMessage(),
                application.getStatus().name(), application.getReviewedBy() == null ? null : application.getReviewedBy().getId(),
                application.getReviewedAt(), application.getReviewNote(), application.getCancelledAt(),
                application.getCreatedAt(), application.getUpdatedAt());
    }
}
