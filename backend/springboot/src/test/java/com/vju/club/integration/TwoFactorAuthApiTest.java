package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class TwoFactorAuthApiTest extends ApiIntegrationTest {
    private void assignRole(UUID userId, String roleCode, String scope, UUID clubId) {
        UUID roleId = db.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, roleCode);
        db.update("INSERT INTO user_roles(user_id, role_id, scope, club_id, granted_by) VALUES (?, ?, ?, ?, ?)",
                userId, roleId, scope, clubId, admin);
    }

    private void configureOtpSettings(int maxSendCount, int cooldownSeconds, int maxVerifyAttempts) throws Exception {
        call(put("/api/v1/system-settings"),
                adminToken,
                Map.of(
                        "maxPendingApplications", 3,
                        "reapplyCooldownDays", 7,
                        "maxActiveClubs", 0,
                        "otpExpiryMinutes", 5,
                        "otpMaxSendCount", maxSendCount,
                        "otpResendCooldownSeconds", cooldownSeconds,
                        "otpMaxVerifyAttempts", maxVerifyAttempts),
                200);
    }

    @Test
    void defaultLoginIsNonBlockingWhenTwoFactorIsDisabledEvenForTier1To3Admins() throws Exception {
        assignRole(admin, "SYSTEM_ADMIN", "GLOBAL", null);
        JsonNode adminMe = call(get("/api/v1/auth/me"), adminToken, null, 200);
        assertThat(adminMe.path("twoFactorEnabled").asBoolean()).isFalse();

        String session = login("admin@test.local", PASSWORD);
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("id").asText())
                .isEqualTo(admin.toString());
        assertThat(login("member@test.local", PASSWORD)).isNotBlank();
    }

    @Test
    void onlyTier1To3AdminsCanEnableTwoFactorViaUsersMeToggle() throws Exception {
        problem(patch("/api/v1/users/me/2fa"), null, Map.of("enabled", true), 401, "UNAUTHORIZED");
        problem(patch("/api/v1/users/me/2fa"), memberToken, Map.of("enabled", true),
                403, "TWO_FACTOR_ADMIN_ROLE_REQUIRED");

        assignRole(member, "CLUB_MEMBER", "CLUB", clubA);
        problem(patch("/api/v1/users/me/2fa"), memberToken, Map.of("enabled", true),
                403, "TWO_FACTOR_ADMIN_ROLE_REQUIRED");

        UUID president = user("president@test.local");
        assignRole(president, "CLUB_PRESIDENT", "CLUB", clubA);
        String presidentToken = token(president);

        JsonNode enabled = call(patch("/api/v1/users/me/2fa"), presidentToken, Map.of("enabled", true), 200);
        assertThat(enabled.path("twoFactorEnabled").asBoolean()).isTrue();

        problem(patch("/api/v1/users/me/2fa"), presidentToken, Map.of("enabled", false),
                403, "TWO_FACTOR_REQUIRED");
        problem(patch("/api/v1/users/me"), presidentToken,
                Map.of("fullName", "President", "twoFactorEnabled", false),
                403, "TWO_FACTOR_REQUIRED");

        db.update("""
                INSERT INTO security_otps (id, user_id, purpose, action_context, otp_hash, expires_at, attempts, max_attempts)
                VALUES (?, ?, 'CRITICAL_ACTION', 'DISABLE_2FA', ?, now() + interval '5 minutes', 0, 5)
                """, UUID.randomUUID(), president, passwords.encode("112233"));

        JsonNode disabled = call(patch("/api/v1/users/me/2fa"), presidentToken,
                Map.of("enabled", false, "otpCode", "112233"), 200);
        assertThat(disabled.path("twoFactorEnabled").asBoolean()).isFalse();
        assertThat(login("president@test.local", PASSWORD)).isNotBlank();
    }

    @Test
    void loginTwoFactorFlowTracksAttemptsLocksOutAndCompletesSignIn() throws Exception {
        UUID vicePresident = user("vp@test.local");
        assignRole(vicePresident, "CLUB_VICE_PRESIDENT", "CLUB", clubA);
        String vpToken = token(vicePresident);
        call(patch("/api/v1/users/me/2fa"), vpToken, Map.of("enabled", true), 200);

        int sessionsBefore = count("SELECT count(*) FROM spring_session WHERE principal_name = ?",
                vicePresident.toString());
        problem(post("/api/v1/auth/login"), null, Map.of("email", "vp@test.local", "password", PASSWORD),
                403, "TWO_FACTOR_REQUIRED");
        assertThat(count("SELECT count(*) FROM spring_session WHERE principal_name = ?", vicePresident.toString()))
                .isEqualTo(sessionsBefore);

        JsonNode policy = call(post("/api/v1/auth/2fa/send"), null,
                Map.of("purpose", "LOGIN_2FA", "email", "vp@test.local", "password", PASSWORD), 200);
        assertThat(policy.path("expirySeconds").asInt()).isEqualTo(300);
        assertThat(policy.path("resendCooldownSeconds").asInt()).isEqualTo(60);
        assertThat(policy.path("maxVerifyAttempts").asInt()).isEqualTo(5);
        assertThat(policy.path("purpose").asText()).isEqualTo("LOGIN_2FA");

        problem(post("/api/v1/auth/2fa/send"), null,
                Map.of("purpose", "LOGIN_2FA", "email", "vp@test.local", "password", PASSWORD),
                429, "OTP_COOLDOWN_ACTIVE");

        configureOtpSettings(5, 0, 2);
        call(post("/api/v1/auth/2fa/send"), null,
                Map.of("purpose", "LOGIN_2FA", "email", "vp@test.local", "password", PASSWORD), 200);

        problem(post("/api/v1/auth/2fa/verify"), null,
                Map.of("purpose", "LOGIN_2FA", "otp", "000000", "email", "vp@test.local", "password", PASSWORD),
                400, "OTP_INVALID");
        assertThat(db.queryForObject(
                "SELECT attempts FROM security_otps WHERE user_id = ? AND purpose = 'LOGIN_2FA' AND invalidated_at IS NULL ORDER BY created_at DESC LIMIT 1",
                Integer.class, vicePresident)).isEqualTo(1);

        problem(post("/api/v1/auth/2fa/verify"), null,
                Map.of("purpose", "LOGIN_2FA", "otp", "111111", "email", "vp@test.local", "password", PASSWORD),
                429, "OTP_MAX_ATTEMPTS_EXCEEDED");
        assertThat(db.queryForObject(
                "SELECT invalidated_at IS NOT NULL FROM security_otps WHERE user_id = ? AND purpose = 'LOGIN_2FA' ORDER BY created_at DESC LIMIT 1",
                Boolean.class, vicePresident)).isTrue();

        call(post("/api/v1/auth/2fa/send"), null,
                Map.of("purpose", "LOGIN_2FA", "email", "vp@test.local", "password", PASSWORD), 200);
        db.update("UPDATE security_otps SET otp_hash = ? WHERE user_id = ? AND purpose = 'LOGIN_2FA' AND invalidated_at IS NULL AND consumed_at IS NULL",
                passwords.encode("246810"), vicePresident);

        MockHttpServletResponse verifyRes = send(post("/api/v1/auth/2fa/verify"), null,
                Map.of("purpose", "LOGIN_2FA", "otp", "246810", "email", "vp@test.local", "password", PASSWORD));
        assertThat(verifyRes.getStatus()).isEqualTo(200);
        JsonNode verifiedBody = json.readTree(verifyRes.getContentAsString());
        assertThat(verifiedBody.at("/user/id").asText()).isEqualTo(vicePresident.toString());
        assertThat(verifiedBody.at("/user/twoFactorEnabled").asBoolean()).isTrue();

        String newSession = TestSessions.fromResponse(verifyRes);
        assertThat(newSession).isNotBlank();
        assertThat(call(get("/api/v1/auth/me"), newSession, null, 200).path("email").asText())
                .isEqualTo("vp@test.local");

        problem(post("/api/v1/auth/2fa/verify"), null,
                Map.of("purpose", "LOGIN_2FA", "otp", "246810", "email", "vp@test.local", "password", PASSWORD),
                400, "OTP_INVALID");
    }

    @Test
    void criticalActionOtpRequiresSessionAndExactActionContext() throws Exception {
        assignRole(admin, "SYSTEM_ADMIN", "GLOBAL", null);
        call(patch("/api/v1/users/me/2fa"), adminToken, Map.of("enabled", true), 200);

        String context = "EVENT_ATTENDANCE_LOCK:" + UUID.randomUUID();
        problem(post("/api/v1/auth/2fa/send"), null,
                Map.of("purpose", "CRITICAL_ACTION", "actionContext", context), 401, "UNAUTHORIZED");

        JsonNode sendRes = call(post("/api/v1/auth/2fa/send"), adminToken,
                Map.of("purpose", "CRITICAL_ACTION", "actionContext", context), 200);
        assertThat(sendRes.path("purpose").asText()).isEqualTo("CRITICAL_ACTION");
        assertThat(sendRes.path("actionContext").asText()).isEqualTo(context);

        db.update("UPDATE security_otps SET otp_hash = ? WHERE user_id = ? AND purpose = 'CRITICAL_ACTION' AND invalidated_at IS NULL AND consumed_at IS NULL",
                passwords.encode("135790"), admin);

        problem(post("/api/v1/auth/2fa/verify"), adminToken,
                Map.of("purpose", "CRITICAL_ACTION", "actionContext", "OTHER_CONTEXT", "otp", "135790"),
                400, "OTP_INVALID");

        JsonNode verified = call(post("/api/v1/auth/2fa/verify"), adminToken,
                Map.of("purpose", "CRITICAL_ACTION", "actionContext", context, "otp", "135790"), 200);
        assertThat(verified.path("userId").asText()).isEqualTo(admin.toString());
        assertThat(verified.path("purpose").asText()).isEqualTo("CRITICAL_ACTION");
        assertThat(verified.path("actionContext").asText()).isEqualTo(context);
        assertThat(count("SELECT count(*) FROM security_otps WHERE user_id = ? AND purpose = 'CRITICAL_ACTION' AND consumed_at IS NOT NULL",
                admin)).isEqualTo(1);
    }

    @Test
    void roleAndPermissionMutationsRequireCriticalActionOtpWhenTwoFactorEnabled() throws Exception {
        assignRole(admin, "SYSTEM_ADMIN", "GLOBAL", null);
        call(patch("/api/v1/users/me/2fa"), adminToken, Map.of("enabled", true), 200);

        UUID target = user("role-otp-target@st.vju.ac.vn");
        membership(target, clubA);
        UUID vpRoleId = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_VICE_PRESIDENT'", UUID.class);
        UUID permId = permission("event.view");

        // Without X-2FA-OTP header -> 403 TWO_FACTOR_REQUIRED
        problem(post("/api/v1/users/" + target + "/roles"), adminToken,
                Map.of("roleId", vpRoleId, "scope", "CLUB", "clubId", clubA),
                403, "TWO_FACTOR_REQUIRED");
        problem(post("/api/v1/users/" + target + "/permissions"), adminToken,
                Map.of("permissionId", permId, "scope", "CLUB", "clubId", clubA),
                403, "TWO_FACTOR_REQUIRED");
        problem(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", target, "roleId", vpRoleId),
                403, "TWO_FACTOR_REQUIRED");

        // Assign role with valid X-2FA-OTP
        seedRoleChangeOtp(admin, "314159");
        JsonNode assigned = call(post("/api/v1/users/" + target + "/roles")
                        .header("X-2FA-OTP", "314159"),
                adminToken,
                Map.of("roleId", vpRoleId, "scope", "CLUB", "clubId", clubA),
                201);
        UUID assignmentId = id(assigned);

        // Revoke role without OTP -> 403 TWO_FACTOR_REQUIRED, then with OTP -> 204
        problem(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/users/" + target + "/roles/" + assignmentId),
                adminToken, null, 403, "TWO_FACTOR_REQUIRED");
        seedRoleChangeOtp(admin, "271828");
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/users/" + target + "/roles/" + assignmentId)
                        .header("X-2FA-OTP", "271828"),
                adminToken, null, 204);

        // Grant & revoke permission with valid X-2FA-OTP
        seedRoleChangeOtp(admin, "424242");
        call(post("/api/v1/users/" + target + "/permissions").header("X-2FA-OTP", "424242"),
                adminToken,
                Map.of("permissionId", permId, "scope", "CLUB", "clubId", clubA),
                201);
        problem(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/users/" + target + "/permissions/" + permId)
                        .param("scope", "CLUB")
                        .param("clubId", clubA.toString()),
                adminToken, null, 403, "TWO_FACTOR_REQUIRED");
        seedRoleChangeOtp(admin, "535353");
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders
                        .delete("/api/v1/users/" + target + "/permissions/" + permId)
                        .param("scope", "CLUB")
                        .param("clubId", clubA.toString())
                        .header("X-2FA-OTP", "535353"),
                adminToken, null, 204);
    }

    @Test
    void creatingUserWithRolesRequiresSingleRoleChangeOtpAndSupportsMultiRole() throws Exception {
        assignRole(admin, "SYSTEM_ADMIN", "GLOBAL", null);
        call(patch("/api/v1/users/me/2fa"), adminToken, Map.of("enabled", true), 200);

        UUID presidentRoleId = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_PRESIDENT'", UUID.class);
        UUID vpRoleId = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_VICE_PRESIDENT'", UUID.class);

        List<Map<String, Object>> twoRoles = List.of(
                Map.of("roleId", presidentRoleId, "scope", "CLUB", "clubId", clubA),
                Map.of("roleId", vpRoleId, "scope", "CLUB", "clubId", clubB)
        );
        Map<String, Object> missingOtpPayload = Map.of(
                "email", "multi-role-missing@st.vju.ac.vn",
                "password", PASSWORD,
                "fullName", "Multi Role Missing OTP",
                "roles", twoRoles
        );

        problem(post("/api/v1/users"), adminToken, missingOtpPayload, 403, "TWO_FACTOR_REQUIRED");
        assertThat(count("SELECT count(*) FROM users WHERE email = ?", "multi-role-missing@st.vju.ac.vn")).isZero();

        seedRoleChangeOtp(admin, "654321");
        Map<String, Object> validPayload = Map.of(
                "email", "multi-role-ok@st.vju.ac.vn",
                "password", PASSWORD,
                "fullName", "Multi Role OK",
                "roles", twoRoles
        );
        JsonNode created = call(post("/api/v1/users").header("X-2FA-OTP", "654321"), adminToken, validPayload, 201);
        UUID createdId = id(created);
        assertThat(count("SELECT count(*) FROM user_roles WHERE user_id = ? AND revoked_at IS NULL", createdId))
                .isEqualTo(2);

        // Replaying the same single-use OTP must fail and roll back user creation
        Map<String, Object> replayPayload = Map.of(
                "email", "multi-role-replay@st.vju.ac.vn",
                "password", PASSWORD,
                "fullName", "Multi Role Replay",
                "roles", List.of(Map.of("roleId", presidentRoleId, "scope", "CLUB", "clubId", clubA))
        );
        problem(post("/api/v1/users").header("X-2FA-OTP", "654321"), adminToken, replayPayload, 400, "OTP_INVALID");
        assertThat(count("SELECT count(*) FROM users WHERE email = ?", "multi-role-replay@st.vju.ac.vn")).isZero();

        var preflight = mvc.perform(options("/api/v1/users")
                        .header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "content-type,x-xsrf-token,x-2fa-otp"))
                .andReturn().getResponse();
        assertThat(preflight.getStatus()).isEqualTo(200);
        assertThat(preflight.getHeader("Access-Control-Allow-Headers")).containsIgnoringCase("X-2FA-OTP");
    }

    private void seedRoleChangeOtp(UUID userId, String otp) {
        db.update("""
                INSERT INTO security_otps (id, user_id, purpose, action_context, otp_hash, expires_at, attempts, max_attempts)
                VALUES (?, ?, 'CRITICAL_ACTION', 'ROLE_CHANGE', ?, now() + interval '5 minutes', 0, 5)
                """, UUID.randomUUID(), userId, passwords.encode(otp));
    }
}
