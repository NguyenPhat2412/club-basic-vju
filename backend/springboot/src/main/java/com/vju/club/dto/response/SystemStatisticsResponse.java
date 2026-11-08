package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

public record SystemStatisticsResponse(
        long totalUsers,
        long activeUsers,
        long lockedUsers,
        long inactiveUsers,
        long anonymizedUsers,
        long totalClubs,
        long activeClubs,
        long inactiveClubs,
        List<RoleCountItem> roleBreakdown,
        OffsetDateTime generatedAt
) {
    public record RoleCountItem(
            String roleCode,
            String roleName,
            String scope,
            long activeAssignmentCount,
            long distinctUserCount
    ) {
    }
}
