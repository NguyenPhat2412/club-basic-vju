package com.vju.club.role.dto;

import com.vju.club.entity.PermissionScope;
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
