package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class UserApiTest extends ApiIntegrationTest {
    @Test
    void profileUpdateNormalizesAndIgnoresAbsentFields() throws Exception {
        JsonNode updated = call(patch("/api/v1/users/me"), memberToken,
                Map.of("fullName", "  Nguyen Van A ", "phone", " 0901 ", "avatarUrl", "https://x/a.png"), 200);
        assertThat(updated.path("fullName").asText()).isEqualTo("Nguyen Van A");
        assertThat(updated.path("phone").asText()).isEqualTo("0901");

        JsonNode cleared = call(patch("/api/v1/users/me"), memberToken, Map.of("phone", "   "), 200);
        assertThat(cleared.path("phone").isNull()).isTrue();
        assertThat(cleared.path("fullName").asText()).isEqualTo("Nguyen Van A");
        assertThat(cleared.path("avatarUrl").asText()).isEqualTo("https://x/a.png");
    }

    @Test
    void profileCannotChangeProtectedFields() throws Exception {
        problem(patch("/api/v1/users/me"), memberToken, Map.of("email", "new@test.local"), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/users/me"), memberToken, Map.of("status", "INACTIVE"), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/users/me"), memberToken, Map.of("fullName", "x".repeat(201)), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/users/me"), memberToken, Map.of("fullName", " "), 400, "INVALID_FULL_NAME");
        assertThat(call(get("/api/v1/users/me"), memberToken, null, 200).path("email").asText()).isEqualTo("member@test.local");
    }

    @ParameterizedTest(name = "orderBy={0} {1}")
    @CsvSource({"email, asc", "email, desc", "fullName, asc", "fullName, desc", "createdAt, asc", "createdAt, desc",
            "status, asc", "status, DESC"})
    void everySupportedSortWorks(String orderBy, String orderType) throws Exception {
        JsonNode page = call(get("/api/v1/users").param("orderBy", orderBy).param("orderType", orderType),
                adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(2);
    }

    @Test
    void sortByEmailIsReallyOrdered() throws Exception {
        user("c@test.local");
        user("b@test.local");
        JsonNode page = call(get("/api/v1/users").param("orderBy", "email").param("orderType", "asc"), adminToken, null, 200);
        List<String> emails = new ArrayList<>();
        page.path("items").forEach(item -> emails.add(item.path("email").asText()));
        assertThat(emails).isSorted();
    }

    @ParameterizedTest
    @CsvSource({"password, asc", "email, sideways", "'email; DROP TABLE users', asc", "u.email, asc"})
    void unsupportedSortIsRejected(String orderBy, String orderType) throws Exception {
        problem(get("/api/v1/users").param("orderBy", orderBy).param("orderType", orderType), adminToken, null,
                400, "INVALID_SORT");
    }

    @Test
    void searchMatchesEmailNameOrStudentCodeAndPages() throws Exception {
        for (int i = 0; i < 6; i++) user("student" + i + "@test.local");
        db.update("UPDATE users SET student_code = 'VJU-777' WHERE email = 'student3@test.local'");
        assertThat(call(get("/api/v1/users").param("query", "STUDENT"), adminToken, null, 200).path("total").asInt()).isEqualTo(6);
        assertThat(call(get("/api/v1/users").param("query", "vju-777"), adminToken, null, 200).path("total").asInt()).isEqualTo(1);
        JsonNode page = call(get("/api/v1/users").param("query", "student").param("offset", "4").param("limit", "5"),
                adminToken, null, 200);
        assertThat(page.path("items").size()).isEqualTo(2);
        assertThat(page.path("total").asInt()).isEqualTo(6);
        assertThat(page.toString()).doesNotContain("passwordHash");
    }

    @Test
    void directoryRequiresUserView() throws Exception {
        problem(get("/api/v1/users"), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/users/" + admin), memberToken, null, 403, "PERMISSION_DENIED");
        grant(member, "user.view", "GLOBAL", null, null);
        call(get("/api/v1/users"), memberToken, null, 200);
        call(get("/api/v1/users/" + admin), memberToken, null, 200);
        problem(get("/api/v1/users/" + UUID.randomUUID()), memberToken, null, 404, "USER_NOT_FOUND");
    }

    @Test
    void deactivationBlocksAccessImmediatelyAndReactivationRestoresIt() throws Exception {
        problem(patch("/api/v1/users/" + member + "/status"), memberToken, Map.of("status", "INACTIVE"), 403, "PERMISSION_DENIED");
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        problem(get("/api/v1/users/me"), memberToken, null, 401, "UNAUTHORIZED");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", PASSWORD), 403, "ACCOUNT_INACTIVE");
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
        problem(get("/api/v1/users/me"), memberToken, null, 401, "UNAUTHORIZED");
        call(get("/api/v1/users/me"), login("member@test.local", PASSWORD), null, 200);
        problem(patch("/api/v1/users/" + UUID.randomUUID() + "/status"), adminToken, Map.of("status", "ACTIVE"), 404, "USER_NOT_FOUND");
    }

    @Test
    void adminUpdatesAnotherUserAndTheChangeIsAudited() throws Exception {
        String path = "/api/v1/users/" + member;
        JsonNode updated = call(patch(path), adminToken,
                Map.of("fullName", "  Tran Thi B ", "studentCode", " 23110001 ", "phone", "0902", "avatarUrl", "https://x/b.png"), 200);
        assertThat(updated.path("fullName").asText()).isEqualTo("Tran Thi B");
        assertThat(updated.path("studentCode").asText()).isEqualTo("23110001");
        assertThat(updated.path("email").asText()).isEqualTo("member@test.local");

        JsonNode cleared = call(patch(path), adminToken, Map.of("phone", "", "studentCode", " "), 200);
        assertThat(cleared.path("phone").isNull()).isTrue();
        assertThat(cleared.path("studentCode").isNull()).isTrue();
        assertThat(cleared.path("fullName").asText()).isEqualTo("Tran Thi B");
        assertThat(cleared.path("avatarUrl").asText()).isEqualTo("https://x/b.png");

        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_PROFILE_UPDATED' AND resource_id = ? "
                + "AND actor_user_id = ?", member, admin)).isEqualTo(2);
        assertThat(db.queryForObject("SELECT new_value FROM audit_logs WHERE action = 'USER_PROFILE_UPDATED' AND resource_id = ? "
                + "ORDER BY created_at, id LIMIT 1", String.class, member)).contains("23110001");
    }

    @Test
    void adminUpdateRequiresUserUpdatePermission() throws Exception {
        UUID other = user("other@test.local");
        problem(patch("/api/v1/users/" + other), memberToken, Map.of("fullName", "Hacked"), 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/users/" + member), memberToken, Map.of("fullName", "Self via admin API"), 403, "PERMISSION_DENIED");
        assertThat(db.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, other)).isEqualTo("other@test.local");

        grant(member, "user.update", "GLOBAL", null, null);
        call(patch("/api/v1/users/" + other), memberToken, Map.of("fullName", "Granted"), 200);
        problem(patch("/api/v1/users/" + other), null, Map.of("fullName", "Anon"), 401, "UNAUTHORIZED");
    }

    @Test
    void adminUpdateRejectsTakenStudentCodeButKeepsOwnCode() throws Exception {
        db.update("UPDATE users SET student_code = 'SV-001' WHERE id = ?", admin);
        db.update("UPDATE users SET student_code = 'SV-002' WHERE id = ?", member);
        problem(patch("/api/v1/users/" + member), adminToken, Map.of("studentCode", "sv-001"), 409, "STUDENT_CODE_ALREADY_EXISTS");
        call(patch("/api/v1/users/" + member), adminToken, Map.of("studentCode", "sv-002"), 200);
    }

    @Test
    void adminUpdateCannotTouchProtectedFieldsOrMissingUsers() throws Exception {
        String path = "/api/v1/users/" + member;
        problem(patch(path), adminToken, Map.of("email", "new@test.local"), 400, "VALIDATION_ERROR");
        problem(patch(path), adminToken, Map.of("status", "INACTIVE"), 400, "VALIDATION_ERROR");
        problem(patch(path), adminToken, Map.of("password", "NewPassword1!"), 400, "VALIDATION_ERROR");
        problem(patch(path), adminToken, Map.of("phone", "call me"), 400, "VALIDATION_ERROR");
        problem(patch(path), adminToken, Map.of("avatarUrl", "javascript:alert(1)"), 400, "VALIDATION_ERROR");
        problem(patch(path), adminToken, Map.of("fullName", "  "), 400, "INVALID_FULL_NAME");
        problem(patch("/api/v1/users/" + UUID.randomUUID()), adminToken, Map.of("fullName", "Ghost"), 404, "USER_NOT_FOUND");
        assertThat(db.queryForObject("SELECT status FROM users WHERE id = ?", String.class, member)).isEqualTo("ACTIVE");
    }

    @Test
    void adminUpdateWithoutCsrfTokenIsRejected() throws Exception {
        var request = patch("/api/v1/users/" + member).cookie(new Cookie(TestSessions.COOKIE, adminToken))
                .contentType("application/json").content(json.writeValueAsString(Map.of("fullName", "Forged")));
        var response = mvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(json.readTree(response.getContentAsString()).path("code").asText()).isEqualTo("CSRF_INVALID");
        assertThat(db.queryForObject("SELECT full_name FROM users WHERE id = ?", String.class, member)).isEqualTo("member@test.local");
    }

    @Test
    void adminDeletesUserCleanlyAndAuditsDeletion() throws Exception {
        UUID doomed = user("doomed@test.local");
        String doomedToken = token(doomed);
        membership(doomed, clubA);
        problem(delete("/api/v1/users/" + doomed), memberToken, null, 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/users/" + admin), adminToken, null, 409, "CANNOT_DELETE_SELF");

        call(delete("/api/v1/users/" + doomed), adminToken, null, 204);
        assertThat(count("SELECT count(*) FROM users WHERE id = ?", doomed)).isZero();
        problem(get("/api/v1/users/me"), doomedToken, null, 401, "UNAUTHORIZED");
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_DELETED' AND resource_id = ?", doomed)).isEqualTo(1);
    }
}
