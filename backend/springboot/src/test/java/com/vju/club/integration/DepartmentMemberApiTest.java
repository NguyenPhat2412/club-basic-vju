package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class DepartmentMemberApiTest extends ApiIntegrationTest {

    private String members(UUID departmentId) {
        return "/api/v1/departments/" + departmentId + "/members";
    }

    private UUID activeMember(String email, UUID clubId) {
        return membership(user(email), clubId);
    }

    @Test
    void addAssignsAnActiveMemberOfTheSameClub() throws Exception {
        UUID mid = activeMember("x@test.local", clubA);
        JsonNode added = call(post(members(depA1)), adminToken, Map.of("membershipId", mid), 201);
        assertThat(added.path("departmentId").asText()).isEqualTo(depA1.toString());
        assertThat(added.path("membershipId").asText()).isEqualTo(mid.toString());
        problem(post(members(depA1)), adminToken, Map.of("membershipId", mid), 409, "DEPARTMENT_MEMBER_ALREADY_EXISTS");
        call(post(members(depA2)), adminToken, Map.of("membershipId", mid), 201);
    }

    @Test
    void addRejectsInvalidTargets() throws Exception {
        UUID inB = activeMember("b@test.local", clubB);
        problem(post(members(depA1)), adminToken, Map.of("membershipId", inB), 400, "CROSS_CLUB_ASSIGNMENT");
        problem(post(members(depA1)), adminToken, Map.of("membershipId", UUID.randomUUID()), 404, "MEMBERSHIP_NOT_FOUND");
        UUID closed = department(clubA, "Closed", "INACTIVE");
        problem(post(members(closed)), adminToken, Map.of("membershipId", activeMember("c@test.local", clubA)), 409,
                "DEPARTMENT_INACTIVE");
        UUID suspended = activeMember("s@test.local", clubA);
        db.update("UPDATE memberships SET status = 'SUSPENDED' WHERE id = ?", suspended);
        problem(post(members(depA1)), adminToken, Map.of("membershipId", suspended), 409, "MEMBERSHIP_NOT_ACTIVE");
    }

    @Test
    void concurrentAddsOfOneMemberCreateOneAssignment() throws Exception {
        UUID mid = activeMember("r@test.local", clubA);
        List<Integer> statuses = concurrently(8, () -> () ->
                send(post(members(depA1)), adminToken, Map.of("membershipId", mid)).getStatus());
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    @Test
    void listPagesInTheDatabaseWithArbitraryOffsets() throws Exception {
        List<UUID> ids = new ArrayList<>();
        for (int i = 0; i < 5; i++) {
            UUID mid = activeMember("p" + i + "@test.local", clubA);
            db.update("INSERT INTO department_members(department_id, membership_id, joined_at) "
                    + "VALUES (?, ?, now() + (? * interval '1 second'))", depA1, mid, i);
            ids.add(mid);
        }
        assign(depA2, ids.get(0));

        JsonNode page = call(get(members(depA1)).param("offset", "3").param("limit", "2"), adminToken, null, 200);
        assertThat(page.path("total").asInt()).isEqualTo(5);
        assertThat(page.path("items").size()).isEqualTo(2);
        assertThat(page.at("/items/0/membershipId").asText()).isEqualTo(ids.get(3).toString());
        assertThat(page.at("/items/1/membershipId").asText()).isEqualTo(ids.get(4).toString());
        assertThat(page.at("/items/0/userId").asText()).isNotBlank();

        JsonNode tail = call(get(members(depA1)).param("offset", "4").param("limit", "10"), adminToken, null, 200);
        assertThat(tail.path("items").size()).isEqualTo(1);
    }

    @Test
    void removeDeletesOnlyThatAssignment() throws Exception {
        UUID mid = activeMember("x@test.local", clubA);
        assign(depA1, mid);
        assign(depA2, mid);
        call(delete(members(depA1) + "/" + mid), adminToken, null, 204);
        problem(delete(members(depA1) + "/" + mid), adminToken, null, 404, "DEPARTMENT_MEMBER_NOT_FOUND");
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT status FROM memberships WHERE id = ?", String.class, mid)).isEqualTo("ACTIVE");
    }

    @Test
    void moveKeepsExactlyOneAssignment() throws Exception {
        UUID mid = activeMember("x@test.local", clubA);
        assign(depA1, mid);
        UUID assignmentId = db.queryForObject("SELECT id FROM department_members WHERE membership_id = ?", UUID.class, mid);

        JsonNode moved = call(patch(members(depA1) + "/" + mid), adminToken, Map.of("targetDepartmentId", depA2), 200);

        assertThat(moved.path("departmentId").asText()).isEqualTo(depA2.toString());
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isEqualTo(1);
        assertThat(db.queryForObject("SELECT id FROM department_members WHERE membership_id = ?", UUID.class, mid))
                .isEqualTo(assignmentId);
    }

    @Test
    void moveRejectsInvalidTargets() throws Exception {
        UUID mid = activeMember("x@test.local", clubA);
        assign(depA1, mid);
        String path = members(depA1) + "/" + mid;
        problem(patch(path), adminToken, Map.of("targetDepartmentId", depA1), 400, "SAME_DEPARTMENT");
        problem(patch(path), adminToken, Map.of("targetDepartmentId", depB1), 400, "CROSS_CLUB_MOVE");
        problem(patch(path), adminToken, Map.of("targetDepartmentId", UUID.randomUUID()), 404, "DEPARTMENT_NOT_FOUND");
        UUID closed = department(clubA, "Closed", "INACTIVE");
        problem(patch(path), adminToken, Map.of("targetDepartmentId", closed), 409, "DEPARTMENT_INACTIVE");
        assign(depA2, mid);
        problem(patch(path), adminToken, Map.of("targetDepartmentId", depA2), 409, "DEPARTMENT_MEMBER_ALREADY_EXISTS");
        problem(patch(members(depA2) + "/" + UUID.randomUUID()), adminToken, Map.of("targetDepartmentId", depA1), 404,
                "DEPARTMENT_MEMBER_NOT_FOUND");
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", mid)).isEqualTo(2);
    }

    @Test
    void clubLevelGrantManagesMembersOfEveryDepartmentInTheClub() throws Exception {
        UUID mid = activeMember("x@test.local", clubA);
        grant(member, "department.member.add", "CLUB", clubA, null);
        grant(member, "department.member.remove", "CLUB", clubA, null);
        grant(member, "department.member.view", "CLUB", clubA, null);

        call(post(members(depA1)), memberToken, Map.of("membershipId", mid), 201);
        call(patch(members(depA1) + "/" + mid), memberToken, Map.of("targetDepartmentId", depA2), 200);
        call(get(members(depA2)), memberToken, null, 200);
        call(delete(members(depA2) + "/" + mid), memberToken, null, 204);
        problem(get(members(depB1)), memberToken, null, 403, "PERMISSION_DENIED");
    }

    @Test
    void missingDepartmentCannotBeProbed() throws Exception {
        UUID ghost = UUID.randomUUID();
        problem(get(members(ghost)), adminToken, null, 404, "DEPARTMENT_NOT_FOUND");
        grant(member, "department.member.view", "DEPARTMENT", null, depA1);
        problem(get(members(ghost)), memberToken, null, 403, "PERMISSION_DENIED");
        problem(get(members(depA2)), memberToken, null, 403, "PERMISSION_DENIED");
        call(get(members(depA1)), memberToken, null, 200);
    }
}
