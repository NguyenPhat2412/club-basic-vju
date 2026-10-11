package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class AdminAccountApiTest extends ApiIntegrationTest {
    private UUID role(String code) {
        return db.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, code);
    }

    private UUID giveSystemAdminRole(UUID userId) {
        return db.queryForObject("INSERT INTO user_roles(user_id, role_id, scope, granted_by) VALUES (?, ?, 'GLOBAL', ?) RETURNING id",
                UUID.class, userId, role("SYSTEM_ADMIN"), admin);
    }

    private Map<String, Object> account(String email, Object roles, Boolean requiresPasswordChange) {
        Map<String, Object> body = new HashMap<>();
        body.put("email", email);
        body.put("password", PASSWORD);
        body.put("fullName", "New Member");
        if (roles != null) body.put("roles", roles);
        if (requiresPasswordChange != null) body.put("requiresPasswordChange", requiresPasswordChange);
        return body;
    }

    private Map<String, Object> clubRole(String code, UUID clubId) {
        return Map.of("roleId", role(code), "scope", "CLUB", "clubId", clubId);
    }

    private List<String> effectiveKeys(UUID userId, UUID clubId) throws Exception {
        JsonNode rows = call(get("/api/v1/users/" + userId + "/effective-permissions"), adminToken, null, 200);
        List<String> keys = new java.util.ArrayList<>();
        rows.forEach(row -> {
            if (clubId.toString().equals(row.path("clubId").asText())) keys.add(row.path("permissionKey").asText());
        });
        return keys;
    }

    @Test
    void adminCreatesAnAccountWithARoleInOneStep() throws Exception {
        JsonNode created = call(post("/api/v1/users"), adminToken,
                account("president@test.local", List.of(clubRole("CLUB_PRESIDENT", clubA)), null), 201);
        UUID id = id(created);
        assertThat(created.path("requiresPasswordChange").asBoolean()).isTrue();

        JsonNode roles = call(get("/api/v1/users/" + id + "/roles"), adminToken, null, 200);
        assertThat(roles).hasSize(1);
        assertThat(effectiveKeys(id, clubA)).contains("club.update", "member.add");
        assertThat(effectiveKeys(id, clubB)).isEmpty();
    }

    @Test
    void anInvalidInitialRoleCreatesNothing() throws Exception {
        Map<String, Object> wrongScope = Map.of("roleId", role("CLUB_PRESIDENT"), "scope", "DEPARTMENT", "departmentId", depA1);
        problem(post("/api/v1/users"), adminToken, account("rollback@test.local", List.of(wrongScope), null),
                400, "ROLE_SCOPE_MISMATCH");
        assertThat(count("SELECT count(*) FROM users WHERE email = 'rollback@test.local'")).isZero();
    }

    @Test
    void newAccountMustChooseItsOwnPasswordBeforeUsingTheApp() throws Exception {
        call(post("/api/v1/users"), adminToken,
                account("fresh@test.local", List.of(clubRole("CLUB_MEMBER", clubA)), null), 201);
        String session = login("fresh@test.local", PASSWORD);

        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("requiresPasswordChange").asBoolean()).isTrue();
        problem(get("/api/v1/clubs"), session, null, 403, "PASSWORD_CHANGE_REQUIRED");
        problem(get("/api/v1/users/me/effective-permissions"), session, null, 403, "PASSWORD_CHANGE_REQUIRED");

        call(post("/api/v1/auth/change-password"), session,
                Map.of("currentPassword", PASSWORD, "newPassword", "MyOwnPassword1!"), 204);
        assertThat(call(get("/api/v1/auth/me"), session, null, 200).path("requiresPasswordChange").asBoolean()).isFalse();
        call(get("/api/v1/clubs"), session, null, 200);
    }

    @Test
    void adminMaySkipTheFirstLoginPasswordChange() throws Exception {
        call(post("/api/v1/users"), adminToken, account("ready@test.local", null, false), 201);
        call(get("/api/v1/clubs"), login("ready@test.local", PASSWORD), null, 200);
    }

    @Test
    void passwordResetByAnAdminForcesANewPasswordUnlessTurnedOff() throws Exception {
        call(patch("/api/v1/users/" + member + "/password"), adminToken, Map.of("newPassword", "Temporary123!"), 204);
        String session = login("member@test.local", "Temporary123!");
        problem(get("/api/v1/clubs"), session, null, 403, "PASSWORD_CHANGE_REQUIRED");

        call(patch("/api/v1/users/" + member + "/password"), adminToken,
                Map.of("newPassword", "Temporary456!", "requiresPasswordChange", false), 204);
        call(get("/api/v1/clubs"), login("member@test.local", "Temporary456!"), null, 200);
    }

    @Test
    void onlyASystemAdministratorCanHandOutTheSystemAdministratorRole() throws Exception {
        grant(member, "permission.assign", "GLOBAL", null, null);
        UUID target = user("target@test.local");
        Map<String, Object> systemAdmin = Map.of("roleId", role("SYSTEM_ADMIN"), "scope", "GLOBAL");

        problem(post("/api/v1/users/" + target + "/roles"), memberToken, systemAdmin, 403, "SYSTEM_ADMIN_ONLY");
        problem(post("/api/v1/users/" + member + "/roles"), memberToken, systemAdmin, 403, "SYSTEM_ADMIN_ONLY");

        giveSystemAdminRole(admin);
        call(post("/api/v1/users/" + target + "/roles"), adminToken, systemAdmin, 201);
    }

    @Test
    void nobodyCanGrantMoreThanTheyHold() throws Exception {
        grant(member, "permission.assign", "GLOBAL", null, null);
        UUID target = user("target@test.local");

        problem(post("/api/v1/users/" + target + "/roles"), memberToken, clubRole("CLUB_PRESIDENT", clubA),
                403, "GRANT_EXCEEDS_OWN_PERMISSIONS");
        problem(post("/api/v1/users/" + target + "/permissions"), memberToken,
                Map.of("permissionId", permission("club.update"), "scope", "CLUB", "clubId", clubA),
                403, "GRANT_EXCEEDS_OWN_PERMISSIONS");
        problem(post("/api/v1/users/" + member + "/permissions"), memberToken,
                Map.of("permissionId", permission("user.create"), "scope", "GLOBAL"),
                403, "GRANT_EXCEEDS_OWN_PERMISSIONS");

        for (String key : new String[]{"club.view", "department.view", "member.view", "document.view"}) {
            grant(member, key, "CLUB", clubA, null);
        }
        call(post("/api/v1/users/" + target + "/roles"), memberToken, clubRole("CLUB_MEMBER", clubA), 201);
        problem(post("/api/v1/users/" + target + "/roles"), memberToken, clubRole("CLUB_MEMBER", clubB),
                403, "GRANT_EXCEEDS_OWN_PERMISSIONS");
    }

    @Test
    void administratorsCannotLockThemselvesOrTheLastAdministratorOut() throws Exception {
        UUID ownAssignment = giveSystemAdminRole(admin);

        problem(patch("/api/v1/users/" + admin + "/status"), adminToken, Map.of("status", "INACTIVE"), 409,
                "CANNOT_DEACTIVATE_SELF");
        problem(delete("/api/v1/users/" + admin + "/roles/" + ownAssignment), adminToken, null, 409,
                "CANNOT_REVOKE_OWN_ADMIN");

        UUID other = user("second-admin@test.local");
        UUID otherAssignment = giveSystemAdminRole(other);
        call(delete("/api/v1/users/" + other + "/roles/" + otherAssignment), adminToken, null, 204);

        giveSystemAdminRole(other);
        call(patch("/api/v1/users/" + other + "/status"), adminToken, Map.of("status", "INACTIVE"), 200);
        assertThat(count("SELECT count(*) FROM users WHERE status = 'ACTIVE' AND id = ?", admin)).isEqualTo(1);
    }

    @Test
    void lastActiveSystemAdministratorCannotBeDeactivatedByAnotherAccount() throws Exception {
        giveSystemAdminRole(admin);
        grant(member, "user.inactive", "GLOBAL", null, null);
        problem(patch("/api/v1/users/" + admin + "/status"), memberToken, Map.of("status", "INACTIVE"), 409,
                "LAST_SYSTEM_ADMIN");
    }

    @Test
    void roleMatrixEditsSystemRolesButNeverTheAdministratorRole() throws Exception {
        List<UUID> memberPermissions = db.queryForList("SELECT permission_id FROM role_permissions WHERE role_id = ?",
                UUID.class, role("CLUB_MEMBER"));
        List<UUID> withApplications = new java.util.ArrayList<>(memberPermissions);
        withApplications.add(permission("application.view"));

        JsonNode updated = call(patch("/api/v1/roles/" + role("CLUB_MEMBER")), adminToken,
                Map.of("permissionIds", withApplications), 200);
        assertThat(updated.toString()).contains("application.view");

        problem(patch("/api/v1/roles/" + role("SYSTEM_ADMIN")), adminToken,
                Map.of("permissionIds", List.of(permission("club.view"))), 409, "SYSTEM_ROLE_IMMUTABLE");
        problem(patch("/api/v1/roles/" + role("CLUB_MEMBER")), adminToken, Map.of("active", false), 409,
                "SYSTEM_ROLE_IMMUTABLE");
    }
}
