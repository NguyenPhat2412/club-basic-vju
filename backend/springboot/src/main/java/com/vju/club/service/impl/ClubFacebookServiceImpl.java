package com.vju.club.service.impl;

import com.vju.club.config.FacebookProperties;
import com.vju.club.dto.response.ClubFacebookOAuthPageOptionResponse;
import com.vju.club.dto.response.ClubFacebookOAuthStartResponse;
import com.vju.club.dto.response.ClubFacebookOverviewResponse;
import com.vju.club.dto.response.ClubFacebookPublicFeedResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubFacebookPage;
import com.vju.club.entity.ClubFacebookPost;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.ClubStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubFacebookPageRepository;
import com.vju.club.repository.ClubFacebookPostRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.TokenCryptoService;
import com.vju.club.service.AuditService;
import com.vju.club.service.ClubFacebookService;
import com.vju.club.service.FacebookGraphClient;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.security.SecureRandom;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
public class ClubFacebookServiceImpl implements ClubFacebookService {
    private static final int DEFAULT_SYNC_POST_LIMIT = 25;
    private static final long OAUTH_TTL_SECONDS = 600L;
    private static final String OAUTH_SCOPE = "pages_show_list,pages_read_engagement";

    private final ClubRepository clubRepository;
    private final ClubFacebookPageRepository pageRepository;
    private final ClubFacebookPostRepository postRepository;
    private final FacebookGraphClient graphClient;
    private final TokenCryptoService tokenCryptoService;
    private final FacebookProperties properties;
    private final PermissionAuthorizationService authorizationService;
    private final AuditService auditService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.vju.club.service.SystemSettingsService settingsService;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.vju.club.config.RuntimeIntegrationConfig runtimeIntegrationConfig;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private org.springframework.transaction.support.TransactionTemplate transactionTemplate;

    @org.springframework.beans.factory.annotation.Autowired(required = false)
    private com.vju.club.service.NotificationService notificationService;

    private final java.util.Set<UUID> inFlightSyncClubs = ConcurrentHashMap.newKeySet();

    private com.vju.club.config.RuntimeIntegrationConfig.EffectiveFacebook effectiveFacebook() {
        if (runtimeIntegrationConfig != null) {
            return runtimeIntegrationConfig.facebook();
        }
        return new com.vju.club.config.RuntimeIntegrationConfig.EffectiveFacebook(
                properties.getAppId(),
                properties.getAppSecret(),
                properties.getGraphVersion(),
                properties.getGraphBaseUrl(),
                properties.getOauthRedirectUri(),
                properties.getFrontendBaseUrl());
    }

    private static final int DEFAULT_FACEBOOK_SYNC_COOLDOWN_MINUTES = 2;

    private final SecureRandom random = new SecureRandom();
    private final Map<String, PendingOAuthState> pendingStates = new ConcurrentHashMap<>();
    private final Map<String, PendingPageSelection> pendingSelections = new ConcurrentHashMap<>();

    private record PendingOAuthState(UUID actorId, UUID clubId, Instant expiresAt) {
    }

    private record PendingPageSelection(
            UUID actorId,
            UUID clubId,
            List<FacebookGraphClient.FbManagedPage> pages,
            Instant expiresAt
    ) {
    }

    @Override
    @Transactional(readOnly = true)
    public ClubFacebookOverviewResponse getOverview(Actor actor, UUID clubId, int postLimit) {
        requireViewAccess(actor, clubId);
        Club club = requireClub(clubId);
        return buildOverviewResponse(club.getId(), postLimit);
    }

    @Override
    @Transactional
    public ClubFacebookOverviewResponse connectWithToken(Actor actor, UUID clubId, String accessToken) {
        requireManageAccess(actor, clubId);
        Club club = requireClub(clubId);
        String cleanToken = accessToken == null ? "" : accessToken.trim();
        if (cleanToken.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_INVALID_TOKEN",
                    "Page Access Token không được để trống.");
        }

