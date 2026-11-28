package com.vju.club.dto.response;

import java.util.UUID;

public record NotificationCampaignRemindResponse(
        UUID campaignId,
        int remindedCount) {
}
