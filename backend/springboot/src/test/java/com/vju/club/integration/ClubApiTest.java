package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class ClubApiTest extends ApiIntegrationTest {

    @Test
    void createTrimsInputAndStartsActive() throws Exception {
        JsonNode created = call(post("/api/v1/clubs"), adminToken,
                Map.of("code", "  MUSIC ", "name", "  Music Club ", "contactEmail", "music@vju.edu.vn"), 201);
        assertThat(created.path("code").asText()).isEqualTo("MUSIC");
        assertThat(created.path("name").asText()).isEqualTo("Music Club");
        assertThat(created.path("status").asText()).isEqualTo("ACTIVE");
        call(get("/api/v1/clubs/" + id(created)), adminToken, null, 200);
    }

    @Test
    void codesAreUniqueIgnoringCase() throws Exception {
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "a", "name", "dup"), 409, "CLUB_CODE_ALREADY_EXISTS");
        problem(patch("/api/v1/clubs/" + clubB), adminToken, Map.of("code", "a"), 409, "CLUB_CODE_ALREADY_EXISTS");
        call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("code", "a"), 200);
    }

    @Test
    void concurrentCreatesOfOneCodeYieldOneClubAndConflictsNot500() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/clubs"), adminToken, Map.of("code", "RACE", "name", "Race")).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    @Test
    void createValidation() throws Exception {
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "X"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "X".repeat(51), "name", "n"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "X", "name", "n", "contactEmail", "nope"), 400, "VALIDATION_ERROR");
    }

    @Test
    void createRequiresGlobalPermission() throws Exception {
        problem(post("/api/v1/clubs"), memberToken, Map.of("code", "X", "name", "n"), 403, "PERMISSION_DENIED");
        grant(member, "club.create", "GLOBAL", null, null);
        call(post("/api/v1/clubs"), memberToken, Map.of("code", "X", "name", "n"), 201);
    }

    @Test
    void patchOnlyTouchesProvidedFields() throws Exception {
        call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("description", "About A"), 200);
        JsonNode updated = call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("activityField", "Arts"), 200);
        assertThat(updated.path("description").asText()).isEqualTo("About A");
        assertThat(updated.path("name").asText()).isEqualTo("Club A");
        problem(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("code", "  "), 400, "INVALID_CLUB_CODE");
    }

    @Test
    void listSearchesByNameOrCodeAndPages() throws Exception {
        for (int i = 0; i < 7; i++) club("P" + i);
        JsonNode page = call(get("/api/v1/clubs").param("query", "club p").param("offset", "2").param("limit", "3"),
                adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(7);
        assertThat(page.path("items").size()).isEqualTo(3);
        assertThat(page.path("offset").asInt()).isEqualTo(2);
        assertThat(page.path("limit").asInt()).isEqualTo(3);
        assertThat(call(get("/api/v1/clubs").param("query", "p6"), adminToken, null, 200).path("total").asInt()).isEqualTo(1);
        JsonNode beyond = call(get("/api/v1/clubs").param("offset", "50"), adminToken, null, 200);
        assertThat(beyond.path("items").size()).isZero();
        assertThat(beyond.path("total").asInt()).isEqualTo(9);
    }

    @Test
    void searchTreatsQueryAsDataNotSql() throws Exception {
        assertThat(call(get("/api/v1/clubs").param("query", "' OR 1=1 --"), adminToken, null, 200).path("total").asInt()).isZero();
    }

    @Test
    void clubScopedViewerSeesOnlyTheirClubs() throws Exception {
        grant(member, "club.view", "CLUB", clubB, null);
        JsonNode page = call(get("/api/v1/clubs"), memberToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(1);
        assertThat(page.at("/items/0/id").asText()).isEqualTo(clubB.toString());
        problem(get("/api/v1/clubs/" + clubA), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void missingClubIs404ForGlobalViewersButIndistinguishableForOthers() throws Exception {
        UUID ghost = UUID.randomUUID();
        problem(get("/api/v1/clubs/" + ghost), adminToken, null, 404, "CLUB_NOT_FOUND");
        grant(member, "club.view", "CLUB", clubA, null);
        problem(get("/api/v1/clubs/" + ghost), memberToken, null, 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/clubs/" + ghost), adminToken, Map.of("name", "x"), 404, "CLUB_NOT_FOUND");
    }

    @Test
    void statusChangeUsesDirectionSpecificPermission() throws Exception {
        grant(member, "club.inactive", "CLUB", clubA, null);
        call(patch("/api/v1/clubs/" + clubA + "/status"), memberToken, Map.of("status", "INACTIVE"), 200);
        problem(patch("/api/v1/clubs/" + clubA + "/status"), memberToken, Map.of("status", "ACTIVE"), 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/clubs/" + clubB + "/status"), memberToken, Map.of("status", "INACTIVE"), 403, "PERMISSION_DENIED");
        assertThat(db.queryForObject("SELECT status FROM clubs WHERE id = ?", String.class, clubA)).isEqualTo("INACTIVE");
    }
}
