package com.vju.club.modules.membership.dto.response;

import com.fasterxml.jackson.annotation.JsonInclude;

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
) { }
