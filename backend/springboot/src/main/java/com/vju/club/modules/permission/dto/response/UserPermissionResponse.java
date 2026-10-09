package com.vju.club.modules.permission.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserPermissionResponse(
        UUID id,
        UUID userId,
        UUID permissionId,
        String permissionKey,
        String scope,
        UUID clubId,
        UUID departmentId,
        OffsetDateTime grantedAt,
        OffsetDateTime revokedAt
) { }
