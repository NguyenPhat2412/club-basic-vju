package com.vju.club.integration;

import org.flywaydb.core.Flyway;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import javax.sql.DataSource;
import java.sql.Connection;
import java.sql.Statement;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class PhaseTwoMigrationTest extends ApiIntegrationTest {

    @Autowired DataSource dataSource;

    @Test
    void upgradesPopulatedPhaseOneSchemaWithoutLosingDataAndIsRepeatable() throws Exception {
        String schema = "phase2_upgrade_" + UUID.randomUUID().toString().replace("-", "");
        try {
            Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .target("6").load().migrate();
            try (Connection connection = dataSource.getConnection(); Statement sql = connection.createStatement()) {
                sql.execute("INSERT INTO " + schema + ".users(email, password_hash, full_name) VALUES ('upgrade@test.local', 'hash', 'Student')");
                sql.execute("INSERT INTO " + schema + ".clubs(code, name) VALUES ('UPGRADE', 'Upgrade Club')");
                sql.execute("INSERT INTO " + schema + ".memberships(user_id, club_id) SELECT u.id, c.id FROM "
                        + schema + ".users u CROSS JOIN " + schema + ".clubs c");
            }
            Flyway phaseTwo = Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema).load();
            // Phase 2 adds the application workflow and notifications migrations.
            assertThat(phaseTwo.migrate().migrationsExecuted).isEqualTo(2);
            phaseTwo.validate();
            assertThat(phaseTwo.migrate().migrationsExecuted).isZero();
            assertThat(count("SELECT count(*) FROM " + schema + ".memberships")).isEqualTo(1);
            assertThat(count("SELECT count(*) FROM " + schema + ".permissions WHERE module = 'application'")).isEqualTo(7);
            db.execute("INSERT INTO " + schema + ".club_applications(applicant_id, club_id, message) SELECT u.id, c.id, 'hello' FROM "
                    + schema + ".users u CROSS JOIN " + schema + ".clubs c");
            assertThat(count("SELECT count(*) FROM " + schema + ".club_applications WHERE status = 'PENDING'")).isEqualTo(1);
        } finally {
            db.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
