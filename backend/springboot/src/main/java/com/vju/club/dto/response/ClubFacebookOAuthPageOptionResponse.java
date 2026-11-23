package com.vju.club.dto.response;

import java.util.List;

public record ClubFacebookOAuthPageOptionResponse(
        String pageId,
        String pageName,
        String pageLink,
        String avatarUrl,
        int followersCount,
        int fanCount,
        List<String> tasks
) {
}
