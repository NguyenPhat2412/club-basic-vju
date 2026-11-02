package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class MembershipApiTest extends ApiIntegrationTest {
    @Test
    void personalHistoryIncludesOnlyOwnMembershipsAndTheirDepartments() throws Exception {
        UUID own = membership(member, clubA);
        assign(depA1, own);
        assign(depA2, own);
        UUID other = membership(user("history-other@test.local"), clubB);
        assign(depB1, other);

        JsonNode history = call(get("/api/v1/users/me/memberships"), memberToken, null, 200);

        assertThat(history.path("total").asInt()).isEqualTo(1);
        assertThat(history.at("/items/0/id").asText()).isEqualTo(own.toString());
        assertThat(history.at("/items/0/departments").size()).isEqualTo(2);
        assertThat(history.at("/items/0/departments").toString())
                .contains(depA1.toString(), depA2.toString(), "A1", "A2").doesNotContain(depB1.toString());
        call(delete("/api/v1/memberships/" + own), adminToken, null, 204);
        JsonNode left = call(get("/api/v1/users/me/memberships").param("status", "LEFT"), memberToken, null, 200);
        assertThat(left.at("/items/0/leftAt").isTextual()).isTrue();
        assertThat(left.at("/items/0/departments").isArray()).isTrue();
        assertThat(left.at("/items/0/departments").size()).isZero();
    }

    private JsonNode join(UUID clubId, UUID userId) throws Exception {
        return call(post("/api/v1/clubs/" + clubId + "/memberships"), adminToken, Map.of("userId", userId), 201);
    }

    private String status(UUID membershipId) {
        return db.queryForObject("SELECT status FROM memberships WHERE id = ?", String.class, membershipId);
    }

    @Test
    void joiningCreatesAnActiveMembership() throws Exception {
        JsonNode created = join(clubA, member);
        assertThat(created.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(created.path("userId").asText()).isEqualTo(member.toString());
        assertThat(created.path("clubId").asText()).isEqualTo(clubA.toString());
        assertThat(created.path("leftAt").isNull()).isTrue();
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 409,
                "MEMBERSHIP_ALREADY_EXISTS");
    }

    @Test
    void concurrentJoinsCreateOneMembership() throws Exception {
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member)).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    @Test
    void cannotJoinInactiveClubOrAddInactiveUser() throws Exception {
        UUID closed = club("CLOSED", "INACTIVE");
        problem(post("/api/v1/clubs/" + closed + "/memberships"), adminToken, Map.of("userId", member), 409, "CLUB_INACTIVE");
        UUID sleeper = user("sleeper@test.local", "INACTIVE");
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", sleeper), 409, "USER_INACTIVE");
    }

    @Test
    void missingClubOrUserIs404() throws Exception {
        problem(post("/api/v1/clubs/" + UUID.randomUUID() + "/memberships"), adminToken, Map.of("userId", member), 404, "CLUB_NOT_FOUND");
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", UUID.randomUUID()), 404, "USER_NOT_FOUND");
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of(), 400, "VALIDATION_ERROR");
    }

    @Test
    void leavingRemovesDepartmentAssignmentsAndIsIdempotent() throws Exception {
        UUID mid = id(join(clubA, member));
        assign(depA1, mid);
        assign(depA2, mid);

        call(delete("/api/v1/memberships/" + mid), adminToken, null, 204);
        assertThat(status(mid)).isEqualTo("LEFT");
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isZero();
        var leftAt = db.queryForObject("SELECT left_at FROM memberships WHERE id = ?", java.time.OffsetDateTime.class, mid);
        assertThat(leftAt).isNotNull();

        call(delete("/api/v1/memberships/" + mid), adminToken, null, 204);
        assertThat(db.queryForObject("SELECT left_at FROM memberships WHERE id = ?", java.time.OffsetDateTime.class, mid))
                .isEqualTo(leftAt);
    }

    @Test
    void rejoiningCreatesANewMembershipAndKeepsTheHistory() throws Exception {
        UUID first = id(join(clubA, member));
        call(delete("/api/v1/memberships/" + first), adminToken, null, 204);

        JsonNode rejoined = join(clubA, member);
        UUID second = id(rejoined);
        assertThat(second).isNotEqualTo(first);
        assertThat(rejoined.path("status").asText()).isEqualTo("ACTIVE");
        assertThat(rejoined.path("leftAt").isNull()).isTrue();
        assertThat(status(first)).isEqualTo("LEFT");
        assertThat(db.queryForObject("SELECT left_at IS NOT NULL FROM memberships WHERE id = ?", Boolean.class, first)).isTrue();
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", member, clubA)).isEqualTo(2);

        call(delete("/api/v1/memberships/" + second), adminToken, null, 204);
        join(clubA, member);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ?", member, clubA)).isEqualTo(3);
    }

    @Test
    void concurrentRejoinsCreateOneCurrentMembership() throws Exception {
        UUID first = id(join(clubA, member));
        call(delete("/api/v1/memberships/" + first), adminToken, null, 204);
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member)).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status <> 'LEFT'",
                member, clubA)).isEqualTo(1);
    }

    @Test
    void historyIsListedAndCanBeFilteredByStatus() throws Exception {
        UUID first = id(join(clubA, member));
        call(delete("/api/v1/memberships/" + first), adminToken, null, 204);
        UUID current = id(join(clubA, member));
        membership(user("other@test.local"), clubA);

        JsonNode all = call(get("/api/v1/clubs/" + clubA + "/memberships"), adminToken, null, 200);
        assertThat(all.path("total").asInt()).isEqualTo(3);
        JsonNode left = call(get("/api/v1/clubs/" + clubA + "/memberships").param("status", "LEFT"), adminToken, null, 200);
        assertThat(left.path("total").asInt()).isEqualTo(1);
        assertThat(left.at("/items/0/id").asText()).isEqualTo(first.toString());
        JsonNode active = call(get("/api/v1/clubs/" + clubA + "/memberships").param("status", "ACTIVE"), adminToken, null, 200);
        assertThat(active.path("total").asInt()).isEqualTo(2);
        assertThat(active.toString()).contains(current.toString()).doesNotContain(first.toString());
        problem(get("/api/v1/clubs/" + clubA + "/memberships").param("status", "GONE"), adminToken, null, 400, "VALIDATION_ERROR");
    }

    @Test
    void suspendedMemberCannotBeReAddedButCanBeReactivated() throws Exception {
        UUID mid = id(join(clubA, member));
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "SUSPENDED"), 200);
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 409, "MEMBERSHIP_ALREADY_EXISTS");
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "ACTIVE"), 200);
        assertThat(status(mid)).isEqualTo("ACTIVE");
    }

    @Test
    void patchingToLeftBehavesLikeLeavingAndIsFinal() throws Exception {
        UUID mid = id(join(clubA, member));
        assign(depA1, mid);
        JsonNode left = call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "LEFT"), 200);
        assertThat(left.path("leftAt").isNull()).isFalse();
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isZero();
        problem(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "ACTIVE"), 409, "MEMBERSHIP_ALREADY_LEFT");
        problem(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "SUSPENDED"), 409, "MEMBERSHIP_ALREADY_LEFT");
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "LEFT"), 200);
        assertThat(status(mid)).isEqualTo("LEFT");
    }

    @Test
    void suspendingKeepsDepartmentAssignments() throws Exception {
        UUID mid = id(join(clubA, member));
        assign(depA1, mid);
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "SUSPENDED"), 200);
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isEqualTo(1);
    }

    @Test
    void listIsPagedAndCountsTheWholeClub() throws Exception {
        for (int i = 0; i < 5; i++) membership(user("m" + i + "@test.local"), clubA);
        membership(member, clubB);
        JsonNode page = call(get("/api/v1/clubs/" + clubA + "/memberships").param("offset", "3").param("limit", "2"),
                adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(5);
        assertThat(page.path("items").size()).isEqualTo(2);
        problem(get("/api/v1/clubs/" + UUID.randomUUID() + "/memberships"), adminToken, null, 404, "CLUB_NOT_FOUND");
    }

    @Test
    void clubScopedPermissionsStayInsideTheirClub() throws Exception {
        UUID inA = membership(user("a@test.local"), clubA);
        UUID inB = membership(user("b@test.local"), clubB);
        grant(member, "member.view", "CLUB", clubA, null);
        grant(member, "member.view_detail", "CLUB", clubA, null);
        grant(member, "member.update", "CLUB", clubA, null);

        call(get("/api/v1/clubs/" + clubA + "/memberships"), memberToken, null, 200);
        problem(get("/api/v1/clubs/" + clubB + "/memberships"), memberToken, null, 403, "PERMISSION_DENIED");
        call(get("/api/v1/memberships/" + inA), memberToken, null, 200);
        problem(get("/api/v1/memberships/" + inB), memberToken, null, 403, "PERMISSION_DENIED");
        call(patch("/api/v1/memberships/" + inA), memberToken, Map.of("status", "SUSPENDED"), 200);
        problem(patch("/api/v1/memberships/" + inB), memberToken, Map.of("status", "SUSPENDED"), 403, "PERMISSION_DENIED");
        problem(delete("/api/v1/memberships/" + inA), memberToken, null, 403, "PERMISSION_DENIED");
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), memberToken, Map.of("userId", admin), 403, "PERMISSION_DENIED");
    }

    @Test
    void missingMembershipCannotBeProbed() throws Exception {
        UUID ghost = UUID.randomUUID();
        problem(get("/api/v1/memberships/" + ghost), adminToken, null, 404, "MEMBERSHIP_NOT_FOUND");
        problem(delete("/api/v1/memberships/" + ghost), adminToken, null, 404, "MEMBERSHIP_NOT_FOUND");
        grant(member, "member.view_detail", "CLUB", clubA, null);
        problem(get("/api/v1/memberships/" + ghost), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void transitionMatrixSuppressesClubAndDepartmentPermissionsWhileSuspendedAndEnforcesRestorePreconditions() throws Exception {
        UUID mid = id(join(clubA, member));
        assign(depA1, mid);
        grant(member, "club.update", "CLUB", clubA, null);
        grant(member, "department.update", "DEPARTMENT", null, depA1);

        // Unsupported INACTIVE transition is rejected without changing state or recording audit
        long auditsBefore = count("SELECT count(*) FROM audit_logs WHERE resource_id = ?", mid);
        problem(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "INACTIVE"),
                409, "INVALID_MEMBERSHIP_STATUS_TRANSITION");
        assertThat(status(mid)).isEqualTo("ACTIVE");
        assertThat(count("SELECT count(*) FROM audit_logs WHERE resource_id = ?", mid)).isEqualTo(auditsBefore);

        // Suspend suppresses both CLUB and DEPARTMENT permissions and blocks new grants
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "SUSPENDED"), 200);
        problem(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "blocked"), 403, "PERMISSION_DENIED");
        problem(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "blocked"), 403, "PERMISSION_DENIED");
        problem(post("/api/v1/users/" + member + "/permissions"), adminToken,
                Map.of("permissionId", permission("member.add"), "scope", "CLUB", "clubId", clubA),
                409, "MEMBERSHIP_NOT_ACTIVE");

        // Restore requires both Club and User to be ACTIVE
        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "ACTIVE"), 409, "CLUB_INACTIVE");
        db.update("UPDATE clubs SET status = 'ACTIVE' WHERE id = ?", clubA);

        db.update("UPDATE users SET status = 'INACTIVE' WHERE id = ?", member);
        problem(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "ACTIVE"), 409, "USER_INACTIVE");
        db.update("UPDATE users SET status = 'ACTIVE' WHERE id = ?", member);

        // Restore succeeds and re-enables retained permissions
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "ACTIVE"), 200);
        call(patch("/api/v1/clubs/" + clubA), memberToken, Map.of("description", "restored"), 200);
        call(patch("/api/v1/departments/" + depA1), memberToken, Map.of("description", "restored"), 200);

        // SUSPENDED -> LEFT permanently revokes roles/permissions and clears department memberships
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "SUSPENDED"), 200);
        call(patch("/api/v1/memberships/" + mid), adminToken, Map.of("status", "LEFT"), 200);
        assertThat(status(mid)).isEqualTo("LEFT");
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isZero();
        assertThat(count("SELECT count(*) FROM user_permissions WHERE user_id = ? AND revoked_at IS NULL", member)).isZero();
    }

    @Test
    void directAddRespectsClubLimitAndRacesCleanlyWithApplicationApproval() throws Exception {
        join(clubB, member);
        db.update("UPDATE system_settings SET max_active_clubs = 1");
        problem(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member),
                409, "MEMBERSHIP_LIMIT_REACHED");
        db.update("UPDATE system_settings SET max_active_clubs = 0");

        UUID applicant = user("direct-vs-approve@test.local");
        JsonNode app = call(post("/api/v1/clubs/" + clubA + "/applications"), token(applicant),
                Map.of("message", "race direct add"), 201);
        java.util.concurrent.atomic.AtomicInteger turn = new java.util.concurrent.atomic.AtomicInteger();
        List<Integer> statuses = concurrently(2, () -> () -> {
            if (turn.getAndIncrement() == 0) {
                return send(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", applicant)).getStatus();
            }
            return send(post("/api/v1/clubs/" + clubA + "/applications/" + id(app) + "/approve"), adminToken, Map.of()).getStatus();
        });
        assertThat(statuses).filteredOn(s -> s == 200 || s == 201).hasSize(1);
        assertThat(statuses).filteredOn(s -> s == 409).hasSize(1);
        assertThat(count("SELECT count(*) FROM memberships WHERE user_id = ? AND club_id = ? AND status = 'ACTIVE'",
                applicant, clubA)).isEqualTo(1);
        assertThat(count("SELECT count(*) FROM club_applications WHERE id = ? AND status = 'PENDING'", id(app))).isZero();
    }
}
