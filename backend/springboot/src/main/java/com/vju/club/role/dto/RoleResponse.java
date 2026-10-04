package com.vju.club.role.dto;

import com.vju.club.entity.Permission;
import com.vju.club.entity.Role;

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
