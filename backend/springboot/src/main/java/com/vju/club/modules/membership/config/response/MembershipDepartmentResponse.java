package com.vju.club.modules.membership.config.response;

import com.vju.club.modules.departmentmember.entity.DepartmentMember;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipDepartmentResponse(UUID id, String name, OffsetDateTime joinedAt) {
    public static MembershipDepartmentResponse from(DepartmentMember assignment) {
        return new MembershipDepartmentResponse(assignment.getDepartment().getId(),
                assignment.getDepartment().getName(), assignment.getJoinedAt());
    }
}
