package com.vju.club.modules.role.config.request;

import com.vju.club.modules.permission.entity.PermissionScope;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.UUID;

public record AssignRoleRequest(
        @NotNull UUID roleId,
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        @Size(max = 1000) String reason
) { }
