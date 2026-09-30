package com.vju.club.integration;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.springframework.mock.web.MockHttpServletResponse;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

/** Framework-level errors must keep their real status and never degrade into 500s. */
class ErrorHandlingApiTest extends ApiIntegrationTest {

    @Test
    void unknownRouteIs404ForAuthenticatedCaller() throws Exception {
        problem(get("/api/v1/does-not-exist"), adminToken, null, 404, "NOT_FOUND");
        problem(get("/api/v1/clubs/" + clubA + "/nope"), adminToken, null, 404, "NOT_FOUND");
    }

    @Test
    void unknownRouteIs401ForAnonymousCaller() throws Exception {
        problem(get("/api/v1/does-not-exist"), null, null, 401, "UNAUTHORIZED");
    }

    @Test
    void unsupportedMethodIs405() throws Exception {
        problem(delete("/api/v1/clubs"), adminToken, null, 405, "METHOD_NOT_ALLOWED");
        problem(put("/api/v1/clubs/" + clubA), adminToken, Map.of("name", "x"), 405, "METHOD_NOT_ALLOWED");
    }

    @Test
    void wrongContentTypeIs415() throws Exception {
        MockHttpServletResponse response = send(post("/api/v1/clubs").contentType("text/plain").content("code=A"),
                adminToken, null);
        assertThat(response.getStatus()).isEqualTo(415);
        assertThat(json.readTree(response.getContentAsString()).path("code").asText()).isEqualTo("UNSUPPORTED_MEDIA_TYPE");
    }

    @Test
    void malformedJsonMissingBodyAndUnknownFieldsAre400() throws Exception {
        problem(post("/api/v1/clubs").contentType("application/json").content("{not json"), adminToken, null,
                400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs").contentType("application/json"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "X", "name", "X", "hacker", true),
                400, "VALIDATION_ERROR");
    }

    @Test
    void invalidEnumAndUuidAre400() throws Exception {
        problem(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "DELETED"),
                400, "VALIDATION_ERROR");
        problem(get("/api/v1/clubs/not-a-uuid"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/departments/123/members"), adminToken, null, 400, "VALIDATION_ERROR");
    }

    @Test
    void bodyValidationNamesTheOffendingFields() throws Exception {
        var node = problem(post("/api/v1/clubs"), adminToken, Map.of("code", " ", "name", "x".repeat(201)),
                400, "VALIDATION_ERROR");
        assertThat(node.path("detail").asText()).contains("code").contains("name");
    }

    @ParameterizedTest(name = "{0}?offset={1}&limit={2} -> {3}")
    @CsvSource({
            "/api/v1/users, 0, 0, 400",
            "/api/v1/users, 0, 101, 400",
            "/api/v1/users, -1, 20, 400",
            "/api/v1/users, 0, 100, 200",
            "/api/v1/clubs, 0, 0, 400",
            "/api/v1/clubs, -5, 10, 400",
            "/api/v1/clubs, 0, 1, 200",
            "/api/v1/clubs, 999, 100, 200",
    })
    void paginationBoundsFollowTheContract(String path, String offset, String limit, int status) throws Exception {
        MockHttpServletResponse response = send(get(path).param("offset", offset).param("limit", limit), adminToken, null);
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(status);
        if (status == 400) {
            assertThat(json.readTree(response.getContentAsString()).path("code").asText()).isEqualTo("VALIDATION_ERROR");
        }
    }

    @Test
    void nestedCollectionsValidatePaginationToo() throws Exception {
        problem(get("/api/v1/clubs/" + clubA + "/departments").param("limit", "500"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/clubs/" + clubA + "/memberships").param("offset", "-1"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/departments/" + depA1 + "/members").param("limit", "0"), adminToken, null, 400, "VALIDATION_ERROR");
    }

    @Test
    void nonNumericPaginationIs400() throws Exception {
        problem(get("/api/v1/clubs").param("limit", "ten"), adminToken, null, 400, "VALIDATION_ERROR");
    }

    @Test
    void errorsUseProblemJsonContentType() throws Exception {
        MockHttpServletResponse notFound = send(get("/api/v1/clubs/" + java.util.UUID.randomUUID()), adminToken, null);
        assertThat(notFound.getContentType()).startsWith("application/problem+json");
        MockHttpServletResponse unauthorized = send(get("/api/v1/clubs"), null, null);
        assertThat(unauthorized.getContentType()).startsWith("application/problem+json");
    }
}
