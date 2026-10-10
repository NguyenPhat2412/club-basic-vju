package com.vju.club.modules.permission.dto.response;

import java.util.UUID;

public record EffectivePermissionResponse(
        String permissionKey,
        String scope,
        UUID clubId,
        UUID departmentId,
        String source,
        String roleCode
) { }
