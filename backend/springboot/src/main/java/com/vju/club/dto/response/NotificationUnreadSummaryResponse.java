package com.vju.club.dto.response;

import java.util.UUID;

public record NotificationUnreadSummaryResponse(
        long unreadNotifications,
        long unreadChatMessages,
        UUID latestUnreadClubId,
        UUID latestUnreadChannelId
) {
}
