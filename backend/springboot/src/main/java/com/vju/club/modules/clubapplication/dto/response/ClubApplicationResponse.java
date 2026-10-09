package com.vju.club.modules.clubapplication.dto.response;

import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.membership.entity.Membership;

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
        OffsetDateTime updatedAt,
        UUID membershipId,
        String membershipStatus,
        OffsetDateTime membershipJoinedAt
) {
    public static ClubApplicationResponse from(ClubApplication application) {
        return from(application, null);
    }

    public static ClubApplicationResponse from(ClubApplication application, Membership membership) {
        return new ClubApplicationResponse(
                application.getId(), application.getApplicant().getId(), application.getClub().getId(),
                application.getClub().getCode(), application.getClub().getName(), application.getMessage(),
                application.getStatus().name(), application.getReviewedBy() == null ? null : application.getReviewedBy().getId(),
                application.getReviewedAt(), application.getReviewNote(), application.getCancelledAt(),
                application.getCreatedAt(), application.getUpdatedAt(),
                membership == null ? null : membership.getId(),
                membership == null ? null : membership.getStatus().name(),
                membership == null ? null : membership.getJoinedAt());
    }
}
