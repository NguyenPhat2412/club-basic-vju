package com.vju.club.integration;

import com.fasterxml.jackson.databind.JsonNode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * Sprint 2 - Part 1/3 Acceptance Tests
 * Phụ trách: Đoàn Kinh Quốc (Backend Dev, Database)
 * 
 * Kiểm thử toàn diện các User Story & Acceptance Criteria:
 * - PB-11: Khám phá & Lọc CLB theo lĩnh vực (TC-PB-11-01..04)
 * - PB-16.2: Tạm ngưng hoặc khôi phục Membership (TC-PB-16.2-01..04)
 * - PB-16.3: Rời CLB & Thu hồi quyền, bảo toàn lịch sử (TC-PB-16.3-01..04)
 * - PB-17.2: Chuyển thành viên giữa 2 ban cùng CLB (TC-PB-17.2-01..04)
 * - PB-17.3: Gỡ thành viên khỏi ban chuyên môn (TC-PB-17.3-01..03)
 * - PB-35.1: Lịch sử tham gia CLB cá nhân (TC-PB-35.1-01..04)
 */
class SprintTwoMembershipAcceptanceTest extends ApiIntegrationTest {

    @Test
    @DisplayName("PB-11 (TC-PB-11-01..04): Public club discovery, category filtering, search keyword & inactive isolation")
    void testPublicClubDiscoveryAndCategoryFilter() throws Exception {
        call(patch("/api/v1/clubs/" + clubA), adminToken,
                Map.of("name", "VJU Japanese Culture Club", "activityField", "Văn hóa"), 200);
        call(patch("/api/v1/clubs/" + clubB), adminToken,
                Map.of("name", "VJU IT & AI Club", "activityField", "Công nghệ"), 200);
        UUID inactiveClub = club("INACT", "INACTIVE");
        db.update("UPDATE clubs SET name = 'Inactive Secret Club', activity_field = 'Bí mật' WHERE id = ?", inactiveClub);

        // AC01: Public categories API returns distinct categories of active clubs only
        JsonNode categories = call(get("/api/v1/public/clubs/categories"), null, null, 200);
        assertThat(categories.toString()).contains("Văn hóa", "Công nghệ").doesNotContain("Bí mật");

        // AC02: Search by keyword and filter by category simultaneously
        JsonNode searchResult = call(get("/api/v1/public/clubs")
                .param("query", "Japanese")
                .param("category", "Văn hóa"), null, null, 200);
        assertThat(searchResult.path("total").asInt()).isEqualTo(1);
        assertThat(searchResult.at("/items/0/id").asText()).isEqualTo(clubA.toString());

        // AC03: Filter with non-matching combo returns empty result without errors
        JsonNode emptyResult = call(get("/api/v1/public/clubs")
                .param("query", "Japanese")
                .param("category", "Công nghệ"), null, null, 200);
        assertThat(emptyResult.path("total").asInt()).isZero();
        assertThat(emptyResult.path("items").size()).isZero();

        // AC04: Inactive clubs are never exposed via public endpoints or general queries
        JsonNode studentBrowse = call(get("/api/v1/public/clubs").param("query", "Secret"), null, null, 200);
        assertThat(studentBrowse.path("total").asInt()).isZero();
    }

