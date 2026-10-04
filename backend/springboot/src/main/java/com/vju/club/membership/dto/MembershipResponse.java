package com.vju.club.membership.dto;

import com.vju.club.entity.Membership;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipResponse(
        UUID id, UUID userId, UUID clubId, String status,
        OffsetDateTime joinedAt, OffsetDateTime leftAt, OffsetDateTime createdAt, OffsetDateTime updatedAt) {
    public static MembershipResponse from(Membership membership) {
        return new MembershipResponse(membership.getId(), membership.getUser().getId(), membership.getClub().getId(),
                membership.getStatus().name(), membership.getJoinedAt(), membership.getLeftAt(),
                membership.getCreatedAt(), membership.getUpdatedAt());
    }
}
