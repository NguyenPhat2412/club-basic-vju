package com.vju.club.permission.dto;

import com.vju.club.entity.PermissionScope;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record GrantPermissionRequest(
        @NotNull UUID permissionId,
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        String reason
) { }