        FacebookGraphClient.FbPageProfile profile;
        try {
            profile = graphClient.fetchPageProfile(cleanToken);
        } catch (ApiException e) {
            if (e.getMessage() != null && e.getMessage().contains("node type (User)")) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_USER_TOKEN_NOT_PAGE",
                        "Bạn đang dán User Access Token. Trong Graph API Explorer, hãy đổi mục 'Người dùng hoặc Trang' sang tên Fanpage của CLB để lấy Page Access Token rồi dán lại.");
            }
            throw e;
        }

        upsertConnectionAndSync(actor, club, profile, cleanToken);
        return buildOverviewResponse(club.getId(), DEFAULT_SYNC_POST_LIMIT);
    }

    @Override
    @Transactional(noRollbackFor = ApiException.class)
    public ClubFacebookOverviewResponse syncNow(Actor actor, UUID clubId) {
        requireManageAccess(actor, clubId);
        Club club = requireClub(clubId);
        ClubFacebookPage connection = pageRepository.findByClub_Id(club.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FACEBOOK_NOT_CONNECTED",
                        "Câu lạc bộ chưa kết nối Fanpage Facebook."));

        if (!inFlightSyncClubs.add(club.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "FACEBOOK_SYNC_IN_PROGRESS",
                    "Fanpage Facebook của câu lạc bộ đang được đồng bộ. Vui lòng thử lại sau vài giây.");
        }
        try {
            int cooldownMinutes = (settingsService != null && settingsService.current() != null)
                    ? settingsService.current().facebookSyncCooldownMinutes()
                    : DEFAULT_FACEBOOK_SYNC_COOLDOWN_MINUTES;
            if (cooldownMinutes > 0 && connection.getLastSyncedAt() != null) {
                OffsetDateTime now = OffsetDateTime.now();
                OffsetDateTime nextAllowed = connection.getLastSyncedAt().plusMinutes(cooldownMinutes);
                if (now.isBefore(nextAllowed)) {
                    long remainingSeconds = Math.max(1L, java.time.Duration.between(now, nextAllowed).toSeconds());
                    throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "FACEBOOK_SYNC_COOLDOWN",
                            "Vui lòng chờ " + remainingSeconds + " giây trước khi đồng bộ Fanpage Facebook lại (tối đa 1 lần / "
                                    + cooldownMinutes + " phút).");
                }
            }

            String decryptedToken;
            try {
                decryptedToken = tokenCryptoService.decrypt(connection.getEncryptedAccessToken());
            } catch (RuntimeException e) {
                ApiException tokenError = new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_TOKEN_EXPIRED",
                        "Không thể giải mã Access Token Facebook (khoá mã hoá có thể đã thay đổi). Vui lòng kết nối lại Fanpage.");
                connection.setConsecutiveSyncFailures(connection.getConsecutiveSyncFailures() + 1);
                connection.setLastSyncError(tokenError.getMessage());
                pageRepository.save(connection);
                throw tokenError;
            }
            try {
                FacebookGraphClient.FbPageProfile freshProfile = graphClient.fetchPageProfile(decryptedToken);
                List<FacebookGraphClient.FbPostRecord> posts = graphClient.fetchPagePosts(
                        freshProfile.pageId(), decryptedToken, DEFAULT_SYNC_POST_LIMIT);

                connection.setPageId(freshProfile.pageId());
                connection.setPageName(freshProfile.pageName());
                connection.setPageLink(freshProfile.pageLink());
                connection.setAvatarUrl(freshProfile.avatarUrl());
                connection.setFollowersCount(freshProfile.followersCount());
                connection.setFanCount(freshProfile.fanCount());
                upsertPosts(club, posts);
                connection.setLastSyncedAt(OffsetDateTime.now());
                connection.setConsecutiveSyncFailures(0);
                connection.setLastSyncError(null);
                pageRepository.save(connection);
            } catch (ApiException e) {
                connection.setConsecutiveSyncFailures(connection.getConsecutiveSyncFailures() + 1);
                connection.setLastSyncError(e.getMessage());
                pageRepository.save(connection);
                throw e;
            }

            return buildOverviewResponse(club.getId(), DEFAULT_SYNC_POST_LIMIT);
        } finally {
            inFlightSyncClubs.remove(club.getId());
        }
    }

    /**
     * Background auto-sync called by {@link ClubFacebookSyncScheduler}.
     * Performs outbound Meta Graph API calls strictly OUTSIDE any database transaction
     * and opens a short write transaction only to persist refreshed data or failure counters.
     */
    public boolean runAutoSyncForClub(UUID clubId) {
        if (clubId == null || !inFlightSyncClubs.add(clubId)) {
            return false;
        }
        try {
            record SyncTarget(UUID clubId, String clubName, String encryptedToken, UUID connectedBy, String pageName) {}
            SyncTarget target = runInShortTx(() -> pageRepository.findByClub_Id(clubId)
                    .map(p -> new SyncTarget(clubId, p.getClub().getName(), p.getEncryptedAccessToken(), p.getConnectedBy(), p.getPageName()))
                    .orElse(null));
            if (target == null) return false;

            String decryptedToken;
            try {
                decryptedToken = tokenCryptoService.decrypt(target.encryptedToken());
            } catch (RuntimeException e) {
                recordAutoSyncFailure(target.clubId(), target.clubName(), target.connectedBy(),
                        "FACEBOOK_TOKEN_EXPIRED",
                        "Không thể giải mã Access Token Facebook. Vui lòng kết nối lại Fanpage.");
                return false;
            }

            try {
                FacebookGraphClient.FbPageProfile freshProfile = graphClient.fetchPageProfile(decryptedToken);
                List<FacebookGraphClient.FbPostRecord> posts = graphClient.fetchPagePosts(
                        freshProfile.pageId(), decryptedToken, DEFAULT_SYNC_POST_LIMIT);

                runInShortTx(() -> {
                    Club club = clubRepository.findById(clubId).orElse(null);
                    ClubFacebookPage conn = pageRepository.findByClub_Id(clubId).orElse(null);
                    if (club == null || conn == null) return null;
                    conn.setPageId(freshProfile.pageId());
                    conn.setPageName(freshProfile.pageName());
                    conn.setPageLink(freshProfile.pageLink());
                    conn.setAvatarUrl(freshProfile.avatarUrl());
                    conn.setFollowersCount(freshProfile.followersCount());
                    conn.setFanCount(freshProfile.fanCount());
                    upsertPosts(club, posts);
                    OffsetDateTime now = OffsetDateTime.now();
                    conn.setLastSyncedAt(now);
                    conn.setLastAutoSyncedAt(now);
                    conn.setConsecutiveSyncFailures(0);
                    conn.setLastSyncError(null);
                    pageRepository.save(conn);
                    return null;
                });
                return true;
            } catch (ApiException e) {
                recordAutoSyncFailure(target.clubId(), target.clubName(), target.connectedBy(), e.getCode(), e.getMessage());
                return false;
            }
        } finally {
            inFlightSyncClubs.remove(clubId);
        }
    }

    private void recordAutoSyncFailure(UUID clubId, String clubName, UUID connectedBy, String errorCode, String errorMsg) {
        runInShortTx(() -> {
            ClubFacebookPage conn = pageRepository.findByClub_Id(clubId).orElse(null);
            if (conn == null) return null;
            conn.setConsecutiveSyncFailures(conn.getConsecutiveSyncFailures() + 1);
            conn.setLastSyncError(errorMsg);
            pageRepository.save(conn);
            if (notificationService != null && connectedBy != null
                    && ("FACEBOOK_TOKEN_EXPIRED".equals(errorCode) || "FACEBOOK_PERMISSION_MISSING".equals(errorCode))) {
                String dayKey = java.time.LocalDate.now(java.time.ZoneOffset.UTC).toString();
                notificationService.create(
                        connectedBy,
                        "Cần kết nối lại Fanpage Facebook (" + clubName + ")",
                        "Đồng bộ tự động Fanpage \"" + conn.getPageName() + "\" thất bại: " + errorMsg,
                        "CLUB",
                        clubId,
                        "FB_TOKEN_ALERT:" + clubId + ":" + dayKey);
            }
            return null;
        });
    }

    private <T> T runInShortTx(java.util.function.Supplier<T> action) {
        if (transactionTemplate != null) {
            return transactionTemplate.execute(status -> action.get());
        }
        return action.get();
    }

    @Override
    @Transactional
    public void disconnect(Actor actor, UUID clubId) {
        requireManageAccess(actor, clubId);
        Club club = requireClub(clubId);
        ClubFacebookPage existing = pageRepository.findByClub_Id(club.getId()).orElse(null);
        if (existing == null) {
            return;
        }
        String previousName = existing.getPageName();
        String previousPageId = existing.getPageId();
        postRepository.deleteByClub_Id(club.getId());
        pageRepository.deleteByClub_Id(club.getId());
        auditService.recordChange(
                actor.id(),
                AuditAction.CLUB_UPDATED,
                club.getId(),
                club.getId(),
                Map.of("facebookPageId", previousPageId, "facebookPageName", previousName),
                Map.of("facebookPageId", "", "facebookPageName", "")
        );
    }

    @Override
    @Transactional(readOnly = true)
    public ClubFacebookOAuthStartResponse startOAuth(Actor actor, UUID clubId) {
        requireManageAccess(actor, clubId);
        requireClub(clubId);
        var fb = effectiveFacebook();
        if (!fb.isOauthConfigured()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_OAUTH_NOT_CONFIGURED",
                    "Tính năng Đăng nhập Facebook chưa được quản trị viên hệ thống kích hoạt. Bạn có thể kết nối nhanh bằng Page Access Token.");
        }
        purgeExpiredEntries();
        String state = randomToken();
        pendingStates.put(state, new PendingOAuthState(actor.id(), clubId, Instant.now().plusSeconds(OAUTH_TTL_SECONDS)));

        String version = fb.graphVersion().replaceAll("^/+|/+$", "");
        String authUrl = "https://www.facebook.com/" + version + "/dialog/oauth"
                + "?client_id=" + encode(fb.appId())
                + "&redirect_uri=" + encode(fb.oauthRedirectUri())
                + "&state=" + encode(state)
                + "&response_type=code"
                + "&scope=" + encode(OAUTH_SCOPE);
        return new ClubFacebookOAuthStartResponse(authUrl);
    }

    @Override
    public String handleOAuthCallback(String code, String state, String error, String errorDescription) {
        purgeExpiredEntries();
        PendingOAuthState pending = state == null ? null : pendingStates.remove(state);
        var fb = effectiveFacebook();
        String frontendBase = fb.frontendBaseUrl().replaceAll("/+$", "");
        if (pending == null || pending.expiresAt().isBefore(Instant.now())) {
            return frontendBase + "/management?tab=settings&fbError=" + encode("Phiên kết nối Facebook đã hết hạn. Vui lòng thử lại.");
        }
        String baseReturn = frontendBase + "/management?tab=settings&clubId=" + pending.clubId();
        if (error != null && !error.isBlank()) {
            String msg = (errorDescription != null && !errorDescription.isBlank()) ? errorDescription : "Bạn đã huỷ kết nối Facebook.";
            return baseReturn + "&fbError=" + encode(msg);
        }
        if (code == null || code.isBlank()) {
            return baseReturn + "&fbError=" + encode("Facebook không trả về mã xác thực.");
        }
        try {
            String shortUserToken = graphClient.exchangeOAuthCodeForUserToken(code, fb.oauthRedirectUri());
            String longUserToken = graphClient.exchangeForLongLivedUserToken(shortUserToken);
            List<FacebookGraphClient.FbManagedPage> pages = graphClient.fetchManagedPages(longUserToken);
            if (pages.isEmpty()) {
                return baseReturn + "&fbError=" + encode("Không tìm thấy Fanpage nào bạn có quyền quản trị. Hãy bấm 'Chỉnh sửa cài đặt trước đó' để tick chọn Fanpage CLB.");
            }
            String selectionToken = randomToken();
            pendingSelections.put(selectionToken, new PendingPageSelection(
                    pending.actorId(), pending.clubId(), pages, Instant.now().plusSeconds(OAUTH_TTL_SECONDS)));
            return baseReturn + "&fbSelect=" + encode(selectionToken);
        } catch (ApiException e) {
            return baseReturn + "&fbError=" + encode(e.getMessage());
        } catch (Exception e) {
            return baseReturn + "&fbError=" + encode("Không thể hoàn tất kết nối Facebook. Vui lòng thử lại.");
        }
    }

    @Override
    @Transactional(readOnly = true)
    public List<ClubFacebookOAuthPageOptionResponse> listPendingOAuthPages(Actor actor, UUID clubId, String selectionToken) {
        requireManageAccess(actor, clubId);
        PendingPageSelection selection = requireSelection(actor, clubId, selectionToken);
        return selection.pages().stream()
                .map(p -> new ClubFacebookOAuthPageOptionResponse(
                        p.pageId(), p.pageName(), p.pageLink(), p.avatarUrl(),
                        p.followersCount(), p.fanCount(), p.tasks()))
                .toList();
    }

    @Override
    @Transactional
    public ClubFacebookOverviewResponse selectOAuthPage(Actor actor, UUID clubId, String selectionToken, String pageId) {
        requireManageAccess(actor, clubId);
        Club club = requireClub(clubId);
        PendingPageSelection selection = requireSelection(actor, clubId, selectionToken);
        FacebookGraphClient.FbManagedPage chosen = selection.pages().stream()
                .filter(p -> p.pageId().equals(pageId))
                .findFirst()
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "FACEBOOK_PAGE_NOT_IN_SELECTION",
                        "Fanpage được chọn không còn hợp lệ trong phiên đăng nhập Facebook."));
        pendingSelections.remove(selectionToken);

        FacebookGraphClient.FbPageProfile profile = new FacebookGraphClient.FbPageProfile(
                chosen.pageId(), chosen.pageName(), chosen.pageLink(),
                chosen.avatarUrl(), chosen.followersCount(), chosen.fanCount());
        upsertConnectionAndSync(actor, club, profile, chosen.accessToken());
        return buildOverviewResponse(club.getId(), DEFAULT_SYNC_POST_LIMIT);
    }

    @Override
    @Transactional(readOnly = true)
    public ClubFacebookPublicFeedResponse getPublicFeed(UUID clubId, int limit) {
        Club club = clubRepository.findById(clubId)
                .filter(c -> c.getStatus() == ClubStatus.ACTIVE)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
        ClubFacebookPage connection = pageRepository.findByClub_Id(club.getId()).orElse(null);
        if (connection == null) {
            return new ClubFacebookPublicFeedResponse(club.getId(), false, null, null, null, 0, null, Collections.emptyList());
        }
        int capped = Math.max(1, Math.min(limit, 20));
        List<ClubFacebookOverviewResponse.FacebookPostItem> posts = postRepository
                .findByClub_IdOrderByPublishedAtDesc(club.getId(), PageRequest.of(0, capped))
                .stream()
                .map(this::toPostItem)
                .toList();
        return new ClubFacebookPublicFeedResponse(
                club.getId(),
                true,
                connection.getPageName(),
                connection.getPageLink(),
                connection.getAvatarUrl(),
                connection.getFollowersCount(),
                connection.getLastSyncedAt(),
                posts
        );
    }

    private void upsertConnectionAndSync(
            Actor actor,
            Club club,
            FacebookGraphClient.FbPageProfile profile,
            String rawPageToken
    ) {
        ClubFacebookPage entity = pageRepository.findByClub_Id(club.getId()).orElseGet(ClubFacebookPage::new);
        String prevPageId = entity.getPageId();
        boolean switchedPage = prevPageId != null && !prevPageId.equals(profile.pageId());

        entity.setClub(club);
        entity.setPageId(profile.pageId());
        entity.setPageName(profile.pageName());
        entity.setPageLink(profile.pageLink());
        entity.setAvatarUrl(profile.avatarUrl());
        entity.setFollowersCount(profile.followersCount());
        entity.setFanCount(profile.fanCount());
        entity.setEncryptedAccessToken(tokenCryptoService.encrypt(rawPageToken));
        entity.setConnectedBy(actor.id());
        entity.setConnectedAt(OffsetDateTime.now());
        entity.setConsecutiveSyncFailures(0);
        entity.setLastSyncError(null);
        pageRepository.save(entity);

        if (switchedPage) {
            postRepository.deleteByClub_Id(club.getId());
            postRepository.flush();
        }

        try {
            List<FacebookGraphClient.FbPostRecord> posts = graphClient.fetchPagePosts(
                    profile.pageId(), rawPageToken, DEFAULT_SYNC_POST_LIMIT);
            upsertPosts(club, posts);
            entity.setLastSyncedAt(OffsetDateTime.now());
            entity.setLastSyncError(null);
        } catch (ApiException e) {
            entity.setLastSyncError(e.getMessage());
        }
        pageRepository.save(entity);

        auditService.recordChange(
                actor.id(),
                AuditAction.CLUB_UPDATED,
                club.getId(),
                club.getId(),
                Map.of("facebookPageId", prevPageId == null ? "" : prevPageId),
                Map.of("facebookPageId", profile.pageId(), "facebookPageName", profile.pageName())
        );
    }

    private void upsertPosts(Club club, List<FacebookGraphClient.FbPostRecord> incoming) {
        OffsetDateTime now = OffsetDateTime.now();
        Map<String, ClubFacebookPost> existingByFbId = new java.util.HashMap<>();
        for (ClubFacebookPost existing : postRepository.findByClub_IdOrderByPublishedAtDesc(club.getId())) {
            existingByFbId.put(existing.getFbPostId(), existing);
        }
        List<ClubFacebookPost> toSave = new java.util.ArrayList<>(incoming.size());
        for (FacebookGraphClient.FbPostRecord record : incoming) {
            ClubFacebookPost entity = existingByFbId.getOrDefault(record.fbPostId(), new ClubFacebookPost());
            entity.setClub(club);
            entity.setFbPostId(record.fbPostId());
            entity.setMessage(record.message());
            entity.setPermalinkUrl(record.permalinkUrl());
            entity.setImageUrl(record.imageUrl());
            entity.setPublishedAt(record.publishedAt() != null ? record.publishedAt() : now);
            entity.setReactionsCount(Math.max(0, record.reactionsCount()));
            entity.setCommentsCount(Math.max(0, record.commentsCount()));
            entity.setSharesCount(Math.max(0, record.sharesCount()));
            entity.setSyncedAt(now);
            toSave.add(entity);
        }
        if (!toSave.isEmpty()) {
            postRepository.saveAll(toSave);
        }
    }

    private ClubFacebookOverviewResponse buildOverviewResponse(UUID clubId, int postLimit) {
        ClubFacebookPage connection = pageRepository.findByClub_Id(clubId).orElse(null);
        if (connection == null) {
            return new ClubFacebookOverviewResponse(
                    clubId,
                    false,
                    effectiveFacebook().isOauthConfigured(),
                    null,
                    new ClubFacebookOverviewResponse.EngagementSummary(0, 0, 0, 0, 0, 0, 0.0),
                    Collections.emptyList()
            );
        }
        List<ClubFacebookPost> allPosts = postRepository.findByClub_IdOrderByPublishedAtDesc(clubId);
        long totalReactions = allPosts.stream().mapToLong(ClubFacebookPost::getReactionsCount).sum();
        long totalComments = allPosts.stream().mapToLong(ClubFacebookPost::getCommentsCount).sum();
        long totalShares = allPosts.stream().mapToLong(ClubFacebookPost::getSharesCount).sum();
        double avg = allPosts.isEmpty()
                ? 0.0
                : Math.round(((double) (totalReactions + totalComments + totalShares) / allPosts.size()) * 10.0) / 10.0;

        int capped = Math.max(1, Math.min(postLimit, 50));
        List<ClubFacebookOverviewResponse.FacebookPostItem> visiblePosts = allPosts.stream()
                .limit(capped)
                .map(this::toPostItem)
                .toList();

        return new ClubFacebookOverviewResponse(
                clubId,
                true,
                effectiveFacebook().isOauthConfigured(),
                new ClubFacebookOverviewResponse.PageInfo(
                        connection.getPageId(),
                        connection.getPageName(),
                        connection.getPageLink(),
                        connection.getAvatarUrl(),
                        connection.getFollowersCount(),
                        connection.getFanCount(),
                        connection.getConnectedAt(),
                        connection.getLastSyncedAt(),
                        connection.getLastSyncError()
                ),
                new ClubFacebookOverviewResponse.EngagementSummary(
                        connection.getFollowersCount(),
                        connection.getFanCount(),
                        allPosts.size(),
                        totalReactions,
                        totalComments,
                        totalShares,
                        avg
                ),
                visiblePosts
        );
    }

    private ClubFacebookOverviewResponse.FacebookPostItem toPostItem(ClubFacebookPost post) {
        return new ClubFacebookOverviewResponse.FacebookPostItem(
                post.getId(),
                post.getFbPostId(),
                post.getMessage(),
                post.getPermalinkUrl(),
                post.getImageUrl(),
                post.getPublishedAt(),
                post.getReactionsCount(),
                post.getCommentsCount(),
                post.getSharesCount(),
                post.getSyncedAt()
        );
    }

    private void requireViewAccess(Actor actor, UUID clubId) {
        if (authorizationService.hasPermission(actor, "club.facebook.view", clubId, null)
                || authorizationService.hasPermission(actor, "club.facebook.manage", clubId, null)
                || authorizationService.hasPermission(actor, "club.view", clubId, null)
                || authorizationService.hasPermission(actor, "club.update", clubId, null)) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }

    private void requireManageAccess(Actor actor, UUID clubId) {
        if (authorizationService.hasPermission(actor, "club.facebook.manage", clubId, null)
                || authorizationService.hasPermission(actor, "club.update", clubId, null)) {
            return;
        }
        throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }

    private Club requireClub(UUID clubId) {
        return clubRepository.findById(clubId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "CLUB_NOT_FOUND", "Club not found"));
    }

    private PendingPageSelection requireSelection(Actor actor, UUID clubId, String selectionToken) {
        purgeExpiredEntries();
        PendingPageSelection selection = selectionToken == null ? null : pendingSelections.get(selectionToken);
        if (selection == null
                || selection.expiresAt().isBefore(Instant.now())
                || !selection.actorId().equals(actor.id())
                || !selection.clubId().equals(clubId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_SELECTION_EXPIRED",
                    "Phiên chọn Fanpage đã hết hạn hoặc không hợp lệ. Vui lòng bấm Đăng nhập Facebook lại.");
        }
        return selection;
    }

    private void purgeExpiredEntries() {
        Instant now = Instant.now();
        pendingStates.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
        pendingSelections.entrySet().removeIf(e -> e.getValue().expiresAt().isBefore(now));
    }

    private String randomToken() {
        byte[] bytes = new byte[24];
        random.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static String encode(String value) {
        return URLEncoder.encode(value == null ? "" : value, StandardCharsets.UTF_8);
    }
}
