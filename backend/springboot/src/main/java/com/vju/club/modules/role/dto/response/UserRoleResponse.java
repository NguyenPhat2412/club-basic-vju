package com.vju.club.modules.role.dto.response;

import com.vju.club.modules.role.entity.UserRole;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserRoleResponse(
        UUID id,
        UUID userId,
        UUID roleId,
        String roleCode,
        String roleName,
        String scope,
        UUID clubId,
        UUID departmentId,
        OffsetDateTime grantedAt
) {
    public static UserRoleResponse from(UserRole assignment) {
        return new UserRoleResponse(assignment.getId(), assignment.getUser().getId(), assignment.getRole().getId(),
                assignment.getRole().getCode(), assignment.getRole().getName(), assignment.getScope().name(),
                assignment.getClub() == null ? null : assignment.getClub().getId(),
                assignment.getDepartment() == null ? null : assignment.getDepartment().getId(),
                assignment.getGrantedAt());
    }
}
