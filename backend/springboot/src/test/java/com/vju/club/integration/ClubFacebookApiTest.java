package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.entity.ClubFacebookPage;
import com.vju.club.repository.ClubFacebookPageRepository;
import com.vju.club.security.TokenCryptoService;
import com.vju.club.service.FacebookGraphClient;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyInt;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class ClubFacebookApiTest extends ApiIntegrationTest {
    @MockitoBean
    FacebookGraphClient graphClient;

    @Autowired
    ClubFacebookPageRepository facebookPageRepository;

    @Autowired
    TokenCryptoService tokenCryptoService;

    @BeforeEach
    void stubDefaultFacebookResponses() {
        when(graphClient.fetchPageProfile("EAAG-test-vac-page-token")).thenReturn(
                new FacebookGraphClient.FbPageProfile(
                        "100856574882232",
                        "VAC - CLB Vẽ Trường Đại học Việt Nhật",
                        "https://www.facebook.com/100856574882232",
                        "https://graph.facebook.com/100856574882232/picture",
                        851,
                        851
                )
        );
        when(graphClient.fetchPagePosts(eq("100856574882232"), eq("EAAG-test-vac-page-token"), anyInt())).thenReturn(
                List.of(
                        new FacebookGraphClient.FbPostRecord(
                                "100856574882232_111",
                                "Workshop Vẽ Màu Nước cuối tuần cùng VAC!",
                                "https://www.facebook.com/100856574882232/posts/111",
                                "https://example.com/vac-post-1.jpg",
                                OffsetDateTime.now().minusHours(5),
                                64,
                                12,
                                8
                        ),
                        new FacebookGraphClient.FbPostRecord(
                                "100856574882232_222",
                                "Mở đơn tuyển thành viên Gen 7 CLB Vẽ VJU!",
                                "https://www.facebook.com/100856574882232/posts/222",
                                null,
                                OffsetDateTime.now().minusDays(2),
                                120,
                                25,
                                19
                        )
                )
        );
    }

    @Test
    void connectSyncPublicFeedAndDisconnectWorkWithEncryptedTokenAndRbac() throws Exception {
        // 1. Before connecting: public feed reports connected=false
        JsonNode initialPublic = call(get("/api/v1/public/clubs/" + clubA + "/facebook-posts"), null, null, 200);
        assertThat(initialPublic.path("connected").asBoolean()).isFalse();
        assertThat(initialPublic.path("posts")).isEmpty();

        // 2. Plain student without club.update gets 403
        String plainStudent = token(user("fb-student@vju.local"));
        problem(post("/api/v1/clubs/" + clubA + "/facebook/connect-token"), plainStudent,
                Map.of("accessToken", "EAAG-test-vac-page-token"), 403, "PERMISSION_DENIED");

        // 3. Admin connects VAC Fanpage using Page Access Token
        JsonNode connected = call(post("/api/v1/clubs/" + clubA + "/facebook/connect-token"), adminToken,
                Map.of("accessToken", "EAAG-test-vac-page-token"), 201);
        assertThat(connected.path("connected").asBoolean()).isTrue();
        assertThat(connected.path("page").path("pageId").asText()).isEqualTo("100856574882232");
        assertThat(connected.path("page").path("pageName").asText()).isEqualTo("VAC - CLB Vẽ Trường Đại học Việt Nhật");
        assertThat(connected.path("page").has("accessToken")).isFalse();
        assertThat(connected.path("summary").path("followersCount").asInt()).isEqualTo(851);
        assertThat(connected.path("summary").path("postsCount").asInt()).isEqualTo(2);
        assertThat(connected.path("summary").path("totalReactions").asLong()).isEqualTo(184L);
        assertThat(connected.path("summary").path("totalComments").asLong()).isEqualTo(37L);
        assertThat(connected.path("summary").path("totalShares").asLong()).isEqualTo(27L);
        assertThat(connected.path("posts")).hasSize(2);

        // 4. Verify stored token in PostgreSQL is AES-256-GCM encrypted (never plaintext!)
        ClubFacebookPage persisted = facebookPageRepository.findByClub_Id(clubA).orElseThrow();
        assertThat(persisted.getEncryptedAccessToken()).startsWith("enc:v1:");
        assertThat(persisted.getEncryptedAccessToken()).doesNotContain("EAAG-test-vac-page-token");
        assertThat(tokenCryptoService.decrypt(persisted.getEncryptedAccessToken())).isEqualTo("EAAG-test-vac-page-token");

        // 5. Public endpoint serves cached posts cleanly without exposing token
        JsonNode publicFeed = call(get("/api/v1/public/clubs/" + clubA + "/facebook-posts?limit=5"), null, null, 200);
        assertThat(publicFeed.path("connected").asBoolean()).isTrue();
        assertThat(publicFeed.path("pageName").asText()).isEqualTo("VAC - CLB Vẽ Trường Đại học Việt Nhật");
        assertThat(publicFeed.path("followersCount").asInt()).isEqualTo(851);
        assertThat(publicFeed.path("posts")).hasSize(2);
        assertThat(publicFeed.toString()).doesNotContain("EAAG-test-vac-page-token");

        // 6. Immediate re-sync is blocked by cooldown (429), then succeeds once cooldown elapses
        problem(put("/api/v1/clubs/" + clubA + "/facebook/sync"), adminToken, null, 429, "FACEBOOK_SYNC_COOLDOWN");
        db.update("UPDATE club_facebook_pages SET last_synced_at = last_synced_at - interval '3 minutes' WHERE club_id = ?", clubA);

        when(graphClient.fetchPageProfile("EAAG-test-vac-page-token")).thenReturn(
                new FacebookGraphClient.FbPageProfile(
                        "100856574882232",
                        "VAC - CLB Vẽ Trường Đại học Việt Nhật",
                        "https://www.facebook.com/100856574882232",
                        "https://graph.facebook.com/100856574882232/picture",
                        900,
                        900
                )
        );
        JsonNode synced = call(put("/api/v1/clubs/" + clubA + "/facebook/sync"), adminToken, null, 200);
        assertThat(synced.path("summary").path("followersCount").asInt()).isEqualTo(900);
        assertThat(synced.path("summary").path("postsCount").asInt()).isEqualTo(2);

        // 7. Disconnect removes both connection and cached posts
        call(delete("/api/v1/clubs/" + clubA + "/facebook"), adminToken, null, 204);
        JsonNode afterDisconnect = call(get("/api/v1/clubs/" + clubA + "/facebook"), adminToken, null, 200);
        assertThat(afterDisconnect.path("connected").asBoolean()).isFalse();
        assertThat(afterDisconnect.path("posts")).isEmpty();
    }
}
