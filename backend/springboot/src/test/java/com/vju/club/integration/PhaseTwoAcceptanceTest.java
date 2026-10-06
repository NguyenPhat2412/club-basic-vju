package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;

class PhaseTwoAcceptanceTest extends ApiIntegrationTest {

    @Test
    void studentApplicationReviewMembershipDepartmentAndAuditFlow() throws Exception {
        UUID student = user("phase2-student@test.local");
        String studentToken = token(student);
        db.update("UPDATE clubs SET code = 'VJUA', name = 'Club VJUA' WHERE id = ?", clubA);
        db.update("UPDATE departments SET name = 'Ban Truyền thông' WHERE id = ?", depA1);
        grant(member, "member.view", "CLUB", clubA, null);
        grant(member, "department.member.add", "DEPARTMENT", null, depA1);
        grant(member, "department.member.view", "DEPARTMENT", null, depA1);

        call(get("/api/v1/clubs/" + clubA), studentToken, null, 200);
        JsonNode application = call(post("/api/v1/clubs/" + clubA + "/applications"), studentToken,
                Map.of("message", "I want to contribute"), 201);
        assertThat(application.path("status").asText()).isEqualTo("PENDING");
        problem(post("/api/v1/clubs/" + clubA + "/applications"), studentToken,
                Map.of("message", "again"), 409, "APPLICATION_ALREADY_PENDING");

        problem(post("/api/v1/clubs/" + clubA + "/applications/" + id(application) + "/approve"),
                memberToken, Map.of(), 403, "PERMISSION_DENIED");
        grant(member, "application.approve", "CLUB", clubA, null);

        JsonNode approved = call(post("/api/v1/clubs/" + clubA + "/applications/" + id(application) + "/approve"),
                memberToken, Map.of("reviewNote", "Welcome"), 200);
        assertThat(approved.path("status").asText()).isEqualTo("APPROVED");

        JsonNode memberships = call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
        UUID membershipId = UUID.fromString(memberships.at("/items/0/id").asText());
        assertThat(memberships.at("/items/0/userId").asText()).isEqualTo(student.toString());
        assertThat(memberships.at("/items/0/status").asText()).isEqualTo("ACTIVE");
        assertThat(membershipId.toString()).isEqualTo(approved.path("membershipId").asText());
        JsonNode assignment = call(post("/api/v1/departments/" + depA1 + "/members"), memberToken,
                Map.of("membershipId", membershipId), 201);
        JsonNode departmentMembers = call(get("/api/v1/departments/" + depA1 + "/members"), memberToken, null, 200);
        assertThat(departmentMembers.path("items").toString()).contains(student.toString());

        JsonNode audit = call(get("/api/v1/audit-logs").param("resourceType", "APPLICATION"), adminToken, null, 200);
        assertThat(audit.path("items").toString()).contains("CLUB_APPLICATION_APPROVED");
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'CLUB_APPLICATION_APPROVED' "
                + "AND actor_user_id = ? AND resource_id = ? AND club_id = ?", member, id(application), clubA)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'DEPARTMENT_MEMBER_ADDED' "
                + "AND actor_user_id = ? AND resource_id = ? AND club_id = ?", member, id(assignment), clubA)).isEqualTo(1);

        JsonNode notifications = call(get("/api/v1/users/me/notifications"), studentToken, null, 200);
        assertThat(notifications.path("total").asInt()).isEqualTo(1);
        assertThat(notifications.at("/items/0/title").asText()).contains("duyệt");
        UUID notificationId = id(notifications.at("/items/0"));
        db.update("INSERT INTO notifications(user_id, title, message, created_at, updated_at) VALUES (?, 'Older result', 'older', now() - interval '2 minutes', now() - interval '2 minutes')", student);
        db.update("INSERT INTO notifications(user_id, title, message, created_at, updated_at) VALUES (?, 'Newest result', 'newest', now() + interval '1 minute', now() + interval '1 minute')", student);
        JsonNode offsetPage = call(get("/api/v1/users/me/notifications").param("offset", "1").param("limit", "2"), studentToken, null, 200);
        assertThat(offsetPage.path("total").asInt()).isEqualTo(3);
        assertThat(offsetPage.at("/items/0/title").asText()).contains("Đơn đăng ký được duyệt");
        call(patch("/api/v1/users/me/notifications/" + notificationId + "/read"), studentToken, null, 204);
        assertThat(db.queryForObject("SELECT read FROM notifications WHERE id = ?", Boolean.class, notificationId)).isTrue();
    }
}
