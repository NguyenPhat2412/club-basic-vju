package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class SystemSettingsApiTest extends ApiIntegrationTest {
    private static final String SETTINGS = "/api/v1/system-settings";

    private String applications(UUID clubId) {
        return "/api/v1/clubs/" + clubId + "/applications";
    }

    private void settings(int maxPending, int cooldownDays, int maxClubs) throws Exception {
        call(put(SETTINGS), adminToken, Map.of("maxPendingApplications", maxPending,
                "reapplyCooldownDays", cooldownDays, "maxActiveClubs", maxClubs), 200);
    }

    @Test
    void onlyGrantedAccountsReadAndChangeSettingsAndChangesAreAudited() throws Exception {
        problem(get(SETTINGS), memberToken, null, 403, "PERMISSION_DENIED");
        problem(put(SETTINGS), memberToken, Map.of("maxPendingApplications", 1, "reapplyCooldownDays", 0, "maxActiveClubs", 0),
                403, "PERMISSION_DENIED");

        JsonNode current = call(get(SETTINGS), adminToken, null, 200);
        assertThat(current.path("maxPendingApplications").asInt()).isEqualTo(3);
        assertThat(current.path("reapplyCooldownDays").asInt()).isEqualTo(7);
        assertThat(current.path("maxActiveClubs").asInt()).isZero();

        problem(put(SETTINGS), adminToken, Map.of("maxPendingApplications", -1, "reapplyCooldownDays", 0, "maxActiveClubs", 0),
                400, "VALIDATION_ERROR");
        settings(5, 0, 2);
        assertThat(call(get(SETTINGS), adminToken, null, 200).path("maxActiveClubs").asInt()).isEqualTo(2);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'SYSTEM_SETTINGS_UPDATED'")).isEqualTo(1);

        grant(member, "setting.view", "GLOBAL", null, null);
        call(get(SETTINGS), token(member), null, 200);
    }

    @Test
    void pendingLimitCountsApplicationsAcrossClubs() throws Exception {
        settings(1, 0, 0);
        call(post(applications(clubA)), memberToken, Map.of("message", "A"), 201);
        problem(post(applications(clubB)), memberToken, Map.of("message", "B"), 409, "APPLICATION_PENDING_LIMIT");

        settings(0, 0, 0);
        call(post(applications(clubB)), memberToken, Map.of("message", "B"), 201);
    }

    @Test
    void rejectedStudentWaitsBeforeApplyingToTheSameClubAgain() throws Exception {
        JsonNode app = call(post(applications(clubA)), memberToken, Map.of("message", "A"), 201);
        call(post(applications(clubA) + "/" + id(app) + "/reject"), adminToken, Map.of("reviewNote", "chưa phù hợp"), 200);
        problem(post(applications(clubA)), memberToken, Map.of("message", "again"), 409, "APPLICATION_REAPPLY_TOO_SOON");
        call(post(applications(clubB)), memberToken, Map.of("message", "other club"), 201);

        db.update("UPDATE club_applications SET reviewed_at = reviewed_at - interval '8 days' WHERE id = ?", id(app));
        call(post(applications(clubA)), memberToken, Map.of("message", "again"), 201);
    }

    @Test
    void clubLimitStopsApplyingAndApproval() throws Exception {
        JsonNode inB = call(post(applications(clubB)), memberToken, Map.of("message", "B"), 201);
        call(post(applications(clubA)), memberToken, Map.of("message", "A"), 201);
        call(post(applications(clubB) + "/" + id(inB) + "/approve"), adminToken, Map.of(), 200);

        settings(3, 7, 1);
        UUID pendingInA = UUID.fromString(db.queryForObject(
                "SELECT id::text FROM club_applications WHERE club_id = ? AND status = 'PENDING'", String.class, clubA));
        problem(post(applications(clubA) + "/" + pendingInA + "/approve"), adminToken, Map.of(), 409, "MEMBERSHIP_LIMIT_REACHED");
        UUID clubC = club("C");
        problem(post(applications(clubC)), memberToken, Map.of("message", "C"), 409, "MEMBERSHIP_LIMIT_REACHED");
    }
}
