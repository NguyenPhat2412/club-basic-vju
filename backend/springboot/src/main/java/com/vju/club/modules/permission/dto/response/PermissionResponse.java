package com.vju.club.modules.permission.dto.response;

import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String permissionKey,
        String module,
        String action,
        PermissionScope scope,
        String description,
        boolean active
) {
    public static PermissionResponse from(Permission permission) {
        return new PermissionResponse(
                permission.getId(), permission.getPermissionKey(), permission.getModule(),
                permission.getAction(), permission.getScope(), permission.getDescription(), permission.isActive());
    }
}
