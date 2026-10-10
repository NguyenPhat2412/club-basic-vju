package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AuthApiTest extends ApiIntegrationTest {

    @org.springframework.beans.factory.annotation.Autowired
    org.springframework.security.web.csrf.CsrfTokenRepository csrfTokenRepository;
    private Map<String, Object> registration(String email, String studentCode) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("fullName", "New User");
        if (studentCode != null) body.put("studentCode", studentCode);
        return body;
    }

    private int sessionsOf(UUID userId) {
        return count("SELECT count(*) FROM spring_session WHERE principal_name = ?", userId.toString());
    }

    @Test
    void selfRegistrationNoLongerExists() throws Exception {
        Map<String, Object> body = registration("self@test.local", null);
        problem(post("/api/v1/auth/register"), null, body, 401, "UNAUTHORIZED");
        problem(post("/api/v1/auth/register"), memberToken, body, 404, "NOT_FOUND");
        assertThat(count("SELECT count(*) FROM users WHERE email = 'self@test.local'")).isZero();
    }

    @Test
    void onlyHoldersOfUserCreateCanCreateAccounts() throws Exception {
        Map<String, Object> body = registration("by-member@test.local", null);
        problem(post("/api/v1/users"), null, body, 401, "UNAUTHORIZED");
        problem(post("/api/v1/users"), memberToken, body, 403, "PERMISSION_DENIED");
        grant(member, "user.create", "GLOBAL", null, null);
        call(post("/api/v1/users"), memberToken, body, 201);
        assertThat(db.queryForList("SELECT p.permission_key FROM role_permissions rp JOIN roles r ON r.id = rp.role_id "
                + "JOIN permissions p ON p.id = rp.permission_id WHERE r.code = 'SYSTEM_ADMIN'", String.class)).contains("user.create");
    }

    @Test
    void forgottenPasswordIsResetByAnAdminAndOldSessionsEnd() throws Exception {
        String oldSession = login("member@test.local", PASSWORD);
        call(get("/api/v1/auth/me"), oldSession, null, 200);
        Map<String, Object> body = Map.of("newPassword", "BrandNew123!");

        problem(patch("/api/v1/users/" + member + "/password"), memberToken, body, 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/users/" + member + "/password"), adminToken, Map.of("newPassword", "short"), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/users/" + UUID.randomUUID() + "/password"), adminToken, body, 404, "USER_NOT_FOUND");
        call(patch("/api/v1/users/" + member + "/password"), adminToken, body, 204);

        problem(get("/api/v1/auth/me"), oldSession, null, 401, "UNAUTHORIZED");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", PASSWORD), 401, "INVALID_CREDENTIALS");
        call(get("/api/v1/auth/me"), login("member@test.local", "BrandNew123!"), null, 200);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_PASSWORD_RESET' AND resource_id = ?", member)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT new_value FROM audit_logs WHERE action = 'USER_PASSWORD_RESET'", String.class))
                .doesNotContain("BrandNew123!");
    }

    @Test
    void accountCreatedByAdminCanSignInRightAway() throws Exception {
        call(post("/api/v1/users"), adminToken, registration("ready@test.local", null), 201);
        call(post("/api/v1/auth/login"), null, Map.of("email", "ready@test.local", "password", PASSWORD), 200);
    }

    @Test
    void createdAccountNormalizesEmailAndNeverExposesPasswordHash() throws Exception {
        problem(post("/api/v1/users"), adminToken, registration("  padded@test.local ", null), 400, "VALIDATION_ERROR");
        JsonNode created = call(post("/api/v1/users"), adminToken, registration("New.User@Test.Local", "SV01"), 201);
        assertThat(created.path("email").asText()).isEqualTo("new.user@test.local");
        assertThat(created.path("studentCode").asText()).isEqualTo("SV01");
        assertThat(created.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(created.has("passwordHash")).isFalse();
        assertThat(created.toString()).doesNotContain(PASSWORD);
    }

    @Test
    void duplicateEmailIsConflictRegardlessOfCase() throws Exception {
        call(post("/api/v1/users"), adminToken, registration("dup@test.local", null), 201);
        problem(post("/api/v1/users"), adminToken, registration("DUP@Test.Local", null), 409, "EMAIL_ALREADY_EXISTS");
    }

    @Test
    void duplicateStudentCodeIsConflictNotServerError() throws Exception {
        call(post("/api/v1/users"), adminToken, registration("a@test.local", "SV-42"), 201);
        problem(post("/api/v1/users"), adminToken, registration("b@test.local", "SV-42"), 409, "STUDENT_CODE_ALREADY_EXISTS");
        problem(post("/api/v1/users"), adminToken, registration("c@test.local", " SV-42 "), 409, "STUDENT_CODE_ALREADY_EXISTS");
    }

    @Test
    void manyUsersMayOmitStudentCode() throws Exception {
        call(post("/api/v1/users"), adminToken, registration("x@test.local", null), 201);
        call(post("/api/v1/users"), adminToken, registration("y@test.local", "  "), 201);
        call(post("/api/v1/users"), adminToken, registration("z@test.local", ""), 201);
        assertThat(count("SELECT count(*) FROM users WHERE student_code IS NULL")).isGreaterThanOrEqualTo(3);
    }

    @Test
    void registrationValidation() throws Exception {
        problem(post("/api/v1/users"), adminToken, Map.of("email", "not-an-email", "password", PASSWORD, "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/users"), adminToken, Map.of("email", "s@test.local", "password", "short", "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/users"), adminToken, Map.of("email", "l@test.local", "password", "p".repeat(129), "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/users"), adminToken, Map.of("email", "f@test.local", "password", PASSWORD, "fullName", "   "),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/users"), adminToken, Map.of("email", "f@test.local", "password", PASSWORD),
                400, "VALIDATION_ERROR");
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(2);
    }

    @Test
    void concurrentRegistrationsOfOneEmailCreateExactlyOneUser() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/users"), adminToken, registration("race@test.local", null)).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM users WHERE email = 'race@test.local'")).isEqualTo(1);
    }

    @Test
    void concurrentRegistrationsOfOneStudentCodeNeverFailWith500() throws Exception {
        int[] n = {0};
        List<Integer> statuses = concurrently(8, () -> {
            String email = "sc" + (n[0]++) + "@test.local";
            return () -> send(post("/api/v1/users"), adminToken, registration(email, "SAME-CODE")).getStatus();
        });
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    @Test
    void loginIsCaseInsensitiveAndStartsAnHttpOnlySession() throws Exception {
        int before = sessionsOf(member);
        MockHttpServletResponse response = send(post("/api/v1/auth/login"), null,
                Map.of("email", "MEMBER@test.local", "password", PASSWORD));
        assertThat(response.getStatus()).isEqualTo(200);
        JsonNode body = json.readTree(response.getContentAsString());
        assertThat(body.at("/user/id").asText()).isEqualTo(member.toString());
        assertThat(body.has("tokens")).isFalse();

        String setCookie = response.getHeaders("Set-Cookie").stream()
                .filter(header -> header.startsWith(TestSessions.COOKIE + "=")).findFirst().orElseThrow();
        assertThat(setCookie).contains("HttpOnly").contains("SameSite=Lax").contains("Path=/");
        String session = TestSessions.fromResponse(response);
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("email").asText()).isEqualTo("member@test.local");
        assertThat(sessionsOf(member)).isEqualTo(before + 1);
    }

    @Test
    void sessionLivesOnlyInTheDatabaseNotInTheResponseBody() throws Exception {
        MockHttpServletResponse response = send(post("/api/v1/auth/login"), null,
                Map.of("email", "member@test.local", "password", PASSWORD));
        String session = TestSessions.fromResponse(response);
        String sessionId = new String(java.util.Base64.getDecoder().decode(session));
        assertThat(response.getContentAsString()).doesNotContain(session).doesNotContain(sessionId);
        assertThat(count("SELECT count(*) FROM spring_session WHERE session_id = ?", sessionId)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT principal_name FROM spring_session WHERE session_id = ?", String.class, sessionId))
                .isEqualTo(member.toString());
    }

    @Test
    void loginAlwaysIssuesAFreshSessionId() throws Exception {
        String planted = memberToken;
        MockHttpServletResponse response = send(post("/api/v1/auth/login"), planted,
                Map.of("email", "member@test.local", "password", PASSWORD));
        String fresh = TestSessions.fromResponse(response);
        assertThat(fresh).isNotNull().isNotEqualTo(planted);
        problem(get("/api/v1/auth/me"), planted, null, 401, "UNAUTHORIZED");
        call(get("/api/v1/auth/me"), fresh, null, 200);
    }

    @Test
    void wrongPasswordAndUnknownEmailLookIdentical() throws Exception {
        int before = sessionsOf(member);
        JsonNode wrong = problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", "nope-nope"),
                401, "INVALID_CREDENTIALS");
        JsonNode unknown = problem(post("/api/v1/auth/login"), null, Map.of("email", "ghost@test.local", "password", "nope-nope"),
                401, "INVALID_CREDENTIALS");
        assertThat(wrong).isEqualTo(unknown);
        assertThat(sessionsOf(member)).isEqualTo(before);
    }

    @Test
    void inactiveAccountIsOnlyRevealedToItsOwner() throws Exception {
        user("sleepy@test.local", "INACTIVE");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "sleepy@test.local", "password", "wrong-password"),
                401, "INVALID_CREDENTIALS");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "sleepy@test.local", "password", PASSWORD),
                403, "ACCOUNT_INACTIVE");
    }

    @Test
    void loginValidation() throws Exception {
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/login"), null, Map.of(), 400, "VALIDATION_ERROR");
    }

    @Test
    void csrfEndpointHandsOutACookieTheFrontendCanRead() throws Exception {
        assertThat(mvc.perform(get("/api/v1/auth/csrf")).andReturn().getResponse().getStatus()).isEqualTo(204);
        var request = new org.springframework.mock.web.MockHttpServletRequest();
        MockHttpServletResponse response = new MockHttpServletResponse();
        csrfTokenRepository.saveToken(csrfTokenRepository.generateToken(request), request, response);
        Cookie cookie = response.getCookie("XSRF-TOKEN");
        assertThat(cookie).isNotNull();
        assertThat(cookie.isHttpOnly()).isFalse();
        assertThat(cookie.getValue()).isNotBlank();
        assertThat(cookie.getPath()).isEqualTo("/");
    }

    @Test
    void unsafeRequestsWithoutACsrfTokenAreRejected() throws Exception {
        var login = post("/api/v1/auth/login").contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", "member@test.local", "password", PASSWORD)));
        MockHttpServletResponse noToken = mvc.perform(login).andReturn().getResponse();
        assertThat(noToken.getStatus()).isEqualTo(403);
        assertThat(json.readTree(noToken.getContentAsString()).path("code").asText()).isEqualTo("CSRF_INVALID");

        var change = post("/api/v1/auth/change-password").cookie(new Cookie(TestSessions.COOKIE, memberToken))
                .header("X-XSRF-TOKEN", "forged").cookie(new Cookie("XSRF-TOKEN", "different"))
                .contentType("application/json")
                .content(json.writeValueAsString(Map.of("currentPassword", PASSWORD, "newPassword", "BrandNew123!")));
        MockHttpServletResponse forged = mvc.perform(change).andReturn().getResponse();
        assertThat(forged.getStatus()).isEqualTo(403);
        assertThat(json.readTree(forged.getContentAsString()).path("code").asText()).isEqualTo("CSRF_INVALID");
        assertThat(passwords.matches(PASSWORD,
                db.queryForObject("SELECT password_hash FROM users WHERE id = ?", String.class, member))).isTrue();
    }

    @Test
    void readsDoNotNeedACsrfToken() throws Exception {
        var me = get("/api/v1/auth/me").cookie(new Cookie(TestSessions.COOKIE, memberToken));
        assertThat(mvc.perform(me).andReturn().getResponse().getStatus()).isEqualTo(200);
    }

    @Test
    void logoutEndsOnlyThatSessionAndIsIdempotent() throws Exception {
        String first = login("member@test.local", PASSWORD);
        String second = login("member@test.local", PASSWORD);
        assertThat(sessionsOf(member)).isEqualTo(3);

        MockHttpServletResponse logout = send(post("/api/v1/auth/logout"), first, null);
        assertThat(logout.getStatus()).isEqualTo(204);
        assertThat(logout.getCookie(TestSessions.COOKIE).getMaxAge()).isZero();
        call(post("/api/v1/auth/logout"), first, null, 204);
        call(post("/api/v1/auth/logout"), null, null, 204);

        problem(get("/api/v1/auth/me"), first, null, 401, "UNAUTHORIZED");
        call(get("/api/v1/auth/me"), second, null, 200);
        assertThat(sessionsOf(member)).isEqualTo(2);
    }

    @Test
    void changingPasswordEndsEveryOtherSessionButKeepsTheCurrentOne() throws Exception {
        String current = login("member@test.local", PASSWORD);
        String other = login("member@test.local", PASSWORD);
        call(post("/api/v1/auth/change-password"), current,
                Map.of("currentPassword", PASSWORD, "newPassword", "BrandNew123!"), 204);
        call(get("/api/v1/auth/me"), current, null, 200);
        problem(get("/api/v1/auth/me"), other, null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), memberToken, null, 401, "UNAUTHORIZED");
        assertThat(sessionsOf(member)).isEqualTo(1);
        login("member@test.local", "BrandNew123!");
    }

    @Test
    void changePasswordValidation() throws Exception {
        problem(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", "wrong-one", "newPassword", "BrandNew123!"), 400, "CURRENT_PASSWORD_INVALID");
        problem(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", PASSWORD, "newPassword", "short"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/change-password"), null,
                Map.of("currentPassword", PASSWORD, "newPassword", "BrandNew123!"), 401, "UNAUTHORIZED");
    }

    @Test
    void unknownMalformedOrExpiredSessionsAreRejected() throws Exception {
        problem(get("/api/v1/auth/me"), TestSessions.cookieValue(UUID.randomUUID().toString()), null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), "not-base64!", null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), null, null, 401, "UNAUTHORIZED");

        String session = login("member@test.local", PASSWORD);
        db.update("UPDATE spring_session SET last_access_time = 0, expiry_time = 0 WHERE session_id = ?",
                new String(java.util.Base64.getDecoder().decode(session)));
        problem(get("/api/v1/auth/me"), session, null, 401, "UNAUTHORIZED");
    }

    @Test
    void expiredSessionsAreDeletedByTheCleanupJob() throws Exception {
        String expired = login("member@test.local", PASSWORD);
        db.update("UPDATE spring_session SET last_access_time = 0, expiry_time = 0 WHERE session_id = ?",
                new String(java.util.Base64.getDecoder().decode(expired)));
        sessions.cleanUpExpiredSessions();
        assertThat(sessionsOf(member)).isEqualTo(1);
    }

    @Test
    void sessionOfDeletedOrDeactivatedUserIsRefusedAndEnded() throws Exception {
        problem(get("/api/v1/auth/me"), token(UUID.randomUUID()), null, 403, "ACCOUNT_INACTIVE");
        db.update("UPDATE users SET status = 'INACTIVE' WHERE id = ?", member);
        problem(get("/api/v1/users/me"), memberToken, null, 403, "ACCOUNT_INACTIVE");
        assertThat(sessionsOf(member)).isZero();
    }

    @Test
    void deactivatingAUserEndsAllTheirSessions() throws Exception {
        login("member@test.local", PASSWORD);
        assertThat(sessionsOf(member)).isEqualTo(2);
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        assertThat(sessionsOf(member)).isZero();
        assertThat(sessionsOf(admin)).isEqualTo(1);
    }

    @Test
    void publicEndpointsNeedNoSession() throws Exception {
        call(get("/api/v1/api-catalog"), null, null, 200);
        assertThat(send(get("/api-docs/phase1.yaml"), null, null).getStatus()).isEqualTo(200);
    }

    @Test
    void anonymousRequestsDoNotCreateSessions() throws Exception {
        int before = count("SELECT count(*) FROM spring_session");
        send(get("/api/v1/clubs"), null, null);
        send(get("/api/v1/api-catalog"), null, null);
        send(get("/api/v1/auth/csrf"), null, null);
        assertThat(count("SELECT count(*) FROM spring_session")).isEqualTo(before);
    }
}
