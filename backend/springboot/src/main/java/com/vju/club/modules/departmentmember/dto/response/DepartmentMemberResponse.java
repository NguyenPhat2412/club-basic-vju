package com.vju.club.modules.departmentmember.dto.response;

import com.vju.club.modules.departmentmember.entity.DepartmentMember;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DepartmentMemberResponse(UUID id, UUID departmentId, UUID membershipId, UUID userId, OffsetDateTime joinedAt) {
    public static DepartmentMemberResponse from(DepartmentMember member) {
        return new DepartmentMemberResponse(member.getId(), member.getDepartment().getId(),
                member.getMembership().getId(), member.getMembership().getUser().getId(), member.getJoinedAt());
    }
}
