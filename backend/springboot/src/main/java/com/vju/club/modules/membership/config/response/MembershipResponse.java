package com.vju.club.modules.membership.config.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vju.club.modules.membership.entity.Membership;

import java.time.OffsetDateTime;
import java.util.UUID;

@JsonInclude(JsonInclude.Include.ALWAYS)
public record MembershipResponse(
        UUID id, UUID userId, UUID clubId, String status,
        OffsetDateTime joinedAt, OffsetDateTime leftAt, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    public static MembershipResponse from(Membership membership) {
        return new MembershipResponse(membership.getId(), membership.getUser().getId(), membership.getClub().getId(),
                membership.getStatus().name(), membership.getJoinedAt(), membership.getLeftAt(),
                membership.getCreatedAt(), membership.getUpdatedAt());
    }
}
