package com.vju.club.dto.response;

import java.util.List;
import java.util.UUID;

public record ClubPositionSlotResponse(
        UUID roleId,
        String roleCode,
        String roleName,
        String scope,
        UUID departmentId,
        String departmentName,
        String departmentStatus,
        int maxHolders,
        List<ClubPositionHolderResponse> holders
) { }
