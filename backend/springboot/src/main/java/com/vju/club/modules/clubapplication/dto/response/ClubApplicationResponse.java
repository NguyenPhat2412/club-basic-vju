package com.vju.club.modules.clubapplication.dto.response;

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
) { }
