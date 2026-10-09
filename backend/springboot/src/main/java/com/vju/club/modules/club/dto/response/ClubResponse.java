package com.vju.club.modules.club.dto.response;

import com.vju.club.modules.club.entity.Club;

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
) {
    public static ClubResponse from(Club club) {
        return new ClubResponse(club.getId(), club.getCode(), club.getName(), club.getLogoUrl(),
                club.getCoverUrl(), club.getDescription(), club.getActivityField(), club.getContactEmail(),
                club.getStatus().name(), club.getCreatedAt(), club.getUpdatedAt());
    }
}
