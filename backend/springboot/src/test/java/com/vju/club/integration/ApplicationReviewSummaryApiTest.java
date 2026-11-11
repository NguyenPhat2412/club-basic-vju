package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class ApplicationReviewSummaryApiTest extends ApiIntegrationTest {
    private static final String SUMMARY = "/api/v1/applications/review-summary";

    @Test
    void countsFollowTheCallersApplicationViewScope() throws Exception {
        JsonNode a = call(post("/api/v1/clubs/" + clubA + "/applications"), memberToken, Map.of("message", "A"), 201);
        call(post("/api/v1/clubs/" + clubB + "/applications"), memberToken, Map.of("message", "B"), 201);
        call(post("/api/v1/clubs/" + clubA + "/applications/" + id(a) + "/reject"), adminToken, Map.of("reviewNote", "chưa phù hợp"), 200);

        JsonNode all = call(get(SUMMARY), adminToken, null, 200);
        assertThat(all.path("pending").asLong()).isEqualTo(1);
        assertThat(all.path("rejected").asLong()).isEqualTo(1);
        assertThat(all.path("total").asLong()).isEqualTo(2);
        assertThat(all.path("recent")).hasSize(2);
        assertThat(all.path("recent").get(0).path("clubId").asText()).isEqualTo(clubB.toString());

        UUID reviewer = user("reviewer.a@test.local");
        grant(reviewer, "application.view", "CLUB", clubA, null);
        JsonNode onlyA = call(get(SUMMARY), token(reviewer), null, 200);
        assertThat(onlyA.path("rejected").asLong()).isEqualTo(1);
        assertThat(onlyA.path("pending").asLong()).isZero();
        assertThat(onlyA.path("total").asLong()).isEqualTo(1);
        assertThat(onlyA.path("recent")).hasSize(1);
        assertThat(onlyA.path("recent").get(0).path("clubId").asText()).isEqualTo(clubA.toString());

        JsonNode none = call(get(SUMMARY), memberToken, null, 200);
        assertThat(none.path("total").asLong()).isZero();
        assertThat(none.path("recent")).isEmpty();
        call(get(SUMMARY), null, null, 401);
    }
}
