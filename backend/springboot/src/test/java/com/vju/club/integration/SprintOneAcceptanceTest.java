package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.auth.JwtTokenService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Instant;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.stream.Stream;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Acceptance checks for the Sprint 1 backend "Definition of Done". Each test names the checklist
 * item it proves, using this system's actual routes (under /api/v1).
 */
@DisplayName("Sprint 1 – Definition of Done")
class SprintOneAcceptanceTest extends ApiIntegrationTest {

    private String login(String email, String password) throws Exception {
        return call(post("/api/v1/auth/login"), null, Map.of("email", email, "password", password), 200)
                .at("/tokens/accessToken").asText();
    }

    // ---- Checklist 18: the five mandatory API flows -------------------------------------------

    @Test
    @DisplayName("Test 1: Register → Login → GET /me")
    void test1RegisterLoginMe() throws Exception {
        call(post("/api/v1/auth/register"), null,
                Map.of("email", "flow1@vju.local", "password", PASSWORD, "fullName", "Flow One"), 201);
        String token = login("flow1@vju.local", PASSWORD);
        JsonNode me = call(get("/api/v1/auth/me"), token, null, 200);
        assertThat(me.path("email").asText()).isEqualTo("flow1@vju.local");
        assertThat(call(get("/api/v1/users/me"), token, null, 200).path("fullName").asText()).isEqualTo("Flow One");
    }

