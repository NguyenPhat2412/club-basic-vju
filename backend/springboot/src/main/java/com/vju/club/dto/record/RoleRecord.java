package com.vju.club.dto.record;

import com.vju.club.enums.PermissionScope;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record RoleRecord(
        UUID id,
        String code,
        String name,
        String description,
        PermissionScope scope,
        boolean system,
        boolean active,
        List<String> permissionKeys,
        OffsetDateTime createdAt,
        OffsetDateTime updatedAt
) { }
