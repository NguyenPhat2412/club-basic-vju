package com.vju.club.controller;

import com.vju.club.annotation.PublicEndpoint;
import com.vju.club.common.ApiPaths;
import com.vju.club.dto.request.ClubFacebookConnectTokenRequest;
import com.vju.club.dto.request.ClubFacebookOAuthSelectRequest;
import com.vju.club.dto.response.ClubFacebookOAuthPageOptionResponse;
import com.vju.club.dto.response.ClubFacebookOAuthStartResponse;
import com.vju.club.dto.response.ClubFacebookOverviewResponse;
import com.vju.club.dto.response.ClubFacebookPublicFeedResponse;
import com.vju.club.security.Actor;
import com.vju.club.service.ClubFacebookService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

import java.net.URI;
import java.util.List;
import java.util.UUID;

@RestController
@RequestMapping(ApiPaths.API_V1)
@RequiredArgsConstructor
public class ClubFacebookController {
    private final ClubFacebookService facebookService;

    @GetMapping(ApiPaths.CLUB_FACEBOOK)
    public ClubFacebookOverviewResponse getOverview(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam(defaultValue = "20") @Min(1) @Max(50) int limit) {
        return facebookService.getOverview(actor, clubId, limit);
    }

    @PostMapping(ApiPaths.CLUB_FACEBOOK_CONNECT_TOKEN)
    @ResponseStatus(HttpStatus.CREATED)
    public ClubFacebookOverviewResponse connectWithToken(
            Actor actor,
            @PathVariable UUID clubId,
            @Valid @RequestBody ClubFacebookConnectTokenRequest request) {
        return facebookService.connectWithToken(actor, clubId, request.accessToken());
    }

    @PutMapping(ApiPaths.CLUB_FACEBOOK_SYNC)
    public ClubFacebookOverviewResponse syncNow(Actor actor, @PathVariable UUID clubId) {
        return facebookService.syncNow(actor, clubId);
    }

    @DeleteMapping(ApiPaths.CLUB_FACEBOOK)
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void disconnect(Actor actor, @PathVariable UUID clubId) {
        facebookService.disconnect(actor, clubId);
    }

    @GetMapping(ApiPaths.CLUB_FACEBOOK_OAUTH_START)
    public ClubFacebookOAuthStartResponse startOAuth(Actor actor, @PathVariable UUID clubId) {
        return facebookService.startOAuth(actor, clubId);
    }

    @PublicEndpoint(reason = "Facebook OAuth 2.0 callback verified by signed single-use state")
    @GetMapping(ApiPaths.FACEBOOK_OAUTH_CALLBACK)
    public ResponseEntity<Void> oauthCallback(
            @RequestParam(required = false) @Size(max = 2000) String code,
            @RequestParam(required = false) @Size(max = 200) String state,
            @RequestParam(required = false) @Size(max = 200) String error,
            @RequestParam(name = "error_description", required = false) @Size(max = 500) String errorDescription) {
        String target = facebookService.handleOAuthCallback(code, state, error, errorDescription);
        return ResponseEntity.status(HttpStatus.FOUND)
                .header(HttpHeaders.LOCATION, URI.create(target).toString())
                .build();
    }

    @GetMapping(ApiPaths.CLUB_FACEBOOK_OAUTH_PAGES)
    public List<ClubFacebookOAuthPageOptionResponse> listPendingOAuthPages(
            Actor actor,
            @PathVariable UUID clubId,
            @RequestParam @NotBlank @Size(max = 200) String selectionToken) {
        return facebookService.listPendingOAuthPages(actor, clubId, selectionToken);
    }

    @PostMapping(ApiPaths.CLUB_FACEBOOK_OAUTH_SELECT)
    @ResponseStatus(HttpStatus.CREATED)
    public ClubFacebookOverviewResponse selectOAuthPage(
            Actor actor,
            @PathVariable UUID clubId,
            @Valid @RequestBody ClubFacebookOAuthSelectRequest request) {
        return facebookService.selectOAuthPage(actor, clubId, request.selectionToken(), request.pageId());
    }

    @PublicEndpoint(reason = "Public cached club Facebook Fanpage posts read from PostgreSQL")
    @GetMapping(ApiPaths.PUBLIC_CLUB_FACEBOOK_POSTS)
    public ClubFacebookPublicFeedResponse getPublicFeed(
            @PathVariable UUID clubId,
            @RequestParam(defaultValue = "6") @Min(1) @Max(20) int limit) {
        return facebookService.getPublicFeed(clubId, limit);
    }
}
