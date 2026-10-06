package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class PhaseTwoAcceptanceTest extends ApiIntegrationTest {

    @Test
    void studentApplicationReviewMembershipDepartmentAndAuditFlow() throws Exception {
        UUID student = user("phase2-student@test.local");
        String studentToken = token(student);
        grant(member, "application.approve", "CLUB", clubA, null);
        grant(member, "member.view", "CLUB", clubA, null);
        grant(member, "department.member.add", "DEPARTMENT", null, depA1);
        grant(member, "department.member.view", "DEPARTMENT", null, depA1);

        call(get("/api/v1/clubs/" + clubA), studentToken, null, 200);
        JsonNode application = call(post("/api/v1/clubs/" + clubA + "/applications"), studentToken,
                Map.of("message", "I want to contribute"), 201);
        problem(post("/api/v1/clubs/" + clubA + "/applications"), studentToken,
                Map.of("message", "again"), 409, "APPLICATION_ALREADY_PENDING");

        JsonNode approved = call(post("/api/v1/clubs/" + clubA + "/applications/" + id(application) + "/approve"),
                memberToken, Map.of("reviewNote", "Welcome"), 200);
        assertThat(approved.path("status").asText()).isEqualTo("APPROVED");

        JsonNode memberships = call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
        UUID membershipId = UUID.fromString(memberships.at("/items/0/id").asText());
        call(post("/api/v1/departments/" + depA1 + "/members"), memberToken,
                Map.of("membershipId", membershipId), 201);
        JsonNode departmentMembers = call(get("/api/v1/departments/" + depA1 + "/members"), memberToken, null, 200);
        assertThat(departmentMembers.path("items").toString()).contains(student.toString());

        JsonNode audit = call(get("/api/v1/audit-logs").param("resourceType", "APPLICATION"), adminToken, null, 200);
        assertThat(audit.path("items").toString()).contains("CLUB_APPLICATION_APPROVED");
    }
}
