package com.vju.club.modules.clubapplication.dto.record;

import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;

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
        OffsetDateTime cancelledAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
