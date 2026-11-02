package com.vju.club.dto.request;

import jakarta.validation.constraints.Size;
import com.vju.club.enums.PermissionScope;
import jakarta.validation.constraints.NotNull;

import java.util.UUID;

public record GrantPermissionRequest(
        @NotNull UUID permissionId,
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        @Size(max = 1000) String reason
) { }
