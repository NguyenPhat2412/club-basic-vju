package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.auth.JwtTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwsHeader;

import java.time.Instant;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AuthApiTest extends ApiIntegrationTest {

    private Map<String, Object> registration(String email, String studentCode) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("fullName", "New User");
        if (studentCode != null) body.put("studentCode", studentCode);
        return body;
    }

    private JsonNode login(String email, String password) throws Exception {
        return call(post("/api/v1/auth/login"), null, Map.of("email", email, "password", password), 200);
    }

    private String jwt(String issuer, String subject, Instant expiresAt) {
        JwtClaimsSet claims = JwtClaimsSet.builder().issuer(issuer).subject(subject)
                .issuedAt(expiresAt.minusSeconds(900)).expiresAt(expiresAt).build();
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims)).getTokenValue();
    }

    // ---- registration ---------------------------------------------------------------------------

    @Test
    void registerNormalizesEmailAndNeverExposesPasswordHash() throws Exception {
        problem(post("/api/v1/auth/register"), null, registration("  padded@test.local ", null), 400, "VALIDATION_ERROR");
        JsonNode created = call(post("/api/v1/auth/register"), null, registration("New.User@Test.Local", "SV01"), 201);
        assertThat(created.path("email").asText()).isEqualTo("new.user@test.local");
        assertThat(created.path("studentCode").asText()).isEqualTo("SV01");
        assertThat(created.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(created.has("passwordHash")).isFalse();
        assertThat(created.toString()).doesNotContain(PASSWORD);
    }

    @Test
    void duplicateEmailIsConflictRegardlessOfCase() throws Exception {
        call(post("/api/v1/auth/register"), null, registration("dup@test.local", null), 201);
        problem(post("/api/v1/auth/register"), null, registration("DUP@Test.Local", null), 409, "EMAIL_ALREADY_EXISTS");
    }

    @Test
    void duplicateStudentCodeIsConflictNotServerError() throws Exception {
        call(post("/api/v1/auth/register"), null, registration("a@test.local", "SV-42"), 201);
        problem(post("/api/v1/auth/register"), null, registration("b@test.local", "SV-42"), 409, "STUDENT_CODE_ALREADY_EXISTS");
        problem(post("/api/v1/auth/register"), null, registration("c@test.local", " SV-42 "), 409, "STUDENT_CODE_ALREADY_EXISTS");
    }

    @Test
    void manyUsersMayOmitStudentCode() throws Exception {
        call(post("/api/v1/auth/register"), null, registration("x@test.local", null), 201);
        call(post("/api/v1/auth/register"), null, registration("y@test.local", "  "), 201);
        call(post("/api/v1/auth/register"), null, registration("z@test.local", ""), 201);
        assertThat(count("SELECT count(*) FROM users WHERE student_code IS NULL")).isGreaterThanOrEqualTo(3);
    }

    @Test
    void registrationValidation() throws Exception {
        problem(post("/api/v1/auth/register"), null, Map.of("email", "not-an-email", "password", PASSWORD, "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, Map.of("email", "s@test.local", "password", "short", "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, Map.of("email", "l@test.local", "password", "p".repeat(129), "fullName", "X"),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, Map.of("email", "f@test.local", "password", PASSWORD, "fullName", "   "),
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/register"), null, Map.of("email", "f@test.local", "password", PASSWORD),
                400, "VALIDATION_ERROR");
        assertThat(count("SELECT count(*) FROM users")).isEqualTo(2);
    }

    @Test
    void concurrentRegistrationsOfOneEmailCreateExactlyOneUser() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/auth/register"), null, registration("race@test.local", null)).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM users WHERE email = 'race@test.local'")).isEqualTo(1);
    }

    @Test
    void concurrentRegistrationsOfOneStudentCodeNeverFailWith500() throws Exception {
        int[] n = {0};
        List<Integer> statuses = concurrently(8, () -> {
            String email = "sc" + (n[0]++) + "@test.local";
            return () -> send(post("/api/v1/auth/register"), null, registration(email, "SAME-CODE")).getStatus();
        });
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    // ---- login ----------------------------------------------------------------------------------

    @Test
    void loginIsCaseInsensitiveAndReturnsUsableTokens() throws Exception {
        JsonNode login = login("MEMBER@test.local", PASSWORD);
        assertThat(login.at("/user/id").asText()).isEqualTo(member.toString());
        String access = login.at("/tokens/accessToken").asText();
        assertThat(call(get("/api/v1/auth/me"), access, null, 200).path("email").asText()).isEqualTo("member@test.local");
        assertThat(Instant.parse(login.at("/tokens/accessTokenExpiresAt").asText())).isAfter(Instant.now());
        assertThat(Instant.parse(login.at("/tokens/refreshTokenExpiresAt").asText()))
                .isAfter(Instant.parse(login.at("/tokens/accessTokenExpiresAt").asText()));
    }

    @Test
    void wrongPasswordAndUnknownEmailLookIdentical() throws Exception {
        JsonNode wrong = problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", "nope-nope"),
                401, "INVALID_CREDENTIALS");
        JsonNode unknown = problem(post("/api/v1/auth/login"), null, Map.of("email", "ghost@test.local", "password", "nope-nope"),
                401, "INVALID_CREDENTIALS");
        assertThat(wrong).isEqualTo(unknown);
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

    // ---- refresh tokens -------------------------------------------------------------------------

    @Test
    void refreshRotatesTokensAndOldOneBecomesUseless() throws Exception {
        String refresh = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        JsonNode renewed = call(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 200);
        String next = renewed.at("/tokens/refreshToken").asText();
        assertThat(next).isNotEqualTo(refresh);
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 401, "INVALID_REFRESH_TOKEN");
        call(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", next), 200);
    }

    @Test
    void concurrentRefreshOfOneTokenHasExactlyOneWinner() throws Exception {
        String refresh = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        List<Integer> statuses = concurrently(10, () -> () ->
                send(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh)).getStatus());
        assertThat(statuses).containsOnly(200, 401);
        assertThat(statuses).filteredOn(s -> s == 200).hasSize(1);
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", member)).isEqualTo(1);
    }

    @Test
    void expiredRefreshTokenIsRejected() throws Exception {
        String refresh = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        db.update("UPDATE refresh_tokens SET expires_at = now() - interval '1 minute' WHERE token_hash = ?", tokens.hash(refresh));
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 401, "INVALID_REFRESH_TOKEN");
    }

    @Test
    void deactivatedUserCannotRefresh() throws Exception {
        String refresh = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        call(org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch("/api/v1/users/" + member + "/status"),
                adminToken, Map.of("status", "INACTIVE"), 200);
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", refresh), 401, "INVALID_REFRESH_TOKEN");
    }

    @Test
    void garbageOrMissingRefreshTokenIsRejected() throws Exception {
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", "garbage"), 401, "INVALID_REFRESH_TOKEN");
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", ""), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/auth/refresh-token"), null, Map.of(), 400, "VALIDATION_ERROR");
    }

    @Test
    void refreshTokensAreStoredOnlyAsHashes() throws Exception {
        String refresh = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE token_hash = ?", refresh)).isZero();
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE token_hash = ?", tokens.hash(refresh))).isEqualTo(1);
    }

    // ---- logout & password ----------------------------------------------------------------------

    @Test
    void logoutIsIdempotentAndOnlyRevokesTheGivenSession() throws Exception {
        JsonNode first = login("member@test.local", PASSWORD);
        JsonNode second = login("member@test.local", PASSWORD);
        String access = first.at("/tokens/accessToken").asText();
        String firstRefresh = first.at("/tokens/refreshToken").asText();
        call(post("/api/v1/auth/logout"), access, Map.of("refreshToken", firstRefresh), 204);
        call(post("/api/v1/auth/logout"), access, Map.of("refreshToken", firstRefresh), 204);
        call(post("/api/v1/auth/logout"), access, Map.of("refreshToken", "unknown"), 204);
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", firstRefresh), 401, "INVALID_REFRESH_TOKEN");
        call(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", second.at("/tokens/refreshToken").asText()), 200);
    }

    @Test
    void logoutRequiresAuthentication() throws Exception {
        problem(post("/api/v1/auth/logout"), null, Map.of("refreshToken", "x"), 401, "UNAUTHORIZED");
    }

    @Test
    void changingPasswordEndsEverySession() throws Exception {
        String r1 = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        String r2 = login("member@test.local", PASSWORD).at("/tokens/refreshToken").asText();
        call(post("/api/v1/auth/change-password"), memberToken,
                Map.of("currentPassword", PASSWORD, "newPassword", "BrandNew123!"), 204);
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", r1), 401, "INVALID_REFRESH_TOKEN");
        problem(post("/api/v1/auth/refresh-token"), null, Map.of("refreshToken", r2), 401, "INVALID_REFRESH_TOKEN");
        assertThat(count("SELECT count(*) FROM refresh_tokens WHERE user_id = ? AND revoked_at IS NULL", member)).isZero();
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

    // ---- access tokens --------------------------------------------------------------------------

    @Test
    void accessTokensFromOtherIssuersOrExpiredAreRejected() throws Exception {
        problem(get("/api/v1/auth/me"), jwt("evil-issuer", member.toString(), Instant.now().plusSeconds(600)),
                null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), jwt(JwtTokenService.ISSUER, member.toString(), Instant.now().minusSeconds(120)),
                null, 401, "AUTH_TOKEN_EXPIRED");
        call(get("/api/v1/auth/me"), jwt(JwtTokenService.ISSUER, member.toString(), Instant.now().plusSeconds(600)), null, 200);
    }

    @Test
    void tamperedOrMalformedTokensAreRejected() throws Exception {
        String valid = memberToken;
        String tampered = valid.substring(0, valid.length() - 3) + (valid.endsWith("AAA") ? "BBB" : "AAA");
        problem(get("/api/v1/auth/me"), tampered, null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), "not.a.jwt", null, 401, "UNAUTHORIZED");
        problem(get("/api/v1/auth/me"), null, null, 401, "UNAUTHORIZED");
    }

    @Test
    void tokenWithNonUuidSubjectGetsProblemBody() throws Exception {
        problem(get("/api/v1/auth/me"), jwt(JwtTokenService.ISSUER, "not-a-uuid", Instant.now().plusSeconds(600)),
                null, 401, "UNAUTHORIZED");
    }

    @Test
    void tokenForDeletedOrDeactivatedUserIsRefused() throws Exception {
        problem(get("/api/v1/auth/me"), token(UUID.randomUUID()), null, 403, "ACCOUNT_INACTIVE");
        db.update("UPDATE users SET status = 'INACTIVE' WHERE id = ?", member);
        problem(get("/api/v1/users/me"), memberToken, null, 403, "ACCOUNT_INACTIVE");
    }

    @Test
    void publicEndpointsNeedNoToken() throws Exception {
        call(get("/api/v1/api-catalog"), null, null, 200);
        assertThat(send(get("/api-docs/phase1.yaml"), null, null).getStatus()).isEqualTo(200);
    }
}
