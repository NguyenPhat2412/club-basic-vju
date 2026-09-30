package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
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
        problem(get("/api/v1/users/me"), memberToken, null, 403, "ACCOUNT_INACTIVE");
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", PASSWORD), 403, "ACCOUNT_INACTIVE");
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
        call(get("/api/v1/users/me"), memberToken, null, 200);
        problem(patch("/api/v1/users/" + UUID.randomUUID() + "/status"), adminToken, Map.of("status", "ACTIVE"), 404, "USER_NOT_FOUND");
    }
}
