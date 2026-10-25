package com.vju.club.modules.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubResponse(
        UUID id,
        String code,
        String name,
        String logoUrl,
        String coverUrl,
        String description,
        String activityField,
        String contactEmail,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
