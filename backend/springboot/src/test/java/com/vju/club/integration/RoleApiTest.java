package com.vju.club.integration;

import com.vju.club.entity.Role;

import com.fasterxml.jackson.databind.JsonNode;
import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;

class RoleApiTest extends ApiIntegrationTest {
    @Autowired DataSource dataSource;

    private UUID role(String code) {
        return db.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, code);
    }

    private Map<String, Object> roleAssignment(String roleCode, String scope, UUID clubId, UUID departmentId) {
        Map<String, Object> body = new HashMap<>();
        body.put("roleId", role(roleCode));
        body.put("scope", scope);
        if (clubId != null) body.put("clubId", clubId);
        if (departmentId != null) body.put("departmentId", departmentId);
        return body;
    }

    private UUID assign(UUID userId, String roleCode, String scope, UUID clubId, UUID departmentId) throws Exception {
        return id(call(post("/api/v1/users/" + userId + "/roles"), adminToken,
                roleAssignment(roleCode, scope, clubId, departmentId), 201));
    }

    private Map<String, Object> newRole(String code, String scope, String... permissionKeys) {
        List<UUID> ids = new ArrayList<>();
        for (String key : permissionKeys) ids.add(permission(key));
        return new HashMap<>(Map.of("code", code, "name", "Role " + code, "scope", scope, "permissionIds", ids));
    }

    @Test
    void systemRolesAreSeededWithTheirPermissions() throws Exception {
        problem(get("/api/v1/roles"), memberToken, null, 403, "PERMISSION_DENIED");
        JsonNode roles = call(get("/api/v1/roles"), adminToken, null, 200);
        List<String> codes = new ArrayList<>();
        roles.forEach(r -> codes.add(r.path("code").asText()));
        assertThat(codes).containsExactlyInAnyOrder("SYSTEM_ADMIN", "CLUB_PRESIDENT", "CLUB_VICE_PRESIDENT",
                "DEPARTMENT_HEAD", "CLUB_MEMBER");

        JsonNode admin = call(get("/api/v1/roles/" + role("SYSTEM_ADMIN")), adminToken, null, 200);
        assertThat(admin.path("permissionKeys").size()).isEqualTo(count("SELECT count(*) FROM permissions"));
        JsonNode head = call(get("/api/v1/roles/" + role("DEPARTMENT_HEAD")), adminToken, null, 200);
        assertThat(head.path("scope").asText()).isEqualTo("DEPARTMENT");
        assertThat(head.path("system").asBoolean()).isTrue();
        assertThat(head.path("permissionKeys").toString()).contains("department.update").doesNotContain("club.update");
        problem(get("/api/v1/roles/" + UUID.randomUUID()), adminToken, null, 404, "ROLE_NOT_FOUND");
    }

    @Test
    void systemRolesCannotBeEdited() throws Exception {
        problem(patch("/api/v1/roles/" + role("CLUB_MEMBER")), adminToken, Map.of("name", "Hacked"), 409, "SYSTEM_ROLE_IMMUTABLE");
    }

    @Test
    void clubPresidentManagesTheirClubOnly() throws Exception {
        assign(member, "CLUB_PRESIDENT", "CLUB", clubA, null);

        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "ok"), 200);
        call(post("/api/v1/clubs/" + clubA + "/departments"), memberToken, Map.of("name", "Events"), 201);
        call(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "ok"), 200);
        UUID inA = membership(user("x@test.local"), clubA);
        call(post("/api/v1/departments/" + depA1 + "/members"), memberToken, Map.of("membershipId", inA), 201);

        problem(patch("/api/v1/clubs/" + clubB), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/clubs/" + clubA + "/status"), memberToken, Map.of("status", "INACTIVE"), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/clubs"), memberToken, Map.of("code", "NEW", "name", "n"), 403, "PERMISSION_DENIED");
    }

    @Test
    void departmentHeadIsLimitedToTheirDepartmentUnlessAssignedClubWide() throws Exception {
        assign(member, "DEPARTMENT_HEAD", "DEPARTMENT", null, depA1);
        call(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "ok"), 200);
        problem(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");

        assign(member, "DEPARTMENT_HEAD", "CLUB", clubA, null);
        call(patch("/api/v1/departments/" + depA2), memberToken, Map.of("description", "ok"), 200);
        problem(patch("/api/v1/departments/" + depB1), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
    }

    @Test
    void clubMemberRoleControlsWhichClubsAreListed() throws Exception {
        JsonNode discoverable = call(get("/api/v1/clubs"), memberToken, null, 200);
        assertThat(discoverable.path("total").asInt()).isEqualTo(2);
        assign(member, "CLUB_MEMBER", "CLUB", clubB, null);
        JsonNode clubs = call(get("/api/v1/clubs"), memberToken, null, 200);
        assertThat(clubs.path("total").asInt()).isEqualTo(2);
        call(get("/api/v1/clubs/" + clubB + "/departments"), memberToken, null, 200);
        call(get("/api/v1/clubs/" + clubB + "/memberships"), memberToken, null, 200);
        call(get("/api/v1/clubs/" + clubA), memberToken, null, 200);
        problem(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void revokingARoleRemovesAccessImmediatelyAndIsAudited() throws Exception {
        UUID assignment = assign(member, "CLUB_PRESIDENT", "CLUB", clubA, null);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "ok"), 200);

        call(delete("/api/v1/users/" + member + "/roles/" + assignment), adminToken, null, 204);

        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/users/" + member + "/roles/" + assignment), adminToken, null, 404, "ROLE_ASSIGNMENT_NOT_FOUND");
        assertThat(db.queryForObject("SELECT revoked_by FROM user_roles WHERE id = ?", UUID.class, assignment)).isEqualTo(admin);
        var audit = db.queryForList("SELECT action, role_id, permission_id FROM permission_audit_logs WHERE target_user_id = ?", member);
        assertThat(audit).hasSize(2);
        assertThat(audit).allSatisfy(row -> {
            assertThat(row.get("role_id")).isEqualTo(role("CLUB_PRESIDENT"));
            assertThat(row.get("permission_id")).isNull();
        });
        assertThat(audit).extracting(row -> row.get("action")).containsExactlyInAnyOrder("GRANT", "REVOKE");
    }

    @Test
    void revokeOnlyTouchesTheGivenUsersAssignment() throws Exception {
        UUID assignment = assign(member, "CLUB_MEMBER", "CLUB", clubA, null);
        problem(delete("/api/v1/users/" + admin + "/roles/" + assignment), adminToken, null, 404, "ROLE_ASSIGNMENT_NOT_FOUND");
        problem(delete("/api/v1/users/" + member + "/roles/" + UUID.randomUUID()), adminToken, null, 404, "ROLE_ASSIGNMENT_NOT_FOUND");
    }

    @Test
    void assignmentScopeMustBeAtLeastTheRoleScope() throws Exception {
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_PRESIDENT", "DEPARTMENT", null, depA1),
                400, "ROLE_SCOPE_MISMATCH");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("SYSTEM_ADMIN", "CLUB", clubA, null),
                400, "ROLE_SCOPE_MISMATCH");
        call(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "GLOBAL", null, null), 201);
    }

    @Test
    void assignmentTargetsMustMatchAndExist() throws Exception {
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "CLUB", null, null),
                400, "INVALID_SCOPE_TARGET");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "CLUB", clubA, depA1),
                400, "INVALID_SCOPE_TARGET");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "CLUB", UUID.randomUUID(), null),
                404, "CLUB_NOT_FOUND");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken,
                roleAssignment("DEPARTMENT_HEAD", "DEPARTMENT", null, UUID.randomUUID()), 404, "DEPARTMENT_NOT_FOUND");
        problem(post("/api/v1/users/" + UUID.randomUUID() + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "GLOBAL", null, null),
                404, "USER_NOT_FOUND");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken,
                Map.of("roleId", UUID.randomUUID(), "scope", "GLOBAL"), 404, "ROLE_NOT_FOUND");
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, Map.of("scope", "GLOBAL"), 400, "VALIDATION_ERROR");
    }

    @Test
    void duplicateAssignmentIsConflictEvenUnderConcurrency() throws Exception {
        Map<String, Object> body = roleAssignment("CLUB_MEMBER", "CLUB", clubA, null);
        List<Integer> statuses = concurrently(8, () -> () -> send(post("/api/v1/users/" + member + "/roles"), adminToken, body).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        problem(post("/api/v1/users/" + member + "/roles"), adminToken, body, 409, "ROLE_ALREADY_ASSIGNED");
        call(post("/api/v1/users/" + member + "/roles"), adminToken, roleAssignment("CLUB_MEMBER", "CLUB", clubB, null), 201);
    }

    @Test
    void onlyPermissionHoldersAssignOrSeeOthersRoles() throws Exception {
        problem(post("/api/v1/users/" + member + "/roles"), memberToken, roleAssignment("SYSTEM_ADMIN", "GLOBAL", null, null),
                403, "PERMISSION_DENIED");
        problem(get("/api/v1/users/" + admin + "/roles"), memberToken, null, 403, "PERMISSION_DENIED");
        assign(member, "CLUB_MEMBER", "CLUB", clubA, null);
        JsonNode mine = call(get("/api/v1/users/me/roles"), memberToken, null, 200);
        assertThat(mine.size()).isEqualTo(1);
        assertThat(mine.get(0).path("roleCode").asText()).isEqualTo("CLUB_MEMBER");
        assertThat(mine.get(0).path("clubId").asText()).isEqualTo(clubA.toString());
        assertThat(call(get("/api/v1/users/" + member + "/roles"), adminToken, null, 200).size()).isEqualTo(1);
    }

    @Test
    void customRoleIsCreatedWithNormalizedUniqueCode() throws Exception {
        JsonNode created = call(post("/api/v1/roles"), adminToken, newRole("treasurer", "CLUB", "club.view", "member.view"), 201);
        assertThat(created.path("code").asText()).isEqualTo("TREASURER");
        assertThat(created.path("system").asBoolean()).isFalse();
        assertThat(created.path("permissionKeys").toString()).contains("club.view", "member.view");
        problem(post("/api/v1/roles"), adminToken, newRole("Treasurer", "CLUB", "club.view"), 409, "ROLE_CODE_ALREADY_EXISTS");
    }

    @Test
    void customRoleCannotBundlePermissionsBroaderThanItsScope() throws Exception {
        problem(post("/api/v1/roles"), adminToken, newRole("BAD", "CLUB", "club.view", "user.view"), 400,
                "ROLE_PERMISSION_SCOPE_MISMATCH");
        problem(post("/api/v1/roles"), adminToken, newRole("BAD2", "DEPARTMENT", "club.view"), 400,
                "ROLE_PERMISSION_SCOPE_MISMATCH");
        call(post("/api/v1/roles"), adminToken, newRole("OK_GLOBAL", "GLOBAL", "user.view", "club.view", "department.update"), 201);
    }

    @Test
    void customRoleValidation() throws Exception {
        problem(post("/api/v1/roles"), memberToken, newRole("X", "CLUB", "club.view"), 403, "PERMISSION_DENIED");
        Map<String, Object> unknown = newRole("UNKNOWN", "CLUB");
        unknown.put("permissionIds", List.of(UUID.randomUUID()));
        problem(post("/api/v1/roles"), adminToken, unknown, 404, "PERMISSION_NOT_FOUND");
        problem(post("/api/v1/roles"), adminToken, newRole("EMPTY", "CLUB"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/roles"), adminToken, newRole("1BAD", "CLUB", "club.view"), 400, "VALIDATION_ERROR");
        problem(post("/api/v1/roles"), adminToken, newRole("has space", "CLUB", "club.view"), 400, "VALIDATION_ERROR");
        db.update("UPDATE permissions SET active = false WHERE permission_key = 'member.view'");
        problem(post("/api/v1/roles"), adminToken, newRole("INACTIVE", "CLUB", "member.view"), 400, "PERMISSION_INACTIVE");
    }

    @Test
    void editingACustomRoleChangesHoldersAccessImmediately() throws Exception {
        UUID editor = id(call(post("/api/v1/roles"), adminToken, newRole("EDITOR", "CLUB", "club.view"), 201));
        call(post("/api/v1/users/" + member + "/roles"), adminToken,
                Map.of("roleId", editor, "scope", "CLUB", "clubId", clubA), 201);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");

        call(patch("/api/v1/roles/" + editor), adminToken,
                Map.of("permissionIds", List.of(permission("club.view"), permission("club.update"))), 200);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "yes"), 200);

        call(patch("/api/v1/roles/" + editor), adminToken, Map.of("active", false), 200);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "no"), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/users/" + admin + "/roles"), adminToken, Map.of("roleId", editor, "scope", "GLOBAL"), 400, "ROLE_INACTIVE");

        call(patch("/api/v1/roles/" + editor), adminToken, Map.of("active", true, "name", "Biên tập viên"), 200);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "again"), 200);
        problem(patch("/api/v1/roles/" + editor), adminToken, Map.of("name", " "), 400, "INVALID_ROLE_NAME");
        problem(patch("/api/v1/roles/" + editor), adminToken, Map.of("permissionIds", List.of()), 400, "VALIDATION_ERROR");
    }

    @Test
    void effectivePermissionsCombineDirectGrantsAndRoles() throws Exception {
        grant(member, "user.view", "GLOBAL", null, null);
        assign(member, "CLUB_MEMBER", "CLUB", clubA, null);

        JsonNode effective = call(get("/api/v1/users/me/effective-permissions"), memberToken, null, 200);
        assertThat(effective.size()).isEqualTo(5);
        List<String> rows = new ArrayList<>();
        effective.forEach(e -> rows.add(e.path("permissionKey").asText() + "|" + e.path("source").asText() + "|"
                + e.path("roleCode").asText("")));
        assertThat(rows).containsExactlyInAnyOrder("user.view|DIRECT|", "club.view|ROLE|CLUB_MEMBER",
                "department.view|ROLE|CLUB_MEMBER", "member.view|ROLE|CLUB_MEMBER",
                "document.view|ROLE|CLUB_MEMBER");

        db.update("UPDATE permissions SET active = false WHERE permission_key = 'member.view'");
        assertThat(call(get("/api/v1/users/me/effective-permissions"), memberToken, null, 200).size()).isEqualTo(4);

        problem(get("/api/v1/users/" + admin + "/effective-permissions"), memberToken, null, 403, "PERMISSION_DENIED");
        assertThat(call(get("/api/v1/users/" + member + "/effective-permissions"), adminToken, null, 200).size()).isEqualTo(4);
        problem(get("/api/v1/users/" + UUID.randomUUID() + "/effective-permissions"), adminToken, null, 404, "USER_NOT_FOUND");
    }

    @Test
    void databaseRejectsRolesAndGrantsThatBreakScopeRules() {
        UUID clubRole = role("CLUB_MEMBER");
        assertThatThrownBy(() -> db.update("INSERT INTO role_permissions(role_id, permission_id) VALUES (?, ?)",
                clubRole, permission("user.view")))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_role_permissions_scope");
        assertThatThrownBy(() -> db.update("INSERT INTO user_roles(user_id, role_id, scope, department_id, granted_by) "
                + "VALUES (?, ?, 'DEPARTMENT', ?, ?)", member, clubRole, depA1, admin))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_user_roles_grant_scope");
        assertThatThrownBy(() -> grant(member, "club.update", "DEPARTMENT", null, depA1))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_user_permissions_grant_scope");
        assertThatThrownBy(() -> db.update("INSERT INTO permission_audit_logs(actor_user_id, target_user_id, action, scope) "
                + "VALUES (?, ?, 'GRANT', 'GLOBAL')", admin, member))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_permission_audit_subject");
        assertThatThrownBy(() -> db.update("INSERT INTO roles(code, name, scope) VALUES ('lower_case', 'x', 'CLUB')"))
                .isInstanceOf(DataIntegrityViolationException.class).hasMessageContaining("ck_roles_code_format");
    }

    @Test
    void clubPositionGovernanceChecksMembershipEnforcesLimitsAndReplacesIncumbent() throws Exception {
        UUID candidateA = user("cand_a@test.local");
        UUID candidateB = user("cand_b@test.local");
        UUID presidentRole = role("CLUB_PRESIDENT");
        UUID headRole = role("DEPARTMENT_HEAD");

        // 1. Cannot assign club president to a user who is not a club member
        problem(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateA, "roleId", presidentRole), 409, "MEMBERSHIP_REQUIRED_FOR_POSITION");

        // 2. Add both candidates as active members of clubA
        UUID memA = membership(candidateA, clubA);
        membership(candidateB, clubA);

        // 3. Assign candidateA as Club President
        JsonNode assignedA = call(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateA, "roleId", presidentRole, "reason", "Bổ nhiệm nhiệm kỳ 1"), 200);
        assertThat(assignedA.path("userId").asText()).isEqualTo(candidateA.toString());

        // 4. With replaceHolder=false, assigning candidateB fails because maxHolders=1
        problem(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateB, "roleId", presidentRole, "replaceHolder", false),
                409, "POSITION_LIMIT_REACHED");

        // 5. With replaceHolder=true (default), candidateB automatically replaces candidateA
        JsonNode assignedB = call(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateB, "roleId", presidentRole, "reason", "Thay thế Chủ nhiệm"), 200);
        assertThat(assignedB.path("userId").asText()).isEqualTo(candidateB.toString());

        // 6. Department Head requires active department membership
        problem(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateA, "roleId", headRole, "departmentId", depA1),
                409, "DEPARTMENT_MEMBERSHIP_REQUIRED");
        call(post("/api/v1/departments/" + depA1 + "/members"), adminToken, Map.of("membershipId", memA), 201);
        JsonNode headAssigned = call(put("/api/v1/clubs/" + clubA + "/positions"), adminToken,
                Map.of("userId", candidateA, "roleId", headRole, "departmentId", depA1), 200);
        assertThat(headAssigned.path("userId").asText()).isEqualTo(candidateA.toString());

        // 7. Structure endpoint returns current Club President (candidateB) and Department Head (candidateA)
        JsonNode structure = call(get("/api/v1/clubs/" + clubA + "/positions"), adminToken, null, 200);
        assertThat(structure.path("clubId").asText()).isEqualTo(clubA.toString());
        assertThat(structure.path("clubPositions")).isNotEmpty();
        assertThat(structure.path("departmentPositions")).isNotEmpty();

        // 8. Revoke Department Head position
        call(delete("/api/v1/clubs/" + clubA + "/positions/" + id(headAssigned)), adminToken, null, 204);
    }

    @Test
    void clubPresidentDelegatesRolesAndDirectPermissionsWithinClubOnly() throws Exception {
        membership(member, clubA);
        assign(member, "CLUB_PRESIDENT", "CLUB", clubA, null);

        UUID teammate = user("teammate@test.local");
        UUID teammateMemA = membership(teammate, clubA);
        membership(teammate, clubB);
        assign(teammate, "CLUB_MEMBER", "CLUB", clubB, null);
        call(post("/api/v1/departments/" + depA1 + "/members"), memberToken, Map.of("membershipId", teammateMemA), 201);
        UUID outsider = user("outsider@test.local");

        call(get("/api/v1/permissions"), memberToken, null, 200);
        call(get("/api/v1/roles"), memberToken, null, 200);

        JsonNode assignedVice = call(post("/api/v1/users/" + teammate + "/roles"), memberToken,
                roleAssignment("CLUB_VICE_PRESIDENT", "CLUB", clubA, null), 201);
        JsonNode visibleRoles = call(get("/api/v1/users/" + teammate + "/roles"), memberToken, null, 200);
        assertThat(visibleRoles).hasSize(1);
        assertThat(visibleRoles.get(0).path("clubId").asText()).isEqualTo(clubA.toString());

        UUID docUpload = permission("document.upload");
        call(post("/api/v1/users/" + teammate + "/permissions"), memberToken,
                Map.of("permissionId", docUpload, "scope", "DEPARTMENT", "departmentId", depA1), 201);
        call(delete("/api/v1/users/" + teammate + "/permissions/" + docUpload
                + "?scope=DEPARTMENT&departmentId=" + depA1), memberToken, null, 204);
        call(delete("/api/v1/users/" + teammate + "/roles/" + id(assignedVice)), memberToken, null, 204);

        problem(post("/api/v1/users/" + outsider + "/permissions"), memberToken,
                Map.of("permissionId", docUpload, "scope", "CLUB", "clubId", clubA), 409, "MEMBERSHIP_REQUIRED_FOR_POSITION");
        problem(post("/api/v1/users/" + teammate + "/permissions"), memberToken,
                Map.of("permissionId", docUpload, "scope", "CLUB", "clubId", clubB), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/users/" + teammate + "/permissions"), memberToken,
                Map.of("permissionId", docUpload, "scope", "GLOBAL"), 403, "PERMISSION_DENIED");
    }

    @Test
    void departmentHeadManagesDepartmentEventsAndChatChannelsOnly() throws Exception {
        UUID memA = membership(member, clubA);
        call(post("/api/v1/departments/" + depA1 + "/members"), adminToken, Map.of("membershipId", memA), 201);
        assign(member, "DEPARTMENT_HEAD", "DEPARTMENT", null, depA1);

        String start = java.time.OffsetDateTime.now().plusDays(3).toString();
        String end = java.time.OffsetDateTime.now().plusDays(3).plusHours(2).toString();
        String deadline = java.time.OffsetDateTime.now().plusDays(2).toString();

        JsonNode createdEvent = call(post("/api/v1/clubs/" + clubA + "/events"), memberToken,
                Map.of("departmentId", depA1, "title", "Dept Workshop", "startTime", start,
                        "endTime", end, "registrationDeadline", deadline), 201);
        call(patch("/api/v1/clubs/" + clubA + "/events/" + id(createdEvent)), memberToken, Map.of("title", "Dept Workshop v2"), 200);
        problem(patch("/api/v1/clubs/" + clubA + "/events/" + id(createdEvent)), memberToken,
                Map.of("departmentId", depA2), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/clubs/" + clubA + "/events"), memberToken,
                Map.of("departmentId", depA2, "title", "Other Dept", "startTime", start,
                        "endTime", end, "registrationDeadline", deadline), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/clubs/" + clubA + "/events"), memberToken,
                Map.of("title", "Club Wide", "startTime", start, "endTime", end, "registrationDeadline", deadline),
                403, "PERMISSION_DENIED");

        call(post("/api/v1/clubs/" + clubA + "/channels"), memberToken,
                Map.of("departmentId", depA1, "name", "Ban Chuyen Mon", "channelType", "DEPARTMENT"), 201);
        problem(post("/api/v1/clubs/" + clubA + "/channels"), memberToken,
                Map.of("departmentId", depA2, "name", "Other Dept", "channelType", "DEPARTMENT"), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/clubs/" + clubA + "/channels"), memberToken,
                Map.of("name", "Club General 2"), 403, "PERMISSION_DENIED");
    }

    @Test
    void migrationSeedsDoanVjuWithThreeDepartmentsAndBackfillsOfficerMemberships() throws Exception {
        String schema = "v35_seed_" + UUID.randomUUID().toString().replace("-", "");
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .target("34").load().migrate();
            try (Connection connection = dataSource.getConnection(); Statement sql = connection.createStatement()) {
                sql.execute("INSERT INTO " + schema + ".users(email, password_hash, full_name) "
                        + "VALUES ('officer_v35@test.local', 'hash', 'Officer V35')");
                sql.execute("INSERT INTO " + schema + ".clubs(code, name) VALUES ('SYNC_CLUB', 'Sync Test Club')");
                sql.execute("INSERT INTO " + schema + ".departments(club_id, name) "
                        + "SELECT id, 'Ban Chuyen Mon' FROM " + schema + ".clubs WHERE code = 'SYNC_CLUB'");
                sql.execute("INSERT INTO " + schema + ".user_roles(user_id, role_id, scope, department_id, granted_by) "
                        + "SELECT u.id, r.id, 'DEPARTMENT', d.id, u.id "
                        + "FROM " + schema + ".users u "
                        + "JOIN " + schema + ".roles r ON r.code = 'DEPARTMENT_HEAD' "
                        + "JOIN " + schema + ".departments d ON d.name = 'Ban Chuyen Mon' "
                        + "WHERE u.email = 'officer_v35@test.local'");
            }

            Flyway latest = Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema).load();
            assertThat(latest.migrate().migrationsExecuted).isGreaterThanOrEqualTo(1);
            latest.validate();
            assertThat(latest.migrate().migrationsExecuted).isZero();

            Map<String, Object> doanVju = db.queryForMap(
                    "SELECT id, code, name, logo_url, cover_url, activity_field, contact_email, status, overview_config "
                            + "FROM " + schema + ".clubs WHERE code = 'DOANVJU'");
            assertThat(doanVju.get("name")).isEqualTo("Đoàn Thanh niên Trường Đại học Việt Nhật");
            assertThat(doanVju.get("logo_url")).isEqualTo("/images/vju-logo.png");
            assertThat(doanVju.get("cover_url")).isEqualTo("/images/intro/campus-awards.jpg");
            assertThat(doanVju.get("activity_field")).isEqualTo("Đoàn thể & Điều phối");
            assertThat(doanVju.get("contact_email")).isEqualTo("doanthanhnien@vju.ac.vn");
            assertThat(doanVju.get("status")).isEqualTo("ACTIVE");
            assertThat((String) doanVju.get("overview_config")).contains("VOLUNTEER");

            List<String> seededDepts = db.queryForList(
                    "SELECT name FROM " + schema + ".departments WHERE club_id = ? ORDER BY name",
                    String.class,
                    doanVju.get("id"));
            assertThat(seededDepts).containsExactlyInAnyOrder(
                    "Ban Điều phối CLB",
                    "Ban Truyền thông & Sự kiện",
                    "Ban Phong trào & Tình nguyện");

            assertThat(count(
                    "SELECT count(*) FROM " + schema + ".memberships m "
                            + "JOIN " + schema + ".users u ON u.id = m.user_id "
                            + "JOIN " + schema + ".clubs c ON c.id = m.club_id "
                            + "WHERE u.email = 'officer_v35@test.local' AND c.code = 'SYNC_CLUB' "
                            + "AND m.status = 'ACTIVE' AND m.left_at IS NULL"))
                    .isEqualTo(1);
            assertThat(count(
                    "SELECT count(*) FROM " + schema + ".department_members dm "
                            + "JOIN " + schema + ".memberships m ON m.id = dm.membership_id "
                            + "JOIN " + schema + ".users u ON u.id = m.user_id "
                            + "JOIN " + schema + ".departments d ON d.id = dm.department_id "
                            + "WHERE u.email = 'officer_v35@test.local' AND d.name = 'Ban Chuyen Mon'"))
                    .isEqualTo(1);
        } finally {
            db.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }

    @Test
    void assigningClubOrDepartmentRoleAsSystemAdminAutoSyncsActiveMembershipAndDepartmentLink() throws Exception {
        UUID clubOfficer = user("club_officer_sync@test.local");
        UUID deptOfficer = user("dept_officer_sync@test.local");

        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", clubOfficer, clubA)).isZero();
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", deptOfficer, clubA)).isZero();

        assign(clubOfficer, "CLUB_PRESIDENT", "CLUB", clubA, null);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE' AND left_at IS NULL",
                clubOfficer, clubA)).isEqualTo(1);

        // Assigning another role in the same club does not duplicate the membership
        assign(clubOfficer, "CLUB_VICE_PRESIDENT", "CLUB", clubA, null);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                clubOfficer, clubA)).isEqualTo(1);

        assign(deptOfficer, "DEPARTMENT_HEAD", "DEPARTMENT", null, depA1);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE' AND left_at IS NULL",
                deptOfficer, clubA)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM department_members dm "
                + "JOIN memberships m ON m.id = dm.membership_id "
                + "WHERE m.user_id = ? AND dm.department_id = ? AND dm.club_id = ?",
                deptOfficer, depA1, clubA)).isEqualTo(1);

        JsonNode myMemberships = call(get("/api/v1/users/me/memberships"), token(deptOfficer), null, 200);
        assertThat(myMemberships.path("total").asInt()).isEqualTo(1);
        assertThat(myMemberships.at("/items/0/clubId").asText()).isEqualTo(clubA.toString());
        assertThat(myMemberships.at("/items/0/departments/0/id").asText()).isEqualTo(depA1.toString());
    }
}
