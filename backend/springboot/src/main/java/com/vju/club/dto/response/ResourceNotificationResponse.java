package com.vju.club.dto.response;

import java.util.UUID;

public record ResourceNotificationResponse(
        String referenceType,
        UUID referenceId,
        UUID clubId,
        int recipientCount
) {
}
