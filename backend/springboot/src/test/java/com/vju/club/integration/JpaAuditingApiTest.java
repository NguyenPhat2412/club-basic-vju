package com.vju.club.integration;

import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Spring Data JPA auditing records who created and who last changed each business record. */
class JpaAuditingApiTest extends ApiIntegrationTest {

    private UUID who(String table, String column, UUID id) {
        return db.queryForObject("SELECT " + column + " FROM " + table + " WHERE id = ?", UUID.class, id);
    }

    @Test
    void creatorAndLastEditorAreTheSignedInUsers() throws Exception {
        UUID club = id(call(post("/api/v1/clubs"), adminToken, Map.of("code", "AUD1", "name", "Audited"), 201));
        assertThat(who("clubs", "created_by", club)).isEqualTo(admin);
        assertThat(who("clubs", "updated_by", club)).isEqualTo(admin);

        grant(member, "club.update", "CLUB", club, null);
        call(patch("/api/v1/clubs/" + club), memberToken, Map.of("description", "edited by member"), 200);
        assertThat(who("clubs", "created_by", club)).as("creator never changes").isEqualTo(admin);
        assertThat(who("clubs", "updated_by", club)).isEqualTo(member);
    }

    @Test
    void everyAuditedEntityIsStamped() throws Exception {
        UUID department = id(call(post("/api/v1/clubs/" + clubA + "/departments"), adminToken, Map.of("name", "Stamped"), 201));
        UUID membership = id(call(post("/api/v1/clubs/" + clubA + "/memberships"), adminToken, Map.of("userId", member), 201));
        call(patch("/api/v1/users/me"), memberToken, Map.of("fullName", "Edited Myself"), 200);

        assertThat(who("departments", "created_by", department)).isEqualTo(admin);
        assertThat(who("memberships", "created_by", membership)).isEqualTo(admin);
        assertThat(who("users", "updated_by", member)).isEqualTo(member);
    }

    @Test
    void actionsWithoutASignedInUserLeaveItEmpty() throws Exception {
        UUID registered = id(call(post("/api/v1/auth/register"), null,
                Map.of("email", "anon@test.local", "password", PASSWORD, "fullName", "Anonymous"), 201));
        assertThat(who("users", "created_by", registered)).isNull();
        assertThat(who("users", "updated_by", registered)).isNull();
    }

    @Test
    void rawSqlChangesDoNotPretendToKnowTheEditor() throws Exception {
        UUID club = id(call(post("/api/v1/clubs"), adminToken, Map.of("code", "AUD2", "name", "Raw"), 201));
        db.update("UPDATE clubs SET description = 'by sql' WHERE id = ?", club);
        assertThat(who("clubs", "updated_by", club)).isEqualTo(admin);
    }
}
