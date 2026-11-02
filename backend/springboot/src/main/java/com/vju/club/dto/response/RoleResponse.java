package com.vju.club.dto.response;

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
        boolean locked,
        Integer maxHolders,
        List<String> permissionKeys
) { }
