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

    private void settingsWith(Map<String, Object> extra) throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(Map.of("maxPendingApplications", 3, "reapplyCooldownDays", 7, "maxActiveClubs", 0));
        body.putAll(extra);
        call(put(SETTINGS), adminToken, body, 200);
    }

    @Test
    void newSettingsHaveDefaultsAndRoundTrip() throws Exception {
        JsonNode current = call(get(SETTINGS), adminToken, null, 200);
        assertThat(current.path("allowSelfRegistration").asBoolean()).isTrue();
        assertThat(current.path("attendanceOpensBeforeMinutes").asInt()).isEqualTo(120);
        assertThat(current.path("documentMaxFileMb").asInt()).isEqualTo(20);

        settingsWith(Map.of("eventTaskGraceDays", 14, "chatMaxMessageLength", 500, "avatarMaxMb", 2));
        JsonNode saved = call(get(SETTINGS), adminToken, null, 200);
        assertThat(saved.path("eventTaskGraceDays").asInt()).isEqualTo(14);
        assertThat(saved.path("chatMaxMessageLength").asInt()).isEqualTo(500);
        assertThat(saved.path("avatarMaxMb").asInt()).isEqualTo(2);
        // fields left out of a request keep their value
        assertThat(saved.path("clubImageMaxMb").asInt()).isEqualTo(10);

        problem(put(SETTINGS), adminToken, Map.of("maxPendingApplications", 3, "reapplyCooldownDays", 7, "maxActiveClubs", 0,
                "documentMaxFileMb", 21), 400, "VALIDATION_ERROR");
    }

    @Test
    void closingSelfRegistrationBlocksSignUp() throws Exception {
        settingsWith(Map.of("allowSelfRegistration", false));
        problem(post("/api/v1/auth/register"), null, Map.of("email", "closed@test.local", "password", "Password123!",
                "fullName", "Closed"), 403, "SIGN_UP_CLOSED");

        settingsWith(Map.of("allowSelfRegistration", true));
        call(post("/api/v1/auth/register"), null, Map.of("email", "open@test.local", "password", "Password123!",
                "fullName", "Open"), 201);
    }

    @Test
    void avatarSizeLimitFollowsSettings() throws Exception {
        settingsWith(Map.of("avatarMaxMb", 1));
        byte[] big = new byte[1024 * 1024 + 16];
        byte[] png = {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A};
        System.arraycopy(png, 0, big, 0, png.length);
        var request = org.springframework.test.web.servlet.request.MockMvcRequestBuilders.multipart("/api/v1/users/me/avatar");
        request.file(new org.springframework.mock.web.MockMultipartFile("file", "big.png", "image/png", big));
        problem(request, memberToken, null, 413, "IMAGE_TOO_LARGE");
    }
}
