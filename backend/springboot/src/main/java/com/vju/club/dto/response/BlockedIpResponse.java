package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record BlockedIpResponse(
        UUID id,
        String ipAddress,
        String reason,
        UUID blockedBy,
        String blockedByName,
        OffsetDateTime expiresAt,
        OffsetDateTime createdAt) {
}