    @Test
    @DisplayName("PB-16.2 (TC-PB-16.2-01..04): Membership suspension, permission suppression, and active restoration")
    void testMembershipSuspensionAndRestoration() throws Exception {
        UUID student = user("student.suspend@test.local");
        String studentToken = token(student);
        UUID membershipId = membership(student, clubA);
        assign(depA1, membershipId);

        // Grant club-scoped permission to student
        grant(student, "member.view", "CLUB", clubA, null);
        grant(member, "member.update", "CLUB", clubA, null);

        // Before suspension: student can view club members
        call(get("/api/v1/clubs/" + clubA + "/memberships"), studentToken, null, 200);

        // AC01: Vice-President or authorized officer suspends membership
        call(patch("/api/v1/memberships/" + membershipId), memberToken, Map.of("status", "SUSPENDED"), 200);

        // AC02: While SUSPENDED, effective permissions view suppresses club-scoped permissions
        problem(get("/api/v1/clubs/" + clubA + "/memberships"), studentToken, null, 403, "PERMISSION_DENIED");

        // AC03: Cannot reactivate if club is inactive
        db.update("UPDATE clubs SET status = 'INACTIVE' WHERE id = ?", clubA);
        problem(patch("/api/v1/memberships/" + membershipId), memberToken,
                Map.of("status", "ACTIVE"), 409, "CLUB_INACTIVE");
        db.update("UPDATE clubs SET status = 'ACTIVE' WHERE id = ?", clubA);

        // Reactivate membership successfully
        call(patch("/api/v1/memberships/" + membershipId), memberToken, Map.of("status", "ACTIVE"), 200);
        call(get("/api/v1/clubs/" + clubA + "/memberships"), studentToken, null, 200);

        // AC04: Audit log records status change
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'MEMBER_STATUS_CHANGED' AND resource_id = ?",
                membershipId)).isGreaterThanOrEqualTo(2);
    }

    @Test
    @DisplayName("PB-16.3 (TC-PB-16.3-01..04): Member leaves club, auto-revoking departments, roles, and preserving history")
    void testMemberLeavesClub() throws Exception {
        UUID student = user("student.leave@test.local");
        String studentToken = token(student);
        UUID membershipId = membership(student, clubA);
        assign(depA1, membershipId);
        assign(depA2, membershipId);
        grant(student, "department.member.view", "DEPARTMENT", null, depA1);
        grant(member, "member.remove", "CLUB", clubA, null);

        // AC01: Authorized manager removes member (status -> LEFT)
        call(delete("/api/v1/memberships/" + membershipId), memberToken, null, 204);

        // AC02 & AC03: Department assignments and club-scoped permissions are revoked
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id = ?", membershipId)).isZero();
        problem(get("/api/v1/departments/" + depA1 + "/members"), studentToken, null, 403, "PERMISSION_DENIED");

        // Record leftAt is populated and history remains queryable
        String leftAt = db.queryForObject("SELECT left_at::text FROM memberships WHERE id = ?", String.class, membershipId);
        assertThat(leftAt).isNotNull();

        // AC04: Cannot patch a LEFT membership back to ACTIVE directly
        grant(member, "member.update", "CLUB", clubA, null);
        problem(patch("/api/v1/memberships/" + membershipId), memberToken,
                Map.of("status", "ACTIVE"), 409, "MEMBERSHIP_ALREADY_LEFT");

        // Audit log records removal
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'MEMBER_REMOVED' AND resource_id = ?",
                membershipId)).isEqualTo(1);
    }

    @Test
    @DisplayName("PB-17.2 (TC-PB-17.2-01..04): Move member atomically between departments in the same club")
    void testMoveDepartmentMember() throws Exception {
        UUID student = user("student.move@test.local");
        UUID membershipId = membership(student, clubA);
        assign(depA1, membershipId);

        // Member has department-scoped role in depA1
        UUID roleHead = role("DEPARTMENT_HEAD");
        db.update("INSERT INTO user_roles(user_id, role_id, scope, club_id, department_id, granted_by) VALUES (?, ?, 'DEPARTMENT', ?, ?, ?)",
                student, roleHead, clubA, depA1, admin);

        // Manager requires both department.member.remove (depA1) and department.member.add (depA2)
        grant(member, "department.member.remove", "DEPARTMENT", null, depA1);
        grant(member, "department.member.add", "DEPARTMENT", null, depA2);

        // AC01 & AC03: Move member from depA1 to depA2 atomically
        JsonNode moved = call(patch("/api/v1/departments/" + depA1 + "/members/" + membershipId),
                memberToken, Map.of("targetDepartmentId", depA2), 200);
        assertThat(moved.path("departmentId").asText()).isEqualTo(depA2.toString());

        // AC02: Old department assignment is gone; new one exists
        assertThat(count("SELECT count(*) FROM department_members WHERE department_id = ? AND membership_id = ?",
                depA1, membershipId)).isZero();
        assertThat(count("SELECT count(*) FROM department_members WHERE department_id = ? AND membership_id = ?",
                depA2, membershipId)).isEqualTo(1);

        // Old department roles are revoked
        assertThat(count("SELECT count(*) FROM user_roles WHERE user_id = ? AND department_id = ? AND revoked_at IS NULL",
                student, depA1)).isZero();

        // Cross-club move is rejected (400 CROSS_CLUB_MOVE)
        grant(member, "department.member.remove", "DEPARTMENT", null, depA2);
        grant(member, "department.member.add", "DEPARTMENT", null, depB1);
        problem(patch("/api/v1/departments/" + depA2 + "/members/" + membershipId),
                memberToken, Map.of("targetDepartmentId", depB1), 400, "CROSS_CLUB_MOVE");

        // Same department move is rejected (400 SAME_DEPARTMENT)
        problem(patch("/api/v1/departments/" + depA2 + "/members/" + membershipId),
                memberToken, Map.of("targetDepartmentId", depA2), 400, "SAME_DEPARTMENT");
    }

    @Test
    @DisplayName("PB-17.3 (TC-PB-17.3-01..03): Remove member from department preserves active club membership")
    void testRemoveMemberFromDepartment() throws Exception {
        UUID student = user("student.deptremove@test.local");
        UUID membershipId = membership(student, clubA);
        assign(depA1, membershipId);

        grant(member, "department.member.remove", "DEPARTMENT", null, depA1);

        // AC01: Remove assignment
        call(delete("/api/v1/departments/" + depA1 + "/members/" + membershipId), memberToken, null, 204);

        // AC02: Member is removed from depA1 but membership in clubA remains ACTIVE
        assertThat(count("SELECT count(*) FROM department_members WHERE department_id = ? AND membership_id = ?",
                depA1, membershipId)).isZero();
        String clubMembershipStatus = db.queryForObject("SELECT status FROM memberships WHERE id = ?", String.class, membershipId);
        assertThat(clubMembershipStatus).isEqualTo("ACTIVE");

        // AC03: Audit log records department member removal
        assertThat(count("SELECT count(*) FROM audit_logs WHERE action = 'DEPARTMENT_MEMBER_REMOVED' AND club_id = ?",
                clubA)).isEqualTo(1);
    }

    @Test
    @DisplayName("PB-35.1 (TC-PB-35.1-01..04): Personal membership history sorted by joinedAt desc with department listing")
    void testPersonalMembershipHistory() throws Exception {
        UUID student = user("student.history@test.local");
        String studentToken = token(student);

        // Historical left membership in clubB
        UUID m1 = membership(student, clubB);
        db.update("UPDATE memberships SET joined_at = now() - interval '60 days', left_at = now() - interval '10 days', status = 'LEFT' WHERE id = ?", m1);

        // Active current membership in clubA with department assignments
        UUID m2 = membership(student, clubA);
        db.update("UPDATE memberships SET joined_at = now() - interval '5 days', status = 'ACTIVE' WHERE id = ?", m2);
        assign(depA1, m2);
        assign(depA2, m2);

        // AC01: Personal history query
        JsonNode history = call(get("/api/v1/users/me/memberships"), studentToken, null, 200);
        assertThat(history.path("total").asInt()).isEqualTo(2);

        // AC02: Items sorted by joinedAt desc (m2 is newer than m1)
        assertThat(history.at("/items/0/id").asText()).isEqualTo(m2.toString());
        assertThat(history.at("/items/0/status").asText()).isEqualTo("ACTIVE");
        assertThat(history.at("/items/0/departments").size()).isEqualTo(2);

        // AC03: m1 is in history as LEFT with leftAt date
        assertThat(history.at("/items/1/id").asText()).isEqualTo(m1.toString());
        assertThat(history.at("/items/1/status").asText()).isEqualTo("LEFT");
        assertThat(history.at("/items/1/leftAt").isTextual()).isTrue();

        // AC04: Filter by status returns exactly matched subset
        JsonNode activeOnly = call(get("/api/v1/users/me/memberships").param("status", "ACTIVE"), studentToken, null, 200);
        assertThat(activeOnly.path("total").asInt()).isEqualTo(1);
        assertThat(activeOnly.at("/items/0/id").asText()).isEqualTo(m2.toString());
    }

    private UUID role(String code) {
        return db.queryForObject("SELECT id FROM roles WHERE code = ?", UUID.class, code);
    }
}
