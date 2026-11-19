package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.UUID;

public record EventAttendanceQrTokenResponse(
        UUID eventId,
        String eventTitle,
        String token,
        OffsetDateTime expiresAt,
        int ttlSeconds
) {
}
