package com.vju.club.modules.role.config.response;

import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.role.entity.Role;

import java.util.List;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String code,
        String name,
        String description,
        String scope,
        boolean system,
        boolean active,
        List<String> permissionKeys
) {
    public static RoleResponse from(Role role) {
        return new RoleResponse(role.getId(), role.getCode(), role.getName(), role.getDescription(),
                role.getScope().name(), role.isSystem(), role.isActive(),
                role.getPermissions().stream().map(Permission::getPermissionKey).sorted().toList());
    }
}
