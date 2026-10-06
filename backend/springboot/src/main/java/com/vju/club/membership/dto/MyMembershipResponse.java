package com.vju.club.membership.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vju.club.entity.Membership;

import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record MyMembershipResponse(
        UUID id,
        UUID clubId,
        String clubCode,
        String clubName,
        String status,
        OffsetDateTime joinedAt,
        OffsetDateTime leftAt,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) {
    public static MyMembershipResponse from(Membership membership) {
        return new MyMembershipResponse(membership.getId(), membership.getClub().getId(),
                membership.getClub().getCode(), membership.getClub().getName(), membership.getStatus().name(),
                membership.getJoinedAt(), membership.getLeftAt(), membership.getCreatedAt(), membership.getUpdatedAt());
    }
}
