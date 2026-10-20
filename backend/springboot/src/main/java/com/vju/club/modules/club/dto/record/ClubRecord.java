package com.vju.club.modules.club.dto.record;

import com.vju.club.modules.club.enums.ClubStatus;

import java.time.OffsetDateTime;
import java.util.UUID;

public record ClubRecord(
        UUID id,
        String code,
        String name,
        String logoUrl,
        String coverUrl,
        String description,
        String activityField,
        String contactEmail,
        ClubStatus status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
