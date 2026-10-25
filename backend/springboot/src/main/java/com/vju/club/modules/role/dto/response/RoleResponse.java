package com.vju.club.modules.role.dto.response;

import java.util.List;
import java.util.UUID;

public record RoleResponse(
        UUID id,
        String code,
        String name,
        String description,
        String scope,
        boolean system,
        boolean active,
        List<String> permissionKeys
) { }
