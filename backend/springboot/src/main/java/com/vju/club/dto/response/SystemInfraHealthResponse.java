package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;

public record SystemInfraHealthResponse(
        OffsetDateTime checkedAt,
        List<ServiceStatusItem> services,
        StorageSummary storage) {

    public record ServiceStatusItem(
            String key,
            String name,
            String status,
            Long latencyMs,
            String detail) {
    }

    public record StorageSummary(
            String storageMode,
            long documentBytes,
            long chatMediaBytes,
            long totalBytes,
            long clubCount,
            long totalUsers,
            long activeUsers) {
    }
}
