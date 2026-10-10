package com.vju.club.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.HashMap;
import java.util.Map;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class RequestValidationApiTest extends ApiIntegrationTest {
    private Map<String, Object> registration(String email, String password) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", password);
        body.put("fullName", "Validation User");
        return body;
    }

    @Test
    void passwordMayUseTheFull72ByteBcryptLimitButNotMore() throws Exception {
        call(post("/api/v1/auth/register"), null, registration("p72@test.local", "x".repeat(72)), 201);
        problem(post("/api/v1/auth/register"), null, registration("p73@test.local", "x".repeat(73)), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, registration("p128@test.local", "x".repeat(128)), 400, "VALIDATION_ERROR");
    }

    @Test
    void passwordLimitCountsBytesSoLongAccentedPasswordsAreRejected() throws Exception {
        call(post("/api/v1/auth/register"), null, registration("vn-ok@test.local", "Mật khẩu tốt 123"), 201);
        problem(post("/api/v1/auth/register"), null, registration("vn-long@test.local", "ậ".repeat(30)), 400, "VALIDATION_ERROR");
    }

    @Test
    void changePasswordAppliesTheSamePasswordRule() throws Exception {
        problem(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", PASSWORD, "newPassword", "x".repeat(73)), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", PASSWORD, "newPassword", "short"), 400, "VALIDATION_ERROR");
        call(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", PASSWORD, "newPassword", "y".repeat(72)), 204);
    }

    @ParameterizedTest
    @ValueSource(strings = {"javascript:alert(1)", "data:text/html,<script>alert(1)</script>", "ftp://files.vju.local/a.png", "not a url"})
    void imageUrlsMustBeWebUrls(String url) throws Exception {
        problem(patch("/api/v1/users/me"), memberToken, Map.of("avatarUrl", url), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "URL1", "name", "n", "logoUrl", url), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("coverUrl", url), 400, "VALIDATION_ERROR");
    }

    @Test
    void webUrlsAndClearingStillWork() throws Exception {
        call(patch("/api/v1/users/me"), memberToken, Map.of("avatarUrl", "https://cdn.vju.local/a.png"), 200);
        call(patch("/api/v1/users/me"), memberToken, Map.of("avatarUrl", ""), 200);
        call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("logoUrl", "http://cdn.vju.local/logo.png"), 200);
    }

    @Test
    void phoneNumbersOnlyAllowPhoneCharacters() throws Exception {
        call(patch("/api/v1/users/me"), memberToken, Map.of("phone", "+84 (090) 123-4567"), 200);
        problem(patch("/api/v1/users/me"), memberToken, Map.of("phone", "<script>"), 400, "VALIDATION_ERROR");
        Map<String, Object> body = registration("phone@test.local", "Password123!");
        body.put("phone", "call me maybe");
        problem(post("/api/v1/auth/register"), null, body, 400, "VALIDATION_ERROR");
    }

    @Test
    void freeTextFieldsHaveUpperBounds() throws Exception {
        String long2001 = "d".repeat(2001);
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "LONG", "name", "n", "description", long2001), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("description", long2001), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs/" + clubA + "/departments"), adminToken, Map.of("name", "Long", "description", long2001), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/departments/" + depA1), adminToken, Map.of("description", long2001), 400, "VALIDATION_ERROR");
        call(patch("/api/v1/departments/" + depA1), adminToken, Map.of("description", "d".repeat(2000)), 200);

        Map<String, Object> grant = new HashMap<>(assignment("club.view", "GLOBAL", null, null));
        grant.put("reason", "r".repeat(1001));
        problem(post("/api/v1/users/" + member + "/permissions"), adminToken, grant, 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", "t".repeat(513)), 400, "VALIDATION_ERROR");
    }

    @Test
    void patchedClubCodeFollowsTheSameFormatAsCreation() throws Exception {
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "bad code!", "name", "n"), 400, "VALIDATION_ERROR");
        problem(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("code", "bad code!"), 400, "VALIDATION_ERROR");
        call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("code", "A-1.ok_2"), 200);
    }
}
