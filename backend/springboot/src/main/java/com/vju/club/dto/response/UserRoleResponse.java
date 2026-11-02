package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record UserRoleResponse(
        UUID id,
        UUID userId,
        UUID roleId,
        String roleCode,
        String roleName,
        String scope,
        UUID clubId,
        UUID departmentId,
        OffsetDateTime grantedAt
) { }
