package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class DepartmentApiTest extends ApiIntegrationTest {

    @Test
    void createTrimsNameAndRejectsDuplicatesIgnoringCase() throws Exception {
        JsonNode created = call(post("/api/v1/clubs/" + clubA + "/departments"), adminToken, Map.of("name", "  Media  "), 201);
        assertThat(created.path("name").asText()).isEqualTo("Media");
        assertThat(created.path("clubId").asText()).isEqualTo(clubA.toString());
        problem(post("/api/v1/clubs/" + clubA + "/departments"), adminToken, Map.of("name", "MEDIA"), 409,
                "DEPARTMENT_NAME_ALREADY_EXISTS");
        call(post("/api/v1/clubs/" + clubB + "/departments"), adminToken, Map.of("name", "Media"), 201);
    }

    @Test
    void concurrentCreatesOfOneNameYieldOneDepartment() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/clubs/" + clubA + "/departments"), adminToken, Map.of("name", "Race")).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    @Test
    void cannotCreateDepartmentInInactiveOrMissingClub() throws Exception {
        UUID closed = club("CLOSED", "INACTIVE");
        problem(post("/api/v1/clubs/" + closed + "/departments"), adminToken, Map.of("name", "X"), 409, "CLUB_INACTIVE");
        problem(post("/api/v1/clubs/" + UUID.randomUUID() + "/departments"), adminToken, Map.of("name", "X"), 404, "CLUB_NOT_FOUND");
    }

    @Test
    void renameRules() throws Exception {
        problem(patch("/api/v1/departments/" + depA1), adminToken, Map.of("name", "a2"), 409, "DEPARTMENT_NAME_ALREADY_EXISTS");
        call(patch("/api/v1/departments/" + depA1), adminToken, Map.of("name", "a1"), 200);
        call(patch("/api/v1/departments/" + depA1), adminToken, Map.of("name", "B1"), 200);
        problem(patch("/api/v1/departments/" + depA1), adminToken, Map.of("name", "  "), 400, "INVALID_DEPARTMENT_NAME");
        JsonNode described = call(patch("/api/v1/departments/" + depA1), adminToken, Map.of("description", "Desc"), 200);
        assertThat(described.path("name").asText()).isEqualTo("B1");
    }

    @Test
    void listIsPagedSortedAndScopedToTheClub() throws Exception {
        for (String name : List.of("Z", "C", "M")) department(clubA, name);
        JsonNode page = call(get("/api/v1/clubs/" + clubA + "/departments").param("limit", "2").param("offset", "1"),
                adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(5);
        assertThat(page.path("items").size()).isEqualTo(2);
        assertThat(page.at("/items/0/name").asText()).isEqualTo("A2");
        assertThat(page.at("/items/1/name").asText()).isEqualTo("C");
    }

    @Test
    void listOfMissingClubIs404() throws Exception {
        problem(get("/api/v1/clubs/" + UUID.randomUUID() + "/departments"), adminToken, null, 404, "CLUB_NOT_FOUND");
    }

    @Test
    void clubLevelGrantOfDepartmentPermissionCoversEveryDepartmentOfThatClub() throws Exception {
        call(post("/api/v1/users/" + member + "/permissions"), adminToken,
                assignment("department.update", "CLUB", clubA, null), 201);
        call(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "ok"), 200);
        call(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "ok"), 200);
        problem(patch("/api/v1/departments/" + depB1), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
    }

    @Test
    void departmentLevelGrantStaysInsideItsDepartment() throws Exception {
        grant(member, "department.update", "DEPARTMENT", null, depA1);
        call(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "ok"), 200);
        problem(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
    }

    @Test
    void clubViewerCanReadDepartmentsOfTheirClubOnly() throws Exception {
        grant(member, "department.view", "CLUB", clubA, null);
        call(get("/api/v1/clubs/" + clubA + "/departments"), memberToken, null, 200);
        call(get("/api/v1/departments/" + depA1), memberToken, null, 200);
        problem(get("/api/v1/departments/" + depB1), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get("/api/v1/clubs/" + clubB + "/departments"), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void missingDepartmentIs404OnlyForGlobalHolders() throws Exception {
        UUID ghost = UUID.randomUUID();
        problem(get("/api/v1/departments/" + ghost), adminToken, null, 404, "DEPARTMENT_NOT_FOUND");
        problem(patch("/api/v1/departments/" + ghost), adminToken, Map.of("name", "x"), 404, "DEPARTMENT_NOT_FOUND");
        grant(member, "department.view", "CLUB", clubA, null);
        problem(get("/api/v1/departments/" + ghost), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void statusTransitionsNeedTheMatchingPermission() throws Exception {
        grant(member, "department.inactive", "CLUB", clubA, null);
        call(patch("/api/v1/departments/" + depA2 + "/status"), memberToken, Map.of("status", "INACTIVE"), 200);
        problem(patch("/api/v1/departments/" + depA2 + "/status"), memberToken, Map.of("status", "ACTIVE"), 403, "PERMISSION_DENIED");
        grant(member, "department.activate", "DEPARTMENT", null, depA2);
        call(patch("/api/v1/departments/" + depA2 + "/status"), memberToken, Map.of("status", "ACTIVE"), 200);
    }
}
