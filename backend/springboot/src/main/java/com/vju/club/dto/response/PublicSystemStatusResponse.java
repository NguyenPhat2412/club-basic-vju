package com.vju.club.dto.response;

import java.io.Serializable;
import java.time.OffsetDateTime;

public record PublicSystemStatusResponse(
        boolean maintenanceMode,
        String maintenanceMessage,
        boolean announcementEnabled,
        String announcementMessage,
        String announcementTone,
        OffsetDateTime announcementExpiresAt) implements Serializable {
}
