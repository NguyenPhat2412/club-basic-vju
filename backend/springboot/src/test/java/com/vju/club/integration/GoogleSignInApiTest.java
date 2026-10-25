package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import com.vju.club.error.ApiException;
import com.vju.club.security.GoogleIdTokenVerifier;
import com.vju.club.security.GoogleIdentity;
import jakarta.servlet.http.Cookie;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@TestPropertySource(properties = {"app.auth.google.client-id=club-web.apps.googleusercontent.com",
        "app.auth.google.allowed-domains=st.vju.ac.vn"})
class GoogleSignInApiTest extends ApiIntegrationTest {
    private static final String STUDENT = "an.nguyen@st.vju.ac.vn";

    @MockitoBean GoogleIdTokenVerifier verifier;

    private void google(String credential, String subject, String email, boolean verified, String hostedDomain) {
        when(verifier.verify(credential)).thenReturn(new GoogleIdentity(subject, email, verified, hostedDomain, null, null));
    }

    private MockHttpServletResponse signIn(String credential) throws Exception {
        return send(post("/api/v1/auth/google"), null, Map.of("credential", credential));
    }

    private void refused(String credential, int status, String code) throws Exception {
        MockHttpServletResponse response = signIn(credential);
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(status);
        assertThat(json.readTree(response.getContentAsString()).path("code").asText()).isEqualTo(code);
        assertThat(TestSessions.fromResponse(response)).isNull();
    }

