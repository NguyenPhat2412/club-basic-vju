package com.vju.club.dto.response;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

public record ClubFacebookOverviewResponse(
        UUID clubId,
        boolean connected,
        boolean oauthConfigured,
        PageInfo page,
        EngagementSummary summary,
        List<FacebookPostItem> posts
) {
    public record PageInfo(
            String pageId,
            String pageName,
            String pageLink,
            String avatarUrl,
            int followersCount,
            int fanCount,
            OffsetDateTime connectedAt,
            OffsetDateTime lastSyncedAt,
            String lastSyncError
    ) {
    }

    public record EngagementSummary(
            int followersCount,
            int fanCount,
            int postsCount,
            long totalReactions,
            long totalComments,
            long totalShares,
            double avgEngagementPerPost
    ) {
    }

    public record FacebookPostItem(
            UUID id,
            String fbPostId,
            String message,
            String permalinkUrl,
            String imageUrl,
            OffsetDateTime publishedAt,
            int reactionsCount,
            int commentsCount,
            int sharesCount,
            OffsetDateTime syncedAt
    ) {
    }
}
