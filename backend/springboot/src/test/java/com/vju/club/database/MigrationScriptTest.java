package com.vju.club.database;

import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.Set;
import java.util.regex.Pattern;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

class MigrationScriptTest {

    private static final Path MIGRATION = Path.of("src/main/resources/db/migration/V1__create_phase1_schema.sql");
    private static final Set<String> TABLES = Set.of(
            "users", "clubs", "departments", "memberships",
            "department_members", "permissions", "user_permissions",
            "permission_audit_logs"
    );

    @Test
    void migrationDefinesAllPhaseOneTablesAndPermissionSeed() throws IOException {
        String sql = Files.readString(MIGRATION);

        assertEquals(8, Pattern.compile("CREATE TABLE", Pattern.CASE_INSENSITIVE)
                .matcher(sql).results().count());
        TABLES.forEach(table -> assertTrue(
                sql.matches("(?s).*CREATE TABLE\\s+" + table + "\\s*\\(.*"),
                "missing table " + table));
        assertTrue(sql.contains("ON CONFLICT (permission_key) DO NOTHING"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX uq_user_permissions_active_global"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX uq_user_permissions_active_club"));
        assertTrue(sql.contains("CREATE UNIQUE INDEX uq_user_permissions_active_department"));
        assertTrue(sql.contains("password_hash"));
        assertTrue(!sql.contains("password TEXT"));
    }
}
