package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class PermissionApiTest extends ApiIntegrationTest {
    private String grants(UUID userId) {
        return "/api/v1/users/" + userId + "/permissions";
    }

    @Test
    void catalogRequiresPermissionView() throws Exception {
        problem(get("/api/v1/permissions"), memberToken, null, 403, "PERMISSION_DENIED");
        JsonNode all = call(get("/api/v1/permissions"), adminToken, null, 200);
        assertThat(all.size()).isEqualTo(40);
        db.update("UPDATE permissions SET active = false WHERE permission_key = 'club.view'");
        assertThat(call(get("/api/v1/permissions"), adminToken, null, 200).size()).isEqualTo(39);
    }

    @ParameterizedTest(name = "{0} @ {1} -> {2}")
    @CsvSource({
            "user.view,              GLOBAL,     201",
            "user.view,              CLUB,       400",
            "user.view,              DEPARTMENT, 400",
            "club.update,            GLOBAL,     201",
            "club.update,            CLUB,       201",
            "club.update,            DEPARTMENT, 400",
            "department.update,      GLOBAL,     201",
            "department.update,      CLUB,       201",
            "department.update,      DEPARTMENT, 201",
    })
    void grantScopeMayBeEqualOrBroaderThanPermissionScope(String key, String scope, int status) throws Exception {
        UUID clubId = "CLUB".equals(scope) ? clubA : null;
        UUID departmentId = "DEPARTMENT".equals(scope) ? depA1 : null;
        JsonNode node = call(post(grants(member)), adminToken, assignment(key, scope, clubId, departmentId), status);
        if (status == 400) assertThat(node.path("code").asText()).isEqualTo("PERMISSION_SCOPE_MISMATCH");
    }

    @Test
    void scopeTargetsMustMatchTheScope() throws Exception {
        problem(post(grants(member)), adminToken, assignment("club.update", "CLUB", null, null), 400, "INVALID_PERMISSION_SCOPE");
        problem(post(grants(member)), adminToken, assignment("club.update", "GLOBAL", clubA, null), 400, "INVALID_PERMISSION_SCOPE");
        problem(post(grants(member)), adminToken, assignment("department.update", "CLUB", clubA, depA1), 400, "INVALID_PERMISSION_SCOPE");
        problem(post(grants(member)), adminToken, assignment("department.update", "DEPARTMENT", clubA, null), 400, "INVALID_PERMISSION_SCOPE");
    }

    @Test
    void grantReferencesMustExist() throws Exception {
        problem(post(grants(UUID.randomUUID())), adminToken, assignment("club.view", "GLOBAL", null, null), 404, "USER_NOT_FOUND");
        problem(post(grants(member)), adminToken, Map.of("permissionId", UUID.randomUUID(), "scope", "GLOBAL"), 404, "PERMISSION_NOT_FOUND");
        problem(post(grants(member)), adminToken, assignment("club.view", "CLUB", UUID.randomUUID(), null), 404, "CLUB_NOT_FOUND");
        problem(post(grants(member)), adminToken, assignment("department.update", "DEPARTMENT", null, UUID.randomUUID()), 404,
                "DEPARTMENT_NOT_FOUND");
    }

    @Test
    void inactivePermissionCannotBeGrantedAndStopsWorking() throws Exception {
        grant(member, "club.update", "GLOBAL", null, null);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "ok"), 200);
        db.update("UPDATE permissions SET active = false WHERE permission_key = 'club.update'");
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "no"), 403, "PERMISSION_DENIED");
        problem(post(grants(admin)), adminToken, assignment("club.update", "GLOBAL", null, null), 400, "PERMISSION_INACTIVE");
    }

    @Test
    void duplicateGrantIsConflictEvenUnderConcurrency() throws Exception {
        Map<String, Object> body = assignment("club.update", "CLUB", clubA, null);
        List<Integer> statuses = concurrently(8, () -> () -> send(post(grants(member)), adminToken, body).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isEqualTo(1);
    }

    @Test
    void grantAndRevokeAreAuditedWithActorAndReason() throws Exception {
        Map<String, Object> body = new java.util.HashMap<>(assignment("club.update", "CLUB", clubA, null));
        body.put("reason", "Elected president");
        call(post(grants(member)), adminToken, body, 201);
        call(delete(grants(member) + "/" + permission("club.update")), adminToken, null, 204);

        var rows = db.queryForList("SELECT action, actor_user_id, club_id, reason FROM permission_audit_logs "
                + "WHERE target_user_id = ? ORDER BY created_at, action", member);
        assertThat(rows).hasSize(2);
        assertThat(rows).extracting(r -> r.get("action")).containsExactlyInAnyOrder("GRANT", "REVOKE");
        assertThat(rows).allSatisfy(r -> {
            assertThat(r.get("actor_user_id")).isEqualTo(admin);
            assertThat(r.get("club_id")).isEqualTo(clubA);
        });
        assertThat(rows).extracting(r -> r.get("reason")).contains("Elected president");
    }

    @Test
    void revokeTakesEffectImmediatelyAndCanBeRegranted() throws Exception {
        call(post(grants(member)), adminToken, assignment("club.update", "CLUB", clubA, null), 201);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "ok"), 200);
        call(delete(grants(member) + "/" + permission("club.update")), adminToken, null, 204);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "no"), 403, "PERMISSION_DENIED");
        problem(delete(grants(member) + "/" + permission("club.update")), adminToken, null, 404, "PERMISSION_GRANT_NOT_FOUND");
        call(post(grants(member)), adminToken, assignment("club.update", "CLUB", clubA, null), 201);
    }

    @Test
    void ambiguousRevokeMustNameTheScope() throws Exception {
        call(post(grants(member)), adminToken, assignment("club.update", "CLUB", clubA, null), 201);
        call(post(grants(member)), adminToken, assignment("club.update", "GLOBAL", null, null), 201);
        String path = grants(member) + "/" + permission("club.update");
        problem(delete(path), adminToken, null, 400, "AMBIGUOUS_PERMISSION_GRANT");
        call(delete(path).param("scope", "GLOBAL"), adminToken, null, 204);
        call(delete(path), adminToken, null, 204);
    }

    @Test
    void onlyPermissionHoldersMayGrantRevokeOrViewOthers() throws Exception {
        problem(post(grants(member)), memberToken, assignment("permission.assign", "GLOBAL", null, null), 403, "PERMISSION_DENIED");
        problem(delete(grants(admin) + "/" + permission("club.view")), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get(grants(admin)), memberToken, null, 403, "PERMISSION_DENIED");
        call(get(grants(member)), memberToken, null, 200);
        call(get("/api/v1/users/me/permissions"), memberToken, null, 200);
    }

    @Test
    void ownPermissionListShowsOnlyActiveGrants() throws Exception {
        grant(member, "club.view", "CLUB", clubA, null);
        grant(member, "club.update", "CLUB", clubA, null);
        db.update("UPDATE user_permissions SET revoked_at = now() WHERE user_id = ? AND permission_id = ?",
                member, permission("club.update"));
        JsonNode mine = call(get("/api/v1/users/me/permissions"), memberToken, null, 200);
        assertThat(mine.size()).isEqualTo(1);
        assertThat(mine.get(0).path("permissionKey").asText()).isEqualTo("club.view");
        assertThat(mine.get(0).path("clubId").asText()).isEqualTo(clubA.toString());
    }
}
