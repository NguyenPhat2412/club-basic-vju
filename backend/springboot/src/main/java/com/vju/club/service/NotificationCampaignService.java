package com.vju.club.service;

import com.vju.club.dto.request.CreateNotificationCampaignRequest;
import com.vju.club.dto.response.NotificationAudiencePreviewResponse;
import com.vju.club.dto.response.NotificationCampaignRemindResponse;
import com.vju.club.dto.response.NotificationCampaignResponse;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface NotificationCampaignService {
    PageResponse<NotificationCampaignResponse> listCampaigns(Actor actor, int offset, int limit);

    NotificationAudiencePreviewResponse previewAudience(Actor actor, String audienceType, List<UUID> clubIds);

    NotificationCampaignResponse createAndSend(Actor actor, CreateNotificationCampaignRequest request);

    NotificationCampaignRemindResponse remindUnread(Actor actor, UUID campaignId);
}
