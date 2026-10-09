package com.vju.club.modules.role.dto.request;

import com.vju.club.modules.permission.enums.PermissionScope;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotEmpty;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

public record CreateRoleRequest(
        @NotBlank @Size(max = 64) @Pattern(regexp = "[A-Za-z][A-Za-z0-9_]*") String code,
        @NotBlank @Size(max = 200) String name,
        @Size(max = 2000) String description,
        @NotNull PermissionScope scope,
        @NotEmpty Set<@NotNull UUID> permissionIds
) { }
