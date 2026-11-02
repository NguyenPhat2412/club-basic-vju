package com.vju.club.dto.record;

import com.vju.club.enums.ClubApplicationStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubApplicationRecord(
        UUID id,
        UUID applicantId,
        UUID clubId,
        String clubCode,
        String clubName,
        String message,
        ClubApplicationStatus status,
        UUID reviewedBy,
        OffsetDateTime reviewedAt,
        String reviewNote,
        String internalNote,
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
