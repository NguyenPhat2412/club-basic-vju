package com.vju.club.dto.request;

import com.vju.club.enums.PermissionScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

public record ReplacePermissionsRequest(
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        @NotNull @Size(max = 200) Set<@NotBlank String> permissionKeys,
        @Size(max = 1000) String reason
) { }
