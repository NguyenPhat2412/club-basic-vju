package com.vju.club.modules.permission.dto.response;

import com.vju.club.modules.permission.repository.UserPermissionRepository;

import com.vju.club.modules.permission.repository.UserPermissionRepository.EffectivePermissionRow;

import java.util.UUID;

/** One thing the user may do and where; {@code source} is DIRECT or ROLE (then {@code roleCode} is set). */
public record EffectivePermissionResponse(
        String permissionKey,
        String scope,
        UUID clubId,
        UUID departmentId,
        String source,
        String roleCode
) {
    public static EffectivePermissionResponse from(EffectivePermissionRow row) {
        return new EffectivePermissionResponse(row.getPermissionKey(), row.getScope(), row.getClubId(),
                row.getDepartmentId(), row.getSource(), row.getRoleCode());
    }
}