    private Map<String, Object> newAccount(String email, String password, String studentCode) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("fullName", "Nguyen Van An");
        if (password != null) body.put("password", password);
        if (studentCode != null) body.put("studentCode", studentCode);
        return body;
    }

    @Test
    void loginPageLearnsTheClientIdWithoutSigningIn() throws Exception {
        JsonNode config = call(get("/api/v1/auth/google/config"), null, null, 200);
        assertThat(config.path("enabled").asBoolean()).isTrue();
        assertThat(config.path("clientId").asText()).isEqualTo("club-web.apps.googleusercontent.com");
        assertThat(config.path("allowedDomains").get(0).asText()).isEqualTo("st.vju.ac.vn");
    }

    @Test
    void anIssuedStudentSignsInWithTheSchoolGoogleAccount() throws Exception {
        UUID student = user(STUDENT);
        db.update("UPDATE users SET requires_password_change = true WHERE id = ?", student);
        google("good", "google-sub-1", "An.Nguyen@ST.vju.ac.vn", true, "st.vju.ac.vn");

        MockHttpServletResponse response = signIn("good");
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(200);
        assertThat(json.readTree(response.getContentAsString()).path("user").path("email").asText()).isEqualTo(STUDENT);
        String session = TestSessions.fromResponse(response);
        assertThat(session).isNotNull();
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("id").asText()).isEqualTo(student.toString());
        call(get("/api/v1/users/me/memberships"), session, null, 200);

        assertThat(db.queryForObject("SELECT google_subject FROM users WHERE id = ?", String.class, student)).isEqualTo("google-sub-1");
        assertThat(db.queryForObject("SELECT requires_password_change FROM users WHERE id = ?", Boolean.class, student)).isFalse();
        assertThat(db.queryForObject("SELECT new_value FROM audit_logs WHERE action = 'USER_LOGGED_IN' AND resource_id = ?",
                String.class, student)).contains("google");
    }

    @Test
    void aStudentSigningInForTheFirstTimeGetsAPlainAccount() throws Exception {
        when(verifier.verify("first")).thenReturn(new GoogleIdentity("google-sub-7", "23110209@st.vju.ac.vn", true,
                "st.vju.ac.vn", "Nguyễn Xuân Phát", "https://lh3.googleusercontent.com/a/photo"));
        MockHttpServletResponse response = signIn("first");
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(200);
        JsonNode me = call(get("/api/v1/auth/me"), TestSessions.fromResponse(response), null, 200);
        assertThat(me.path("email").asText()).isEqualTo("23110209@st.vju.ac.vn");
        assertThat(me.path("fullName").asText()).isEqualTo("Nguyễn Xuân Phát");
        assertThat(me.path("studentCode").asText()).isEqualTo("23110209");
        assertThat(me.path("avatarUrl").asText()).isEqualTo("https://lh3.googleusercontent.com/a/photo");
        assertThat(me.path("requiresPasswordChange").asBoolean()).isFalse();
        UUID id = UUID.fromString(me.path("id").asText());

        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ?", id)).isZero();
        assertThat(count("SELECT count(*) FROM user_roles WHERE user_id = ?", id)).isZero();
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ?", id)).isZero();
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'USER_CREATED' AND resource_id = ?", id)).isEqualTo(1);

        assertThat(signIn("first").getStatus()).isEqualTo(200);
        assertThat(count("SELECT count(*) FROM users WHERE email = '23110209@st.vju.ac.vn'")).isEqualTo(1);
    }

    @Test
    void theNewStudentCanBrowseClubsAndApply() throws Exception {
        google("first", "google-sub-8", "binh.tran@st.vju.ac.vn", true, "st.vju.ac.vn");
        String session = TestSessions.fromResponse(signIn("first"));
        assertThat(call(get("/api/v1/clubs"), session, null, 200).path("total").asInt()).isPositive();
        call(post("/api/v1/clubs/" + clubA + "/applications"), session, Map.of("message", "Em muốn tham gia CLB"), 201);
        assertThat(count("SELECT count(*) FROM memberships m JOIN users u ON u.id = m.user_id "
                + "WHERE u.email = 'binh.tran@st.vju.ac.vn'")).isZero();
        JsonNode created = call(get("/api/v1/auth/me"), session, null, 200);
        assertThat(created.path("studentCode").isNull()).isTrue();
        assertThat(created.path("fullName").asText()).isEqualTo("binh.tran");
    }

    @Test
    void aTakenStudentCodeIsNotCopiedFromTheEmail() throws Exception {
        db.update("UPDATE users SET student_code = '23110209' WHERE id = ?", member);
        google("first", "google-sub-9", "23110209@st.vju.ac.vn", true, "st.vju.ac.vn");
        String session = TestSessions.fromResponse(signIn("first"));
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("studentCode").isNull()).isTrue();
    }

    @Test
    void onlyVerifiedManagedAccountsOnTheSchoolDomainAreAccepted() throws Exception {
        user("member2@gmail.com");
        user(STUDENT);
        google("gmail", "s1", "member2@gmail.com", true, null);
        google("staff", "s2", "teacher@vju.ac.vn", true, "vju.ac.vn");
        google("unverified", "s3", STUDENT, false, "st.vju.ac.vn");
        google("consumer", "s4", STUDENT, true, null);
        google("lookalike", "s5", "an@st.vju.ac.vn.evil.com", true, "st.vju.ac.vn.evil.com");
        for (String credential : new String[] {"gmail", "staff", "unverified", "consumer", "lookalike"}) {
            refused(credential, 403, "GOOGLE_DOMAIN_NOT_ALLOWED");
        }
        assertThat(count("SELECT count(*) FROM users WHERE google_subject IS NOT NULL")).isZero();
    }

    @Test
    void aBoundAccountRejectsADifferentGoogleAccountWithTheSameAddress() throws Exception {
        user(STUDENT);
        google("first", "google-sub-1", STUDENT, true, "st.vju.ac.vn");
        google("second", "google-sub-2", STUDENT, true, "st.vju.ac.vn");
        assertThat(signIn("first").getStatus()).isEqualTo(200);
        refused("second", 403, "GOOGLE_ACCOUNT_MISMATCH");
        assertThat(signIn("first").getStatus()).isEqualTo(200);
    }

    @Test
    void lockedStudentsCannotSignIn() throws Exception {
        user(STUDENT, "INACTIVE");
        google("good", "google-sub-1", STUDENT, true, "st.vju.ac.vn");
        refused("good", 403, "ACCOUNT_INACTIVE");
    }

    @Test
    void forgedOrExpiredTokensAreRejected() throws Exception {
        when(verifier.verify(anyString())).thenThrow(new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_TOKEN_INVALID", "invalid"));
        refused("forged", 401, "GOOGLE_TOKEN_INVALID");
        problem(post("/api/v1/auth/google"), null, Map.of("credential", " "), 400, "VALIDATION_ERROR");
    }

    @Test
    void googleSignInNeedsTheCsrfToken() throws Exception {
        user(STUDENT);
        google("good", "google-sub-1", STUDENT, true, "st.vju.ac.vn");
        var request = post("/api/v1/auth/google").contentType("application/json")
                .content(json.writeValueAsString(Map.of("credential", "good")));
        MockHttpServletResponse response = mvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).isEqualTo(403);
        assertThat(json.readTree(response.getContentAsString()).path("code").asText()).isEqualTo("CSRF_INVALID");
    }

    @Test
    void schoolAddressesCannotUseThePasswordForm() throws Exception {
        user(STUDENT);
        problem(post("/api/v1/auth/login"), null, Map.of("email", STUDENT, "password", PASSWORD), 403, "GOOGLE_SIGN_IN_REQUIRED");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "nobody@st.vju.ac.vn", "password", "whatever1"), 403,
                "GOOGLE_SIGN_IN_REQUIRED");
        assertThat(login("admin@test.local", PASSWORD)).isNotNull();
    }

    @Test
    void adminIssuesStudentAccountsWithoutAPassword() throws Exception {
        JsonNode created = call(post("/api/v1/users"), adminToken, newAccount(STUDENT, null, "23110209"), 201);
        assertThat(created.path("requiresPasswordChange").asBoolean()).isFalse();
        google("good", "google-sub-1", STUDENT, true, "st.vju.ac.vn");
        assertThat(signIn("good").getStatus()).isEqualTo(200);

        JsonNode withPassword = call(post("/api/v1/users"), adminToken, newAccount("binh@st.vju.ac.vn", "Password123!", null), 201);
        assertThat(withPassword.path("requiresPasswordChange").asBoolean()).isFalse();
        problem(post("/api/v1/auth/login"), null, Map.of("email", "binh@st.vju.ac.vn", "password", "Password123!"), 403,
                "GOOGLE_SIGN_IN_REQUIRED");
    }

    @Test
    void otherAccountsStillNeedAPasswordAndStudentsNeedASchoolAddress() throws Exception {
        problem(post("/api/v1/users"), adminToken, newAccount("teacher@vju.ac.vn", null, null), 400, "PASSWORD_REQUIRED");
        call(post("/api/v1/users"), adminToken, newAccount("teacher@vju.ac.vn", "Password123!", null), 201);
        problem(post("/api/v1/users"), adminToken, newAccount("student@gmail.com", "Password123!", "23110001"), 400,
                "STUDENT_EMAIL_DOMAIN_REQUIRED");
        assertThat(count("SELECT count(*) FROM users WHERE email = 'student@gmail.com'")).isZero();

        problem(patch("/api/v1/users/" + member), adminToken, Map.of("studentCode", "23110002"), 400,
                "STUDENT_EMAIL_DOMAIN_REQUIRED");
        call(patch("/api/v1/users/" + member), adminToken, Map.of("fullName", "Still fine"), 200);
    }

    @Test
    void passwordsOfGoogleAccountsCannotBeReset() throws Exception {
        UUID student = user(STUDENT);
        problem(patch("/api/v1/users/" + student + "/password"), adminToken, Map.of("newPassword", "Password456!"), 409,
                "PASSWORD_NOT_USED");
        call(patch("/api/v1/users/" + member + "/password"), adminToken, Map.of("newPassword", "Password456!"), 204);
    }

    @Test
    void signingInWithGoogleRotatesTheSession() throws Exception {
        user(STUDENT);
        google("good", "google-sub-1", STUDENT, true, "st.vju.ac.vn");
        var request = post("/api/v1/auth/google").cookie(new Cookie(TestSessions.COOKIE, memberToken));
        MockHttpServletResponse response = send(request, null, Map.of("credential", "good"));
        assertThat(response.getStatus()).isEqualTo(200);
        String session = TestSessions.fromResponse(response);
        assertThat(session).isNotEqualTo(memberToken);
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("email").asText()).isEqualTo(STUDENT);
    }
}
