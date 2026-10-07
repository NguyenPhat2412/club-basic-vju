package com.vju.club.modules.permission.config.request;

import com.vju.club.modules.permission.entity.PermissionScope;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record GrantPermissionRequest(
        @NotNull UUID permissionId,
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        String reason
) { }
