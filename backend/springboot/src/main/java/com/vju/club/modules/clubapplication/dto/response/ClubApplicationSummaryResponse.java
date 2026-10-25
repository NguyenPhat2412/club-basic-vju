package com.vju.club.modules.clubapplication.dto.response;

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
) { }
