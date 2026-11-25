package com.vju.club.dto.response;

import com.vju.club.dto.record.ClubOverviewConfig;

import java.io.Serializable;
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
        ClubOverviewConfig overviewConfig,
        String status,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt,
        String facebookUrl
) implements Serializable {
    public ClubResponse(UUID id, String code, String name, String logoUrl, String coverUrl,
                        String description, String activityField, String contactEmail,
                        ClubOverviewConfig overviewConfig, String status,
                        OffsetDateTime createdAt, OffsetDateTime updatedAt) {
        this(id, code, name, logoUrl, coverUrl, description, activityField, contactEmail,
                overviewConfig, status, createdAt, updatedAt, null);
    }
}
