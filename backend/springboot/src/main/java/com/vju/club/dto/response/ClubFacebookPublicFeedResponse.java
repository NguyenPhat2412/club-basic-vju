package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClubFacebookPublicFeedResponse(
        UUID clubId,
        boolean connected,
        String pageName,
        String pageLink,
        String avatarUrl,
        int followersCount,
        OffsetDateTime lastSyncedAt,
        List<ClubFacebookOverviewResponse.FacebookPostItem> posts
) {
}
