package com.vju.club.dto.record;

import com.vju.club.enums.PermissionScope;

import java.time.OffsetDateTime;
import java.util.UUID;

public record PermissionGrantRecord(
        UUID id,
        UUID userId,
        UUID permissionId,
        String permissionKey,
        PermissionScope scope,
        UUID clubId,
        UUID departmentId,
        UUID grantedBy,
        OffsetDateTime grantedAt,
        OffsetDateTime revokedAt
) { }
