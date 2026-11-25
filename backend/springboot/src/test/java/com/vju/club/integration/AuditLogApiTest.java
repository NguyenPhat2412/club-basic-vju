package com.vju.club.integration;

import com.vju.club.entity.Club;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AuditLogApiTest extends ApiIntegrationTest {
    private JsonNode logs(String... params) throws Exception {
        var request = get("/api/v1/audit-logs").param("limit", "100");
        for (int i = 0; i < params.length; i += 2) request.param(params[i], params[i + 1]);
        return call(request, adminToken, null, 200);
    }

    private List<String> actions(JsonNode page) {
        List<String> actions = new ArrayList<>();
        page.path("items").forEach(item -> actions.add(item.path("action").asText()));
        return actions;
    }

    @Test
    void clubLifecycleIsAuditedWithBeforeAndAfterValues() throws Exception {
        UUID club = id(call(post("/api/v1/clubs"), adminToken, Map.of("code", "AUD", "name", "Audit Club"), 201));
        call(patch("/api/v1/clubs/" + club), adminToken, Map.of("name", "Audited Club"), 200);
        call(patch("/api/v1/clubs/" + club + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);

        JsonNode page = logs("resourceType", "CLUB", "resourceId", club.toString());
        assertThat(actions(page)).containsExactly("CLUB_DEACTIVATED", "CLUB_UPDATED", "CLUB_CREATED");
        JsonNode update = page.path("items").get(1);
        assertThat(update.at("/oldValue/name").asText()).isEqualTo("Audit Club");
        assertThat(update.at("/newValue/name").asText()).isEqualTo("Audited Club");
        assertThat(update.path("oldValue").has("code")).as("only changed fields are recorded").isFalse();
        assertThat(update.path("actorUserId").asText()).isEqualTo(admin.toString());
        assertThat(update.path("clubId").asText()).isEqualTo(club.toString());
        assertThat(page.path("items").get(0).at("/newValue/status").asText()).isEqualTo("INACTIVE");
        assertThat(page.path("items").get(2).path("oldValue").isNull()).isTrue();
    }

    @Test
    void noOpUpdateWritesNoAuditRow() throws Exception {
        call(patch("/api/v1/clubs/" + clubA), adminToken, Map.of("name", "Club A"), 200);
        call(patch("/api/v1/clubs/" + clubA + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
        assertThat(logs("resourceId", clubA.toString()).path("total").asInt()).isZero();
    }

    @Test
    void userLockAndUnlockAreAudited() throws Exception {
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        call(patch("/api/v1/users/" + member + "/status"), adminToken, Map.of("status", "ACTIVE"), 200);
        JsonNode page = logs("resourceType", "USER", "resourceId", member.toString());
        assertThat(actions(page)).containsExactly("USER_UNLOCKED", "USER_LOCKED");
        assertThat(page.at("/items/1/oldValue/status").asText()).isEqualTo("ACTIVE");
        assertThat(page.at("/items/1/newValue/status").asText()).isEqualTo("INACTIVE");
    }

    @Test
    void membershipAndDepartmentMemberChangesAreAuditedPerClub() throws Exception {
        UUID membershipId = id(call(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 201));
        call(post("/api/v1/departments/" + depA1 + "/members"), adminToken, Map.of("membershipId", membershipId), 201);
        call(patch("/api/v1/departments/" + depA1 + "/members/" + membershipId), adminToken,
                Map.of("targetDepartmentId", depA2), 200);
        call(delete("/api/v1/memberships/" + membershipId), adminToken, null, 204);

        JsonNode page = logs("clubId", clubA.toString());
        assertThat(actions(page)).containsExactly("MEMBER_REMOVED", "DEPARTMENT_MEMBER_MOVED",
                "DEPARTMENT_MEMBER_ADDED", "MEMBER_ADDED");
        assertThat(page.at("/items/1/oldValue/departmentId").asText()).isEqualTo(depA1.toString());
        assertThat(page.at("/items/1/newValue/departmentId").asText()).isEqualTo(depA2.toString());
        assertThat(logs("clubId", clubB.toString()).path("total").asInt()).isZero();
    }

    @Test
    void permissionAndRoleChangesAreAuditedWithTheirTarget() throws Exception {
        Map<String, Object> grant = new java.util.HashMap<>(assignment("club.update", "CLUB", clubA, null));
        grant.put("reason", "Chủ nhiệm mới");
        UUID grantId = id(call(post("/api/v1/users/" + member + "/permissions"), adminToken, grant, 201));
        call(delete("/api/v1/users/" + member + "/permissions/" + permission("club.update")), adminToken, null, 204);
        UUID roleId = db.queryForObject("SELECT id FROM roles WHERE code = 'CLUB_MEMBER'", UUID.class);
        UUID assignment = id(call(post("/api/v1/users/" + member + "/roles"), adminToken,
                Map.of("roleId", roleId, "scope", "CLUB", "clubId", clubA), 201));

        JsonNode grants = logs("resourceType", "PERMISSION_GRANT", "resourceId", grantId.toString());
        assertThat(actions(grants)).containsExactly("PERMISSION_REVOKED", "PERMISSION_GRANTED");
        JsonNode granted = grants.path("items").get(1);
        assertThat(granted.at("/newValue/userId").asText()).isEqualTo(member.toString());
        assertThat(granted.at("/newValue/permissionKey").asText()).isEqualTo("club.update");
        assertThat(granted.at("/newValue/reason").asText()).isEqualTo("Chủ nhiệm mới");
        assertThat(granted.path("clubId").asText()).isEqualTo(clubA.toString());

        JsonNode roles = logs("action", "ROLE_ASSIGNED");
        assertThat(roles.path("total").asInt()).isEqualTo(1);
        assertThat(roles.at("/items/0/resourceId").asText()).isEqualTo(assignment.toString());
        assertThat(roles.at("/items/0/newValue/roleCode").asText()).isEqualTo("CLUB_MEMBER");
    }

    @Test
    void accountCreationIsAuditedAsTheAdminAndPasswordChangeAsTheUser() throws Exception {
        UUID created = id(call(post("/api/v1/users"), adminToken,
                Map.of("email", "new@vju.local", "password", PASSWORD, "fullName", "New"), 201));
        JsonNode page = logs("resourceId", created.toString());
        assertThat(actions(page)).containsExactly("USER_CREATED");
        assertThat(page.at("/items/0/actorUserId").asText()).isEqualTo(admin.toString());
        assertThat(page.at("/items/0/newValue").toString()).doesNotContain(PASSWORD);

        call(post("/api/v1/auth/change-password"), memberToken, Map.of("currentPassword", PASSWORD, "newPassword", "Changed123!"), 204);
        JsonNode changed = logs("action", "USER_PASSWORD_CHANGED");
        assertThat(changed.at("/items/0/actorUserId").asText()).isEqualTo(member.toString());
        assertThat(changed.toString()).doesNotContain("Changed123!").doesNotContain(PASSWORD);
    }

    @Test
    void failedActionsLeaveNoAuditRow() throws Exception {
        problem(post("/api/v1/clubs"), adminToken, Map.of("code", "a", "name", "dup"), 409, "CLUB_CODE_ALREADY_EXISTS");
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "x"), 403, "PERMISSION_DENIED");
        assertThat(logs().path("total").asInt()).isZero();
    }

    @Test
    void readingTheLogRequiresAuditViewAndValidFilters() throws Exception {
        problem(get("/api/v1/audit-logs"), memberToken, null, 403, "PERMISSION_DENIED");
        grant(member, "audit.view", "GLOBAL", null, null);
        call(get("/api/v1/audit-logs"), memberToken, null, 200);
        problem(get("/api/v1/audit-logs").param("resourceType", "SPACESHIP"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/audit-logs").param("action", "HACKED"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/audit-logs").param("limit", "101"), adminToken, null, 400, "VALIDATION_ERROR");
        problem(get("/api/v1/audit-logs").param("clubId", "nope"), adminToken, null, 400, "VALIDATION_ERROR");
    }

    @Test
    void logIsPagedNewestFirst() throws Exception {
        for (int i = 0; i < 5; i++) call(post("/api/v1/clubs"), adminToken, Map.of("code", "P" + i, "name", "P" + i), 201);
        JsonNode page = call(get("/api/v1/audit-logs").param("offset", "1").param("limit", "2"), adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(5);
        assertThat(page.path("items").size()).isEqualTo(2);
        assertThat(page.at("/items/0/newValue/code").asText()).isEqualTo("P3");
    }

    @Test
    void auditRowsAreAppendOnlyInTheDatabase() throws Exception {
        call(post("/api/v1/clubs"), adminToken, Map.of("code", "IMM", "name", "Immutable"), 201);
        assertThatThrownBy(() -> db.update("UPDATE audit_logs SET action = 'CLUB_UPDATED'"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_audit_logs_append_only");
        assertThatThrownBy(() -> db.update("DELETE FROM audit_logs"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_audit_logs_append_only");
        assertThatThrownBy(() -> db.update("INSERT INTO audit_logs(action, resource_type, resource_id, new_value) "
                + "VALUES ('X', 'CLUB', ?, 'not json')", clubA))
                .isInstanceOf(org.springframework.dao.DataAccessException.class);
    }

    @Test
    void auditLogsCaptureFirstHopIpAndSanitizedUserAgentWithTruncation() throws Exception {
        String longAgent = "  VJU-Client/2.0 " + "A".repeat(600) + "  ";
        UUID firstClub = id(call(
                post("/api/v1/clubs")
                        .header("X-Forwarded-For", "203.0.113.9, 10.0.0.1")
                        .header("User-Agent", longAgent),
                adminToken,
                Map.of("code", "IP1", "name", "IP Club 1"),
                201));

        var mockReq = new org.springframework.mock.web.MockHttpServletRequest();
        mockReq.addHeader("X-Forwarded-For", "203.0.113.9, 10.0.0.1");
        mockReq.addHeader("User-Agent", "VJU-Client/2.0\r\n " + "A".repeat(600));
        var extracted = com.vju.club.security.RequestMetadataExtractor.extract(mockReq);
        assertThat(extracted.ipAddress()).isEqualTo("203.0.113.9");
        assertThat(extracted.userAgent()).hasSize(512).doesNotContain("\r").doesNotContain("\n").startsWith("VJU-Client/2.0 ");

        String longIp = "198.51.100." + "1".repeat(80);
        UUID secondClub = id(call(
                post("/api/v1/clubs")
                        .header("X-Forwarded-For", longIp)
                        .header("User-Agent", "TestAgent/1.0"),
                adminToken,
                Map.of("code", "IP2", "name", "IP Club 2"),
                201));

        UUID thirdClub = id(call(
                post("/api/v1/clubs")
                        .header("X-Forwarded-For", "unknown, 198.51.100.2")
                        .with(req -> {
                            req.setRemoteAddr("192.0.2.44");
                            return req;
                        }),
                adminToken,
                Map.of("code", "IP3", "name", "IP Club 3"),
                201));

        UUID fourthClub = id(call(
                post("/api/v1/clubs")
                        .header("X-Forwarded-For", "unknown, UNKNOWN")
                        .with(req -> {
                            req.setRemoteAddr("192.0.2.44");
                            return req;
                        }),
                adminToken,
                Map.of("code", "IP4", "name", "IP Club 4"),
                201));

        JsonNode firstLog = logs("resourceId", firstClub.toString()).path("items").get(0);
        assertThat(firstLog.path("ipAddress").asText()).isEqualTo("203.0.113.9");
        assertThat(firstLog.path("userAgent").asText()).hasSize(512);
        assertThat(firstLog.path("userAgent").asText()).doesNotContain("\r").doesNotContain("\n");
        assertThat(firstLog.path("userAgent").asText()).startsWith("VJU-Client/2.0 ");

        JsonNode secondLog = logs("resourceId", secondClub.toString()).path("items").get(0);
        assertThat(secondLog.path("ipAddress").asText()).hasSize(64);
        assertThat(secondLog.path("userAgent").asText()).isEqualTo("TestAgent/1.0");

        JsonNode thirdLog = logs("resourceId", thirdClub.toString()).path("items").get(0);
        assertThat(thirdLog.path("ipAddress").asText()).isEqualTo("198.51.100.2");
        assertThat(thirdLog.path("userAgent").isNull()).isTrue();

        JsonNode fourthLog = logs("resourceId", fourthClub.toString()).path("items").get(0);
        assertThat(fourthLog.path("ipAddress").asText()).isEqualTo("192.0.2.44");
        assertThat(fourthLog.path("userAgent").isNull()).isTrue();
    }
}
