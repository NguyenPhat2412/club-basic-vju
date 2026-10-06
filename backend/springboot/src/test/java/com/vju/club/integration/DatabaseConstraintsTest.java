package com.vju.club.integration;

import com.vju.club.auth.RefreshTokenCleanupJob;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.jdbc.core.ConnectionCallback;

import java.sql.ResultSet;
import java.sql.Statement;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/**
 * The database itself (migration V3) must reject invalid data, even when it bypasses the
 * application: raw SQL, another service, or two requests racing past the service checks.
 */
class DatabaseConstraintsTest extends ApiIntegrationTest {

    @Autowired RefreshTokenCleanupJob cleanupJob;

    private void rejects(String constraint, String sql, Object... args) {
        assertThatThrownBy(() -> db.update(sql, args))
                .isInstanceOf(DataIntegrityViolationException.class)
                .hasMessageContaining(constraint);
    }

    // ---- 1. case-insensitive uniqueness ---------------------------------------------------------

    @Test
    void emailIsUniqueIgnoringCase() {
        rejects("uq_users_email_ci",
                "INSERT INTO users(email, password_hash, full_name) VALUES ('MEMBER@Test.Local', 'h', 'x')");
    }

    @Test
    void studentCodeIsUniqueIgnoringCaseButOptional() {
        db.update("INSERT INTO users(email, password_hash, full_name, student_code) VALUES ('s1@x', 'h', 'x', 'VJU-01')");
        rejects("uq_users_student_code_ci",
                "INSERT INTO users(email, password_hash, full_name, student_code) VALUES ('s2@x', 'h', 'x', 'vju-01')");
        db.update("INSERT INTO users(email, password_hash, full_name) VALUES ('n1@x', 'h', 'x'), ('n2@x', 'h', 'x')");
    }

    @Test
    void clubCodeIsUniqueIgnoringCase() {
        rejects("uq_clubs_code_ci", "INSERT INTO clubs(code, name) VALUES ('a', 'lower-case A')");
    }

    @Test
    void departmentNameIsUniqueIgnoringCaseWithinOneClubOnly() {
        rejects("uq_departments_club_name_ci", "INSERT INTO departments(club_id, name) VALUES (?, 'a1')", clubA);
        db.update("INSERT INTO departments(club_id, name) VALUES (?, 'a1')", clubB);
    }

    @Test
    void mixedCaseRegistrationRaceYieldsOneAccountAndConflicts() throws Exception {
        String[] variants = {"Race@Test.Local", "race@test.local", "RACE@TEST.LOCAL", "rAcE@tEsT.lOcAl"};
        int[] next = {0};
        List<Integer> statuses = concurrently(8, () -> {
            String email = variants[next[0]++ % variants.length];
            return () -> send(post("/api/v1/auth/register"), null,
                    Map.of("email", email, "password", PASSWORD, "fullName", "Racer")).getStatus();
        });
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
        assertThat(count("SELECT count(*) FROM users WHERE lower(email) = 'race@test.local'")).isEqualTo(1);
    }

    @Test
    void mixedCaseClubCodeRaceYieldsOneClub() throws Exception {
        String[] variants = {"media", "MEDIA", "Media", "mEdIa"};
        int[] next = {0};
        List<Integer> statuses = concurrently(8, () -> {
            String code = variants[next[0]++ % variants.length];
            return () -> send(post("/api/v1/clubs"), adminToken, Map.of("code", code, "name", "Media")).getStatus();
        });
        assertThat(statuses).containsOnly(201, 409);
        assertThat(statuses).filteredOn(s -> s == 201).hasSize(1);
    }

    // ---- 2. department members stay inside their club -------------------------------------------

    @Test
    void departmentMemberCannotCrossClubsWhateverClubIdIsClaimed() {
        UUID inA = membership(user("x@test.local"), clubA);
        rejects("fk_department_members_membership_club",
                "INSERT INTO department_members(department_id, membership_id, club_id) VALUES (?, ?, ?)", depB1, inA, clubB);
        rejects("fk_department_members_department_club",
                "INSERT INTO department_members(department_id, membership_id, club_id) VALUES (?, ?, ?)", depB1, inA, clubA);
        db.update("INSERT INTO department_members(department_id, membership_id, club_id) VALUES (?, ?, ?)", depA1, inA, clubA);
    }

