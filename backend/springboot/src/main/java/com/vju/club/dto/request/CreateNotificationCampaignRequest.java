package com.vju.club.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.util.List;
import java.util.UUID;

public record CreateNotificationCampaignRequest(
        @NotBlank @Size(max = 160) String title,
        @NotBlank @Size(max = 2000) String message,
        @NotBlank @Size(max = 32) String audienceType,
        @Size(max = 100) List<UUID> clubIds,
        @Size(max = 32) String category,
        UUID documentId,
        Boolean sendEmail) {
}
