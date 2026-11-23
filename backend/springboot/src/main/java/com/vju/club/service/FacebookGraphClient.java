package com.vju.club.service;

import java.time.OffsetDateTime;
import java.util.List;

public interface FacebookGraphClient {
    record FbPageProfile(
            String pageId,
            String pageName,
            String pageLink,
            String avatarUrl,
            int followersCount,
            int fanCount
    ) {
    }

    record FbManagedPage(
            String pageId,
            String pageName,
            String pageLink,
            String avatarUrl,
            int followersCount,
            int fanCount,
            String accessToken,
            List<String> tasks
    ) {
    }

    record FbPostRecord(
            String fbPostId,
            String message,
            String permalinkUrl,
            String imageUrl,
            OffsetDateTime publishedAt,
            int reactionsCount,
            int commentsCount,
            int sharesCount
    ) {
    }

    FbPageProfile fetchPageProfile(String pageAccessToken);

    List<FbPostRecord> fetchPagePosts(String pageId, String pageAccessToken, int limit);

    String exchangeOAuthCodeForUserToken(String code, String redirectUri);

    String exchangeForLongLivedUserToken(String shortLivedUserToken);

    List<FbManagedPage> fetchManagedPages(String userAccessToken);
}
