package com.vju.club.dto.response;

import com.vju.club.enums.PermissionScope;

import java.util.UUID;

public record PermissionResponse(
        UUID id,
        String permissionKey,
        String module,
        String action,
        PermissionScope scope,
        String description,
        boolean active
) { }
