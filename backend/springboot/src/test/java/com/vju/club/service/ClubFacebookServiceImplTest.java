package com.vju.club.service;

import com.vju.club.config.FacebookProperties;
import com.vju.club.dto.response.ClubFacebookOAuthStartResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.ClubFacebookPage;
import com.vju.club.error.ApiException;
import com.vju.club.repository.ClubFacebookPageRepository;
import com.vju.club.repository.ClubFacebookPostRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.TokenCryptoService;
import com.vju.club.service.impl.ClubFacebookServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.transaction.annotation.Transactional;

import java.lang.reflect.Method;
import java.time.OffsetDateTime;
import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class ClubFacebookServiceImplTest {

    private ClubRepository clubRepository;
    private ClubFacebookPageRepository pageRepository;
    private ClubFacebookPostRepository postRepository;
    private FacebookGraphClient graphClient;
    private TokenCryptoService tokenCryptoService;
    private FacebookProperties properties;
    private PermissionAuthorizationService authorizationService;
    private AuditService auditService;
    private ClubFacebookServiceImpl service;

    private final UUID clubId = UUID.randomUUID();
    private final Actor actor = new Actor(UUID.randomUUID());

    @BeforeEach
    void setUp() {
        clubRepository = mock(ClubRepository.class);
        pageRepository = mock(ClubFacebookPageRepository.class);
        postRepository = mock(ClubFacebookPostRepository.class);
        graphClient = mock(FacebookGraphClient.class);
        tokenCryptoService = mock(TokenCryptoService.class);
        properties = new FacebookProperties();
        authorizationService = mock(PermissionAuthorizationService.class);
        when(authorizationService.hasPermission(actor, "club.facebook.manage", clubId, null)).thenReturn(true);
        auditService = mock(AuditService.class);
        service = new ClubFacebookServiceImpl(
                clubRepository, pageRepository, postRepository, graphClient,
                tokenCryptoService, properties, authorizationService, auditService);
    }

    @Test
    void syncNowDoesNotRollbackOnApiExceptionAndPreservesProfileWhenPostsFetchFails() throws Exception {
        Method syncMethod = ClubFacebookServiceImpl.class.getMethod("syncNow", Actor.class, UUID.class);
        Transactional tx = syncMethod.getAnnotation(Transactional.class);
        assertThat(tx).isNotNull();
        assertThat(Arrays.asList(tx.noRollbackFor())).contains(ApiException.class);

        Club club = club();
        ClubFacebookPage conn = existingConnection(club, OffsetDateTime.now().minusMinutes(10));
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));
        when(pageRepository.findByClub_Id(clubId)).thenReturn(Optional.of(conn));
        when(tokenCryptoService.decrypt(conn.getEncryptedAccessToken())).thenReturn("raw-page-token");
        when(graphClient.fetchPageProfile("raw-page-token")).thenReturn(
                new FacebookGraphClient.FbPageProfile("p1", "Updated Name", "https://fb.com/p1", null, 999, 999));
        when(graphClient.fetchPagePosts("p1", "raw-page-token", 25))
                .thenThrow(new ApiException(HttpStatus.FORBIDDEN, "FACEBOOK_PERMISSION_MISSING", "Thiếu quyền"));

        assertThatThrownBy(() -> service.syncNow(actor, clubId))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "FACEBOOK_PERMISSION_MISSING");

        assertThat(conn.getPageName()).isEqualTo("Original Page");
        assertThat(conn.getLastSyncError()).isEqualTo("Thiếu quyền");
        verify(pageRepository).save(conn);
    }

    @Test
    void syncNowTranslatesDecryptFailureIntoExpiredTokenError() {
        Club club = club();
        ClubFacebookPage conn = existingConnection(club, OffsetDateTime.now().minusMinutes(10));
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));
        when(pageRepository.findByClub_Id(clubId)).thenReturn(Optional.of(conn));
        when(tokenCryptoService.decrypt(conn.getEncryptedAccessToken()))
                .thenThrow(new IllegalStateException("Bad GCM tag"));

        assertThatThrownBy(() -> service.syncNow(actor, clubId))
                .isInstanceOf(ApiException.class)
                .hasFieldOrPropertyWithValue("code", "FACEBOOK_TOKEN_EXPIRED");

        assertThat(conn.getLastSyncError()).contains("giải mã");
        verify(pageRepository).save(conn);
        verify(graphClient, never()).fetchPageProfile(anyString());
    }

    @Test
    void startOAuthUsesDefaultPort8080AndMinimalScopesWithoutReadInsights() {
        properties.setAppId("123456");
        properties.setAppSecret("secret-val");
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club()));

        ClubFacebookOAuthStartResponse res = service.startOAuth(actor, clubId);

        assertThat(res.authorizationUrl())
                .contains("localhost%3A8080%2Fapi%2Fv1%2Fintegrations%2Ffacebook%2Foauth%2Fcallback")
                .contains("pages_show_list%2Cpages_read_engagement")
                .doesNotContain("read_insights");
    }

    @Test
    void connectWithTokenBatchLoadsExistingPostsWithoutPerPostLookup() {
        Club club = club();
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));
        when(pageRepository.findByClub_Id(clubId)).thenReturn(Optional.empty());
        when(tokenCryptoService.encrypt("page-tok")).thenReturn("enc:v1:abc");
        when(graphClient.fetchPageProfile("page-tok")).thenReturn(
                new FacebookGraphClient.FbPageProfile("p1", "VAC", "https://fb.com/p1", null, 500, 500));
        when(graphClient.fetchPagePosts("p1", "page-tok", 25)).thenReturn(List.of(
                new FacebookGraphClient.FbPostRecord("post-1", "Hi", "https://fb.com/1", null, OffsetDateTime.now(), 5, 1, 0),
                new FacebookGraphClient.FbPostRecord("post-2", "Hello", "https://fb.com/2", null, OffsetDateTime.now(), 8, 2, 1)
        ));
        when(postRepository.findByClub_IdOrderByPublishedAtDesc(clubId)).thenReturn(Collections.emptyList());

        service.connectWithToken(actor, clubId, "page-tok");

        verify(postRepository, never()).findByClub_IdAndFbPostId(any(), anyString());
        verify(postRepository).saveAll(any());
        verify(graphClient).fetchPagePosts("p1", "page-tok", 25);
    }

    private Club club() {
        Club c = new Club();
        c.setId(clubId);
        c.setCode("VAC");
        c.setName("VJU Art Club");
        return c;
    }

    private ClubFacebookPage existingConnection(Club club, OffsetDateTime lastSyncedAt) {
        ClubFacebookPage p = new ClubFacebookPage();
        p.setClub(club);
        p.setPageId("p1");
        p.setPageName("Original Page");
        p.setEncryptedAccessToken("enc:v1:old");
        p.setLastSyncedAt(lastSyncedAt);
        return p;
    }
}