    @Test
    @DisplayName("Test 2–4: không có club.update → 403; cấp quyền → 200; thu hồi → 403")
    void test2to4GrantAndRevokeClubUpdate() throws Exception {
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "No"), 403, "PERMISSION_DENIED");

        call(post("/api/v1/users/" + member + "/permissions"), adminToken,
                assignment("club.update", "CLUB", clubA, null), 201);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "Yes"), 200);

        call(delete("/api/v1/users/" + member + "/permissions/" + permission("club.update")), adminToken, null, 204);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "No again"), 403, "PERMISSION_DENIED");
    }

    @Test
    @DisplayName("Test 5: member.update scope CLUB_A → sửa member CLUB_A thành công, CLUB_B → 403")
    void test5MemberUpdateIsScopedToOneClub() throws Exception {
        UUID inA = membership(user("a@vju.local"), clubA);
        UUID inB = membership(user("b@vju.local"), clubB);
        call(post("/api/v1/users/" + member + "/permissions"), adminToken,
                assignment("member.update", "CLUB", clubA, null), 201);

        call(patch("/api/v1/memberships/" + inA), memberToken, Map.of("status", "SUSPENDED"), 200);
        problem(patch("/api/v1/memberships/" + inB), memberToken, Map.of("status", "SUSPENDED"), 403, "PERMISSION_DENIED");
        assertThat(db.queryForObject("SELECT status FROM memberships WHERE id = ?", String.class, inB)).isEqualTo("ACTIVE");
    }

    // ---- Checklist 1, 19: authentication & security --------------------------------------------

    @Test
    @DisplayName("Mật khẩu được hash (BCrypt), không lưu plain text")
    void passwordsAreHashed() throws Exception {
        call(post("/api/v1/auth/register"), null,
                Map.of("email", "hash@vju.local", "password", PASSWORD, "fullName", "Hash"), 201);
        String stored = db.queryForObject("SELECT password_hash FROM users WHERE email = 'hash@vju.local'", String.class);
        assertThat(stored).startsWith("$2").doesNotContain(PASSWORD);
    }

    @Test
    @DisplayName("Token hết hạn → 401 AUTH_TOKEN_EXPIRED; sai chữ ký / không có token → 401 UNAUTHORIZED")
    void invalidTokensAreRejected() throws Exception {
        JwtClaimsSet expired = JwtClaimsSet.builder().issuer(JwtTokenService.ISSUER).subject(member.toString())
                .issuedAt(Instant.now().minusSeconds(1000)).expiresAt(Instant.now().minusSeconds(60)).build();
        String expiredToken = encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), expired))
                .getTokenValue();
        problem(get("/api/v1/auth/me"), expiredToken, null, 401, "AUTH_TOKEN_EXPIRED");
        problem(get("/api/v1/auth/me"), memberToken + "x", null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), null, null, 401, "UNAUTHORIZED");
    }

    @Test
    @DisplayName("Tài khoản bị khoá không đăng nhập được và mất quyền truy cập ngay")
    void lockedAccountCannotLogIn() throws Exception {
        String before = login("member@test.local", PASSWORD);
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", PASSWORD),
                403, "ACCOUNT_INACTIVE");
        problem(get("/api/v1/auth/me"), before, null, 403, "ACCOUNT_INACTIVE");
    }

    @Test
    @DisplayName("Refresh token xoay vòng; logout vô hiệu refresh token")
    void refreshAndLogout() throws Exception {
        JsonNode login = call(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", PASSWORD), 200);
        String refresh = login.at("/tokens/refreshToken").asText();
        String next = call(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 200)
                .at("/tokens/refreshToken").asText();
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 401, "INVALID_REFRESH_TOKEN");
        call(post("/api/v1/auth/logout"), login.at("/tokens/accessToken").asText(), Map.of("refreshToken", next), 204);
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", next), 401, "INVALID_REFRESH_TOKEN");
    }

    @Test
    @DisplayName("Security headers cơ bản có trên response API")
    void securityHeaders() throws Exception {
        MockHttpServletResponse response = send(get("/api/v1/users/me"), memberToken, null);
        assertThat(response.getHeader("X-Content-Type-Options")).isEqualTo("nosniff");
        assertThat(response.getHeader("X-Frame-Options")).isEqualTo("DENY");
        assertThat(response.getHeader("Cache-Control")).contains("no-store");
    }

    @Test
    @DisplayName("SQL injection qua tham số tìm kiếm/sắp xếp không có tác dụng")
    void sqlInjectionIsHarmless() throws Exception {
        assertThat(call(get("/api/v1/users").param("query", "' OR '1'='1"), adminToken, null, 200).path("total").asInt()).isZero();
        problem(get("/api/v1/users").param("orderBy", "email; DROP TABLE users"), adminToken, null, 400, "INVALID_SORT");
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(2);
    }

    // ---- Checklist 3–6: permission catalog, grants, scopes ----------------------------------------

    @Test
    @DisplayName("Permission catalog có 20–30 quyền, nhóm được theo module")
    void permissionCatalog() throws Exception {
        JsonNode catalog = call(get("/api/v1/permissions"), adminToken, null, 200);
        assertThat(catalog.size()).isBetween(20, 30);
        Set<String> modules = new HashSet<>();
        catalog.forEach(p -> modules.add(p.path("module").asText()));
        assertThat(modules).contains("user", "club", "department", "member", "department.member", "permission");
    }

    @Test
    @DisplayName("Scope DEPARTMENT: quyền ở ban A1 không dùng được ở ban A2")
    void departmentScope() throws Exception {
        call(post("/api/v1/users/" + member + "/permissions"), adminToken,
                assignment("department.update", "DEPARTMENT", null, depA1), 201);
        call(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "ok"), 200);
        problem(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
    }

    @Test
    @DisplayName("Scope GLOBAL: quyền global áp dụng cho mọi CLB")
    void globalScope() throws Exception {
        call(post("/api/v1/users/" + member + "/permissions"), adminToken,
                assignment("club.update", "GLOBAL", null, null), 201);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "a"), 200);
        call(patch("/api/v1/clubs/" + clubB), memberToken, Map.of("description", "b"), 200);
    }

    @Test
    @DisplayName("Audit: truy được ai cấp, quyền gì, cho ai, CLB nào, lúc nào")
    void permissionChangesAreAudited() throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(assignment("member.update", "CLUB", clubA, null));
        body.put("reason", "Bầu làm phó chủ nhiệm");
        call(post("/api/v1/users/" + member + "/permissions"), adminToken, body, 201);
        call(delete("/api/v1/users/" + member + "/permissions/" + permission("member.update")), adminToken, null, 204);

        List<Map<String, Object>> rows = db.queryForList(
                "SELECT a.action, a.actor_user_id, a.target_user_id, p.permission_key, a.club_id, a.created_at, a.reason "
                        + "FROM permission_audit_logs a JOIN permissions p ON p.id = a.permission_id "
                        + "WHERE a.target_user_id = ? ORDER BY a.action", member);
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(r -> r.get("action")).containsExactly("GRANT", "REVOKE");
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.get("actor_user_id")).isEqualTo(admin);
            assertThat(r.get("permission_key")).isEqualTo("member.update");
            assertThat(r.get("club_id")).isEqualTo(clubA);
            assertThat(r.get("created_at")).isNotNull();
        });
        assertThat(rows.get(0).get("reason")).isEqualTo("Bầu làm phó chủ nhiệm");
    }

    @Test
    @DisplayName("Không hard-code chức vụ: code Java không kiểm tra President/Head/Member")
    void noHardCodedPositions() throws IOException {
        try (Stream<Path> files = Files.walk(Path.of("src/main/java"))) {
            // bootstrap/ only seeds demo data (it names roles to assign them); no decision may depend on a role name.
            List<String> offenders = files.filter(f -> f.toString().endsWith(".java"))
                    .filter(f -> !f.toString().contains("/bootstrap/")).filter(f -> {
                try {
                    String code = Files.readString(f);
                    return code.contains("PRESIDENT") || code.contains("DEPARTMENT_HEAD") || code.contains("CLUB_MEMBER");
                } catch (IOException e) {
                    throw new RuntimeException(e);
                }
            }).map(Path::toString).toList();
            assertThat(offenders).isEmpty();
        }
    }

    // ---- Checklist 7–10: club, department, membership, department member -------------------------

    @Test
    @DisplayName("Luồng nghiệp vụ: tạo CLB → ban → thành viên → xếp vào ban")
    void coreBusinessFlow() throws Exception {
        UUID club = id(call(post("/api/v1/clubs"), adminToken, Map.of("code", "VJUA", "name", "VJU Academic"), 201));
        UUID dept = id(call(post("/api/v1/clubs/" + club + "/departments"), adminToken, Map.of("name", "Ban Truyền thông"), 201));
        UUID membership = id(call(post("/api/v1/clubs/" + club + "/memberships"), adminToken, Map.of("userId", member), 201));
        call(post("/api/v1/departments/" + dept + "/members"), adminToken, Map.of("membershipId", membership), 201);

        JsonNode members = call(get("/api/v1/departments/" + dept + "/members"), adminToken, null, 200);
        assertThat(members.path("total").asInt()).isEqualTo(1);
        call(patch("/api/v1/clubs/" + club + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        call(patch("/api/v1/departments/" + dept + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        call(delete("/api/v1/memberships/" + membership), adminToken, null, 204);
    }

    // ---- Checklist 13: validation ------------------------------------------------------------------

    @Test
    @DisplayName("Validation: email, trùng email, trùng mã CLB, membership trùng, tham chiếu không tồn tại")
    void validationRules() throws Exception {
        problem(post("/api/v1/auth/register"), null, Map.of("email", "bad", "password", PASSWORD, "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, Map.of("email", "MEMBER@test.local", "password", PASSWORD, "fullName", "X"),
                409, "EMAIL_ALREADY_EXISTS");
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "a", "name", "Dup"), 409, "CLUB_CODE_ALREADY_EXISTS");
        call(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 201);
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 409,
                "MEMBERSHIP_ALREADY_EXISTS");
        problem(post("/api/v1/clubs/" + UUID.randomUUID() + "/departments"), adminToken, Map.of("name", "X"), 404, "CLUB_NOT_FOUND");
        problem(post("/api/v1/departments/" + depA1 + "/members"), adminToken, Map.of("membershipId", UUID.randomUUID()),
                404, "MEMBERSHIP_NOT_FOUND");
        problem(post("/api/v1/users/" + member + "/permissions"), adminToken,
                Map.of("permissionId", UUID.randomUUID(), "scope", "GLOBAL"), 404, "PERMISSION_NOT_FOUND");
    }

    // ---- Checklist 14: unified errors ----------------------------------------------------------------

    @Test
    @DisplayName("Lỗi thống nhất: mọi lỗi có status + code + mô tả")
    void unifiedErrors() throws Exception {
        for (JsonNode error : List.of(
                problem(get("/api/v1/users"), memberToken, null, 403, "PERMISSION_DENIED"),
                problem(get("/api/v1/clubs/" + UUID.randomUUID()), adminToken, null, 404, "CLUB_NOT_FOUND"),
                problem(post("/api/v1/clubs"), adminToken, Map.of("code", ""), 400, "VALIDATION_ERROR"))) {
            assertThat(error.has("status")).isTrue();
            assertThat(error.has("code")).isTrue();
            assertThat(error.path("detail").asText()).isNotBlank();
        }
    }

    // ---- Checklist 15: API documentation -------------------------------------------------------------

    @Test
    @DisplayName("Swagger/OpenAPI: đủ module, có bearer auth, contract ghi quyền cần có")
    void apiDocumentation() throws Exception {
        JsonNode docs = call(get("/v3/api-docs"), null, null, 200);
        Set<String> paths = new HashSet<>();
        docs.path("paths").fieldNames().forEachRemaining(paths::add);
        for (String prefix : List.of("/api/v1/auth/", "/api/v1/users", "/api/v1/clubs", "/api/v1/departments/",
                "/api/v1/memberships/", "/api/v1/permissions", "/api/v1/roles")) {
            assertThat(paths).as(prefix).anyMatch(p -> p.startsWith(prefix));
        }
        assertThat(docs.at("/components/securitySchemes/bearerAuth/type").asText()).isEqualTo("http");

        String contract = send(get("/api-docs/phase1.yaml"), null, null).getContentAsString();
        assertThat(contract).contains("x-permission: club.update", "x-permission: member.update",
                "x-permission: permission.assign");
    }
}
