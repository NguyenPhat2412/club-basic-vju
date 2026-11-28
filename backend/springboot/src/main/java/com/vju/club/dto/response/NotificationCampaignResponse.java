package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record NotificationCampaignResponse(
        UUID id,
        String title,
        String message,
        String audienceType,
        List<UUID> targetClubIds,
        String category,
        UUID documentId,
        String documentTitle,
        boolean sendEmail,
        int totalRecipients,
        int deliveredCount,
        long readCount,
        int emailQueuedCount,
        String status,
        UUID createdBy,
        String createdByName,
        OffsetDateTime createdAt) {
}
