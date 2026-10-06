package com.vju.club.modules.permission.config.request;

import com.vju.club.modules.permission.entity.PermissionScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

/**
 * The complete set of permissions the user should hold directly at one scope target. Missing ones
 * are granted, extra ones revoked; an empty set revokes everything at that target.
 */
public record ReplacePermissionsRequest(
        @NotNull PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        @NotNull @Size(max = 200) Set<@NotBlank String> permissionKeys,
        @Size(max = 1000) String reason
) { }
