package com.vju.club.service;

import com.vju.club.config.FacebookProperties;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubFacebookPage;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubFacebookPageRepository;
import com.vju.club.repository.ClubFacebookPostRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.TokenCryptoService;
import com.vju.club.service.impl.ClubFacebookServiceImpl;
import com.vju.club.service.impl.ClubFacebookSyncScheduler;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.OffsetDateTime;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.contains;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClubFacebookSyncSchedulerTest {
    private ClubRepository clubRepository;
    private ClubFacebookPageRepository pageRepository;
    private ClubFacebookPostRepository postRepository;
    private FacebookGraphClient graphClient;
    private TokenCryptoService tokenCryptoService;
    private SystemSettingsService settingsService;
    private NotificationService notificationService;
    private ClubFacebookServiceImpl facebookService;
    private ClubFacebookSyncScheduler scheduler;

    @BeforeEach
    void setUp() {
        clubRepository = mock(ClubRepository.class);
        pageRepository = mock(ClubFacebookPageRepository.class);
        postRepository = mock(ClubFacebookPostRepository.class);
        graphClient = mock(FacebookGraphClient.class);
        tokenCryptoService = mock(TokenCryptoService.class);
        settingsService = mock(SystemSettingsService.class);
        notificationService = mock(NotificationService.class);
        facebookService = new ClubFacebookServiceImpl(
                clubRepository, pageRepository, postRepository, graphClient, tokenCryptoService,
                new FacebookProperties(), mock(PermissionAuthorizationService.class), mock(AuditService.class));
        ReflectionTestUtils.setField(facebookService, "notificationService", notificationService);
        scheduler = new ClubFacebookSyncScheduler(pageRepository, facebookService, settingsService);
    }

    private SystemSettingsResponse settings(boolean enabled, int intervalMinutes) {
        return new SystemSettingsResponse(
                3, 7, 5, 48, true, 120, 7, 10, 4000, 20, 20, 10, 5, 500, 20, 30, 20, 50, 200, 5, 2,
                enabled, intervalMinutes,
                5, 5, 60, 5, null, 587, null, false, null, "VJU ClubHub", true,
                null, false, null, null, null, false, null, false, null, false, null, null, null, false,
                false, false, null, null, true, 5, true, true, true, 180, false,
                false, null, false, null, "info", null,
                OffsetDateTime.now(), null);
    }

    @Test
    void syncDuePagesSkipsWhenAutoSyncDisabled() {
        when(settingsService.current()).thenReturn(settings(false, 60));

        assertThat(scheduler.syncDuePages(false)).isZero();
        verify(pageRepository, never()).findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES);
    }

    @Test
    void syncDuePagesRefreshesStaleClubAndSkipsFreshClub() {
        when(settingsService.current()).thenReturn(settings(true, 60));

        Club staleClub = club("VAC", "VJU Art Club");
        Club freshClub = club("ARC", "Academic Research Club");
        ClubFacebookPage stalePage = page(staleClub, OffsetDateTime.now().minusMinutes(90));
        ClubFacebookPage freshPage = page(freshClub, OffsetDateTime.now().minusMinutes(10));

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(stalePage, freshPage));
        when(clubRepository.findById(staleClub.getId())).thenReturn(Optional.of(staleClub));
        when(pageRepository.findByClub_Id(staleClub.getId())).thenReturn(Optional.of(stalePage));
        when(tokenCryptoService.decrypt("enc:v1:tok")).thenReturn("raw-tok");
        when(graphClient.fetchPageProfile("raw-tok")).thenReturn(
                new FacebookGraphClient.FbPageProfile("pg-1", "VAC Page", "https://fb.com/pg-1", null, 320, 310));
        when(graphClient.fetchPagePosts("pg-1", "raw-tok", 25)).thenReturn(Collections.emptyList());

        int count = scheduler.syncDuePages(false);

        assertThat(count).isEqualTo(1);
        assertThat(stalePage.getFollowersCount()).isEqualTo(320);
        assertThat(stalePage.getConsecutiveSyncFailures()).isZero();
        assertThat(stalePage.getLastAutoSyncedAt()).isNotNull();
        verify(pageRepository, never()).findByClub_Id(freshClub.getId());
    }

    @Test
    void autoSyncFailureIncrementsCounterAndNotifiesConnectorOnExpiredToken() {
        when(settingsService.current()).thenReturn(settings(true, 60));

        Club club = club("VAC", "VJU Art Club");
        ClubFacebookPage stalePage = page(club, OffsetDateTime.now().minusHours(2));
        UUID connectorId = UUID.randomUUID();
        stalePage.setConnectedBy(connectorId);

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(stalePage));
        when(pageRepository.findByClub_Id(club.getId())).thenReturn(Optional.of(stalePage));
        when(tokenCryptoService.decrypt("enc:v1:tok")).thenReturn("expired-tok");
        when(graphClient.fetchPageProfile("expired-tok"))
                .thenThrow(new ApiException(HttpStatus.BAD_REQUEST, "FACEBOOK_TOKEN_EXPIRED", "Token đã hết hạn"));

        int count = scheduler.syncDuePages(false);

        assertThat(count).isZero();
        assertThat(stalePage.getConsecutiveSyncFailures()).isEqualTo(1);
        assertThat(stalePage.getLastSyncError()).contains("hết hạn");
        verify(notificationService).create(
                eq(connectorId),
                contains("VJU Art Club"),
                contains("Token đã hết hạn"),
                eq("CLUB"),
                eq(club.getId()),
                contains("FB_TOKEN_ALERT:" + club.getId()));
    }

    @Test
    void syncDuePagesEnforcesMinimum15MinuteIntervalAndSyncsNullLastSyncedAt() {
        when(settingsService.current()).thenReturn(settings(true, 5));

        Club nullSyncedClub = club("VMC", "VJU Music Club");
        Club recentClub = club("VCC", "VJU Chess Club");
        ClubFacebookPage nullSyncedPage = page(nullSyncedClub, null);
        ClubFacebookPage recentPage = page(recentClub, OffsetDateTime.now().minusMinutes(10));

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(nullSyncedPage, recentPage));
        when(clubRepository.findById(nullSyncedClub.getId())).thenReturn(Optional.of(nullSyncedClub));
        when(pageRepository.findByClub_Id(nullSyncedClub.getId())).thenReturn(Optional.of(nullSyncedPage));
        when(tokenCryptoService.decrypt("enc:v1:tok")).thenReturn("raw-tok");
        when(graphClient.fetchPageProfile("raw-tok")).thenReturn(
                new FacebookGraphClient.FbPageProfile("pg-2", "VMC Page", "https://fb.com/pg-2", null, 150, 145));
        when(graphClient.fetchPagePosts("pg-2", "raw-tok", 25)).thenReturn(Collections.emptyList());

        int count = scheduler.syncDuePages(false);

        assertThat(count).isEqualTo(1);
        assertThat(nullSyncedPage.getLastAutoSyncedAt()).isNotNull();
        verify(pageRepository, never()).findByClub_Id(recentClub.getId());
    }

    @Test
    void syncDuePagesIsolatesFailuresAcrossClubsAndAlertsOnPermissionMissing() {
        when(settingsService.current()).thenReturn(settings(true, 60));

        Club failingClub = club("FAIL", "Failing Club");
        Club healthyClub = club("OK", "Healthy Club");
        ClubFacebookPage failingPage = page(failingClub, OffsetDateTime.now().minusHours(2));
        UUID connectorId = UUID.randomUUID();
        failingPage.setConnectedBy(connectorId);
        failingPage.setEncryptedAccessToken("enc:v1:bad");
        ClubFacebookPage healthyPage = page(healthyClub, OffsetDateTime.now().minusHours(2));
        healthyPage.setEncryptedAccessToken("enc:v1:good");

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(failingPage, healthyPage));
        when(pageRepository.findByClub_Id(failingClub.getId())).thenReturn(Optional.of(failingPage));
        when(clubRepository.findById(healthyClub.getId())).thenReturn(Optional.of(healthyClub));
        when(pageRepository.findByClub_Id(healthyClub.getId())).thenReturn(Optional.of(healthyPage));
        when(tokenCryptoService.decrypt("enc:v1:bad")).thenReturn("bad-tok");
        when(tokenCryptoService.decrypt("enc:v1:good")).thenReturn("good-tok");
        when(graphClient.fetchPageProfile("bad-tok"))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "FACEBOOK_PERMISSION_MISSING", "Thiếu quyền Fanpage"));
        when(graphClient.fetchPageProfile("good-tok")).thenReturn(
                new FacebookGraphClient.FbPageProfile("pg-ok", "OK Page", "https://fb.com/ok", null, 500, 490));
        when(graphClient.fetchPagePosts("pg-ok", "good-tok", 25)).thenReturn(Collections.emptyList());

        int count = scheduler.syncDuePages(false);

        assertThat(count).isEqualTo(1);
        assertThat(failingPage.getConsecutiveSyncFailures()).isEqualTo(1);
        assertThat(healthyPage.getFollowersCount()).isEqualTo(500);
        verify(notificationService).create(
                eq(connectorId),
                contains("Failing Club"),
                contains("Thiếu quyền Fanpage"),
                eq("CLUB"),
                eq(failingClub.getId()),
                contains("FB_TOKEN_ALERT:" + failingClub.getId()));
    }

    @Test
    void autoSyncResetsFailureCounterAndLastSyncErrorOnRecovery() {
        when(settingsService.current()).thenReturn(settings(true, 60));

        Club club = club("REC", "Recovery Club");
        ClubFacebookPage page = page(club, OffsetDateTime.now().minusHours(3));
        page.setConsecutiveSyncFailures(2);
        page.setLastSyncError("Temporary timeout");

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(page));
        when(clubRepository.findById(club.getId())).thenReturn(Optional.of(club));
        when(pageRepository.findByClub_Id(club.getId())).thenReturn(Optional.of(page));
        when(tokenCryptoService.decrypt("enc:v1:tok")).thenReturn("raw-tok");
        when(graphClient.fetchPageProfile("raw-tok")).thenReturn(
                new FacebookGraphClient.FbPageProfile("pg-rec", "Recovery Page", "https://fb.com/rec", null, 420, 400));
        when(graphClient.fetchPagePosts("pg-rec", "raw-tok", 25)).thenReturn(Collections.emptyList());

        int count = scheduler.syncDuePages(false);

        assertThat(count).isEqualTo(1);
        assertThat(page.getConsecutiveSyncFailures()).isZero();
        assertThat(page.getLastSyncError()).isNull();
        assertThat(page.getLastAutoSyncedAt()).isNotNull();
    }

    @Test
    void autoSyncHandlesTokenDecryptionFailureGracefully() {
        when(settingsService.current()).thenReturn(settings(true, 60));

        Club club = club("DEC", "Decrypt Fail Club");
        ClubFacebookPage page = page(club, OffsetDateTime.now().minusHours(2));
        UUID connectorId = UUID.randomUUID();
        page.setConnectedBy(connectorId);

        when(pageRepository.findEligibleForAutoSync(ClubFacebookSyncScheduler.MAX_CONSECUTIVE_FAILURES))
                .thenReturn(List.of(page));
        when(pageRepository.findByClub_Id(club.getId())).thenReturn(Optional.of(page));
        when(tokenCryptoService.decrypt("enc:v1:tok")).thenThrow(new IllegalStateException("Bad cipher"));

        int count = scheduler.syncDuePages(false);

        assertThat(count).isZero();
        assertThat(page.getConsecutiveSyncFailures()).isEqualTo(1);
        assertThat(page.getLastSyncError()).contains("giải mã");
        verify(graphClient, never()).fetchPageProfile(anyString());
        verify(notificationService).create(
                eq(connectorId),
                contains("Decrypt Fail Club"),
                anyString(),
                eq("CLUB"),
                eq(club.getId()),
                contains("FB_TOKEN_ALERT:" + club.getId()));
    }

    @Test
    void syncDuePagesReturnsZeroWhenSettingsReadThrows() {
        when(settingsService.current()).thenThrow(new RuntimeException("DB unavailable"));

        assertThat(scheduler.syncDuePages(false)).isZero();
        verify(pageRepository, never()).findEligibleForAutoSync(any(Integer.class));
    }

    private Club club(String code, String name) {
        Club c = new Club();
        c.setId(UUID.randomUUID());
        c.setCode(code);
        c.setName(name);
        return c;
    }

    private ClubFacebookPage page(Club club, OffsetDateTime lastSyncedAt) {
        ClubFacebookPage p = new ClubFacebookPage();
        p.setClub(club);
        p.setPageId("pg-1");
        p.setPageName(club.getName() + " Page");
        p.setEncryptedAccessToken("enc:v1:tok");
        p.setLastSyncedAt(lastSyncedAt);
        return p;
    }
}
