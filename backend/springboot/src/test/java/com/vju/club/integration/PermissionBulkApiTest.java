package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

class PermissionBulkApiTest extends ApiIntegrationTest {
    private Map<String, Object> clubSet(String... keys) {
        Map<String, Object> body = new HashMap<>();
        body.put("scope", "CLUB");
        body.put("clubId", clubA);
        body.put("permissionKeys", List.of(keys));
        return body;
    }

    private List<String> keys(JsonNode grants) {
        List<String> keys = new ArrayList<>();
        grants.forEach(grant -> keys.add(grant.path("permissionKey").asText()));
        return keys;
    }

    @Test
    void groupsListEveryActivePermissionByModule() throws Exception {
        problem(get("/api/v1/permissions/groups"), memberToken, null, 403, "PERMISSION_DENIED");
        JsonNode groups = call(get("/api/v1/permissions/groups"), adminToken, null, 200);
        List<String> modules = new ArrayList<>();
        int total = 0;
        for (JsonNode group : groups) {
            modules.add(group.path("module").asText());
            total += group.path("permissions").size();
            group.path("permissions").forEach(p -> assertThat(p.path("module").asText()).isEqualTo(group.path("module").asText()));
        }
        assertThat(modules).isSorted().contains("audit", "club", "department", "department.member", "member", "permission", "role", "user");
        assertThat(total).isEqualTo(count("SELECT count(*) FROM permissions WHERE active"));
    }

    @Test
    void putSetsExactlyTheGivenPermissionsAtThatScope() throws Exception {
        JsonNode first = call(put("/api/v1/users/" + member + "/permissions"), adminToken,
                clubSet("club.view", "member.view", "member.update"), 200);
        assertThat(keys(first)).containsExactly("club.view", "member.update", "member.view");
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "no"), 403);

        JsonNode second = call(put("/api/v1/users/" + member + "/permissions"), adminToken,
                clubSet("club.view", "club.update"), 200);
        assertThat(keys(second)).containsExactly("club.update", "club.view");
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("name", "yes"), 200);
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isEqualTo(2);

        call(put("/api/v1/users/" + member + "/permissions"), adminToken, clubSet(), 200);
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isZero();
        assertThat(count("SELECT count(*) FROM permission_audit_logs WHERE target_user_id = ?", member)).isEqualTo(8);
    }

    @Test
    void putLeavesGrantsAtOtherScopesAlone() throws Exception {
        grant(member, "club.view", "CLUB", clubB, null);
        grant(member, "user.view", "GLOBAL", null, null);
        call(put("/api/v1/users/" + member + "/permissions"), adminToken, clubSet("club.view"), 200);
        call(put("/api/v1/users/" + member + "/permissions"), adminToken, clubSet(), 200);
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isEqualTo(2);
    }

    @Test
    void putValidatesTheWholeRequestBeforeChangingAnything() throws Exception {
        call(put("/api/v1/users/" + member + "/permissions"), adminToken, clubSet("club.view"), 200);
        JsonNode missing = problem(put("/api/v1/users/" + member + "/permissions"), adminToken,
                clubSet("club.update", "club.teleport"), 404, "PERMISSION_NOT_FOUND");
        assertThat(missing.path("detail").asText()).contains("club.teleport");
        problem(put("/api/v1/users/" + member + "/permissions"), adminToken, clubSet("user.view"), 400, "PERMISSION_SCOPE_MISMATCH");
        Map<String, Object> noClub = clubSet("club.view");
        noClub.remove("clubId");
        problem(put("/api/v1/users/" + member + "/permissions"), adminToken, noClub, 400, "INVALID_PERMISSION_SCOPE");
        problem(put("/api/v1/users/" + member + "/permissions"), adminToken, Map.of("scope", "CLUB"), 400, "VALIDATION_ERROR");
        assertThat(keys(call(get("/api/v1/users/" + member + "/permissions"), adminToken, null, 200))).containsExactly("club.view");
    }

    @Test
    void putNeedsAssignAndRevokeWhenRemoving() throws Exception {
        grant(member, "permission.assign", "GLOBAL", null, null);
        UUID target = user("target@vju.local");
        call(put("/api/v1/users/" + target + "/permissions"), memberToken, clubSet("club.view"), 200);
        problem(put("/api/v1/users/" + target + "/permissions"), memberToken, clubSet(), 403, "PERMISSION_DENIED");
        problem(put("/api/v1/users/" + member + "/permissions"), token(target), clubSet(), 403, "PERMISSION_DENIED");
    }

    @Test
    void corsAllowsPutFromTheFrontend() throws Exception {
        mvc.perform(options("/api/v1/users/" + member + "/permissions").header("Origin", "http://localhost:3000")
                        .header("Access-Control-Request-Method", "PUT"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://localhost:3000"));
    }
}
