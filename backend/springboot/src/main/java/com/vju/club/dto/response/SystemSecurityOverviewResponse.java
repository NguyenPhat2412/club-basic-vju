package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record SystemSecurityOverviewResponse(
        int windowHours,
        int onlineUserCount,
        int activeConnectionCount,
        long loginSuccessCount,
        long loginFailedCount,
        long rateLimitBlockedCount,
        long sensitiveChangeCount,
        List<OnlineUserItem> onlineUsers,
        List<SuspiciousIpItem> suspiciousIps,
        List<SecurityEventItem> recentEvents) {

    public record OnlineUserItem(
            UUID userId,
            String fullName,
            String email,
            String ipAddress,
            String userAgent,
            int connections,
            OffsetDateTime connectedAt) {
    }

    public record SuspiciousIpItem(
            String ipAddress,
            long failedLoginCount,
            long rateLimitBlockedCount,
            List<String> targetEmails,
            OffsetDateTime lastSeenAt,
            String latestUserAgent) {
    }

    public record SecurityEventItem(
            UUID id,
            OffsetDateTime createdAt,
            String action,
            String resourceType,
            UUID actorUserId,
            String actorName,
            String actorEmail,
            String ipAddress,
            String userAgent,
            String summary) {
    }
}
