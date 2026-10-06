package com.vju.club.modules.membership.config.response;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.vju.club.modules.membership.entity.Membership;

import java.time.OffsetDateTime;
import java.util.UUID;
import java.util.List;

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
        OffsetDateTime updatedAt,
        List<MembershipDepartmentResponse> departments
) {
    public static MyMembershipResponse from(Membership membership) {
        return from(membership, List.of());
    }

    public static MyMembershipResponse from(Membership membership, List<MembershipDepartmentResponse> departments) {
        return new MyMembershipResponse(membership.getId(), membership.getClub().getId(),
                membership.getClub().getCode(), membership.getClub().getName(), membership.getStatus().name(),
                membership.getJoinedAt(), membership.getLeftAt(), membership.getCreatedAt(), membership.getUpdatedAt(),
                List.copyOf(departments));
    }
}
