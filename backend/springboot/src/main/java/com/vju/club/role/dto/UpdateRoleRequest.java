package com.vju.club.role.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;

import java.util.Set;
import java.util.UUID;

/** Partial update; a provided permission set replaces the current one. */
public record UpdateRoleRequest(
        @Size(max = 200) String name,
        @Size(max = 2000) String description,
        Boolean active,
        @Size(min = 1) Set<@NotNull UUID> permissionIds
) { }
