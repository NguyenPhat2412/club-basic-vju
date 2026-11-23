package com.vju.club.service;

import com.vju.club.dto.response.ClubFacebookOAuthPageOptionResponse;
import com.vju.club.dto.response.ClubFacebookOAuthStartResponse;
import com.vju.club.dto.response.ClubFacebookOverviewResponse;
import com.vju.club.dto.response.ClubFacebookPublicFeedResponse;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface ClubFacebookService {
    ClubFacebookOverviewResponse getOverview(Actor actor, UUID clubId, int postLimit);

    ClubFacebookOverviewResponse connectWithToken(Actor actor, UUID clubId, String accessToken);

    ClubFacebookOverviewResponse syncNow(Actor actor, UUID clubId);

    void disconnect(Actor actor, UUID clubId);

    ClubFacebookOAuthStartResponse startOAuth(Actor actor, UUID clubId);

    String handleOAuthCallback(String code, String state, String error, String errorDescription);

    List<ClubFacebookOAuthPageOptionResponse> listPendingOAuthPages(Actor actor, UUID clubId, String selectionToken);

    ClubFacebookOverviewResponse selectOAuthPage(Actor actor, UUID clubId, String selectionToken, String pageId);

    ClubFacebookPublicFeedResponse getPublicFeed(UUID clubId, int limit);
}
