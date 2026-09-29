package com.vju.club.permission.dto;

import com.vju.club.entity.UserPermission;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserPermissionResponse(
        UUID id,
        UUID userId,
        UUID permissionId,
        String permissionKey,
        String scope,
        UUID clubId,
        UUID departmentId,
        OffsetDateTime grantedAt,
        OffsetDateTime revokedAt
) {
    public static UserPermissionResponse from(UserPermission grant) {
        return new UserPermissionResponse(
                grant.getId(), grant.getUser().getId(), grant.getPermission().getId(),
                grant.getPermission().getPermissionKey(), grant.getScope().name(),
                grant.getClub() == null ? null : grant.getClub().getId(),
                grant.getDepartment() == null ? null : grant.getDepartment().getId(),
                grant.getGrantedAt(), grant.getRevokedAt());
    }
}
