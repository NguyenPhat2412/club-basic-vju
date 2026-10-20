package com.vju.club.modules.notification.dto.response;

import java.util.UUID;

public record NotificationBroadcastResponse(
        UUID clubId,
        UUID departmentId,
        int recipientCount
) {
}