    @Test
    void movingAssignmentToAnotherClubsDepartmentIsRejected() {
        UUID inA = membership(user("x@test.local"), clubA);
        assign(depA1, inA);
        assertThatThrownBy(() -> db.update("UPDATE department_members SET department_id = ? WHERE membership_id = ?", depB1, inA))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test
    void deletingADepartmentOrMembershipStillCascadesToAssignments() {
        UUID m1 = membership(user("x@test.local"), clubA);
        UUID m2 = membership(user("y@test.local"), clubA);
        assign(depA1, m1);
        assign(depA2, m2);
        db.update("DELETE FROM departments WHERE id = ?", depA1);
        db.update("DELETE FROM memberships WHERE id = ?", m2);
        assertThat(count("SELECT count(*) FROM department_members WHERE membership_id IN (?, ?)", m1, m2)).isZero();
    }

    // ---- 3. membership status and left_at agree -------------------------------------------------

    @Test
    void leftAtIsSetExactlyWhenMembershipIsLeft() {
        UUID mid = membership(user("x@test.local"), clubA);
        rejects("ck_memberships_left_at", "UPDATE memberships SET left_at = now() WHERE id = ?", mid);
        rejects("ck_memberships_left_at", "UPDATE memberships SET status = 'LEFT' WHERE id = ?", mid);
        db.update("UPDATE memberships SET status = 'LEFT', left_at = now() WHERE id = ?", mid);
        rejects("ck_memberships_left_at", "UPDATE memberships SET status = 'SUSPENDED' WHERE id = ?", mid);
        db.update("UPDATE memberships SET status = 'ACTIVE', left_at = NULL WHERE id = ?", mid);
    }

    @Test
    void onlyOneCurrentMembershipPerUserAndClubButHistoryIsUnlimited() {
        UUID userId = user("h@test.local");
        db.update("INSERT INTO memberships(user_id, club_id, status, left_at) VALUES (?, ?, 'LEFT', now() - interval '2 year')", userId, clubA);
        db.update("INSERT INTO memberships(user_id, club_id, status, left_at) VALUES (?, ?, 'LEFT', now() - interval '1 year')", userId, clubA);
        db.update("INSERT INTO memberships(user_id, club_id, status) VALUES (?, ?, 'ACTIVE')", userId, clubA);
        rejects("uq_memberships_user_club_current",
                "INSERT INTO memberships(user_id, club_id, status) VALUES (?, ?, 'SUSPENDED')", userId, clubA);
        db.update("INSERT INTO memberships(user_id, club_id, status) VALUES (?, ?, 'ACTIVE')", userId, clubB);
    }

    // ---- 4. audit logs are immutable -----------------------------------------------------------

    @Test
    void clubWithAuditHistoryCannotBeDeleted() throws Exception {
        UUID lonely = club("LONELY");
        call(post("/api/v1/users/" + member + "/permissions"), adminToken, assignment("club.view", "CLUB", lonely, null), 201);
        call(delete("/api/v1/users/" + member + "/permissions/" + permission("club.view")), adminToken, null, 204);
        rejects("permission_audit_logs_club_id_fkey", "DELETE FROM clubs WHERE id = ?", lonely);
        assertThat(count("SELECT count(*) FROM permission_audit_logs WHERE club_id = ?", lonely)).isEqualTo(2);
    }

    // ---- 5 & 6. revoked_by and permission keys --------------------------------------------------

    @Test
    void revokeRecordsWhoRevoked() throws Exception {
        call(post("/api/v1/users/" + member + "/permissions"), adminToken, assignment("club.update", "CLUB", clubA, null), 201);
        call(delete("/api/v1/users/" + member + "/permissions/" + permission("club.update")), adminToken, null, 204);
        assertThat(db.queryForObject("SELECT revoked_by FROM user_permissions WHERE user_id = ? AND revoked_at IS NOT NULL",
                UUID.class, member)).isEqualTo(admin);
    }

    @Test
    void revokedByRequiresRevokedAt() {
        grant(member, "club.view", "GLOBAL", null, null);
        rejects("ck_user_permissions_revoked_by",
                "UPDATE user_permissions SET revoked_by = ? WHERE user_id = ?", admin, member);
    }

    @Test
    void permissionKeyMustBeModuleDotAction() {
        rejects("ck_permissions_key_matches_module_action",
                "INSERT INTO permissions(permission_key, module, action) VALUES ('club.delete', 'club', 'remove')");
        db.update("DELETE FROM permissions WHERE permission_key = 'club.purge'");
        db.update("INSERT INTO permissions(permission_key, module, action, active) VALUES ('club.purge', 'club', 'purge', false)");
        db.update("DELETE FROM permissions WHERE permission_key = 'club.purge'");
    }

    @Test
    void applicationTextBoundsAreEnforcedByDatabase() {
        UUID applicant = user("application-bounds@test.local");
        assertThatThrownBy(() -> db.update(
                "INSERT INTO club_applications(applicant_id, club_id, message) VALUES (?, ?, ?)",
                applicant, clubA, "x".repeat(2001)))
                .isInstanceOf(DataIntegrityViolationException.class);
    }

    // ---- 7. indexes are usable --------------------------------------------------------------------

    private String plan(String sql) {
        return db.execute((ConnectionCallback<String>) connection -> {
            try (Statement statement = connection.createStatement()) {
                statement.execute("SET enable_seqscan = off");
                StringBuilder plan = new StringBuilder();
                try (ResultSet rows = statement.executeQuery("EXPLAIN " + sql)) {
                    while (rows.next()) plan.append(rows.getString(1)).append('\n');
                }
                statement.execute("RESET enable_seqscan");
                return plan.toString();
            }
        });
    }

    @Test
    void loginAndUniquenessLookupsCanUseIndexes() {
        assertThat(plan("SELECT id FROM users WHERE lower(email) = lower('Admin@Test.Local')")).contains("uq_users_email_ci");
        assertThat(plan("SELECT id FROM clubs WHERE lower(code) = lower('a')")).contains("uq_clubs_code_ci");
        assertThat(plan("SELECT id FROM memberships WHERE club_id = '" + clubA + "' ORDER BY joined_at DESC LIMIT 20"))
                .contains("idx_memberships_club_joined");
        assertThat(plan("SELECT id FROM department_members WHERE department_id = '" + depA1 + "' ORDER BY joined_at LIMIT 20"))
                .contains("idx_department_members_department_joined");
    }

    @Test
    void everyForeignKeyColumnIsIndexed() {
        List<String> unindexed = db.queryForList("""
                SELECT c.conrelid::regclass || '.' || a.attname
                FROM pg_constraint c
                JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
                WHERE c.contype = 'f' AND c.connamespace = current_schema()::regnamespace
                  AND NOT EXISTS (SELECT 1 FROM pg_index i WHERE i.indrelid = c.conrelid AND i.indkey[0] = c.conkey[1])
                """, String.class);
        assertThat(unindexed).isEmpty();
    }

    // ---- 8. updated_at trigger -------------------------------------------------------------------

    @Test
    void rawSqlUpdatesStillBumpUpdatedAt() {
        db.update("UPDATE clubs SET updated_at = now() - interval '1 day' WHERE id = ?", clubA);
        OffsetDateTime before = db.queryForObject("SELECT updated_at FROM clubs WHERE id = ?", OffsetDateTime.class, clubA);
        db.update("UPDATE clubs SET description = 'touched' WHERE id = ?", clubA);
        OffsetDateTime after = db.queryForObject("SELECT updated_at FROM clubs WHERE id = ?", OffsetDateTime.class, clubA);
        assertThat(after).isAfter(before.plusHours(23));
    }

    @Test
    void explicitUpdatedAtFromTheApplicationIsKept() {
        db.update("UPDATE users SET full_name = 'x', updated_at = '2030-01-01T00:00:00Z' WHERE id = ?", member);
        assertThat(db.queryForObject("SELECT updated_at FROM users WHERE id = ?", OffsetDateTime.class, member).getYear())
                .isEqualTo(2030);
    }

    // ---- refresh token cleanup -------------------------------------------------------------------

    @Test
    void cleanupDeletesOnlyTokensDeadForLongerThanRetention() {
        String insert = "INSERT INTO refresh_tokens(user_id, token_hash, expires_at, revoked_at) VALUES (?, ?, ?::timestamptz, ?::timestamptz)";
        db.update(insert, member, "expired-long-ago", "2000-01-01T00:00:00Z", null);
        db.update(insert, member, "revoked-long-ago", "2999-01-01T00:00:00Z", "2000-01-01T00:00:00Z");
        db.update(insert, member, "active", "2999-01-01T00:00:00Z", null);
        db.update("INSERT INTO refresh_tokens(user_id, token_hash, expires_at) VALUES (?, 'just-expired', now() - interval '1 hour')", member);
        db.update("INSERT INTO refresh_tokens(user_id, token_hash, expires_at, revoked_at) "
                + "VALUES (?, 'just-revoked', now() + interval '1 day', now() - interval '1 hour')", member);

        assertThat(cleanupJob.purge()).isEqualTo(2);

        assertThat(db.queryForList("SELECT token_hash FROM refresh_tokens WHERE user_id = ? ORDER BY token_hash", String.class, member))
                .containsExactly("active", "just-expired", "just-revoked");
    }
}
