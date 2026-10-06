package com.vju.club.membership.dto;

import com.vju.club.entity.DepartmentMember;

import java.time.OffsetDateTime;
import java.util.UUID;

public record MembershipDepartmentResponse(UUID id, String name, OffsetDateTime joinedAt) {
    public static MembershipDepartmentResponse from(DepartmentMember assignment) {
        return new MembershipDepartmentResponse(assignment.getDepartment().getId(),
                assignment.getDepartment().getName(), assignment.getJoinedAt());
    }
}
