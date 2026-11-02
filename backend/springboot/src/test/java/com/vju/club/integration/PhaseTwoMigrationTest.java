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
    void upgradesPopulatedPhaseOneSchemaThroughLatestSprintTwoMigrationsWithoutLosingData() throws Exception {
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

            Flyway phaseTwoCore = Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema)
                    .target("8").load();
            assertThat(phaseTwoCore.migrate().migrationsExecuted).isEqualTo(2);
            try (Connection connection = dataSource.getConnection(); Statement sql = connection.createStatement()) {
                sql.execute("INSERT INTO " + schema + ".club_applications(applicant_id, club_id, message) "
                        + "SELECT u.id, c.id, 'hello' FROM " + schema + ".users u CROSS JOIN " + schema + ".clubs c");
                sql.execute("INSERT INTO " + schema + ".notifications(user_id, title, message, reference_id) "
                        + "SELECT ca.applicant_id, 'Đơn đăng ký', 'Kết quả', ca.id FROM " + schema + ".club_applications ca");
            }

            Flyway latest = Flyway.configure().dataSource(dataSource).schemas(schema).defaultSchema(schema).load();
            assertThat(latest.migrate().migrationsExecuted).isGreaterThanOrEqualTo(12);
            latest.validate();
            assertThat(latest.migrate().migrationsExecuted).isZero();

            assertThat(count("SELECT count(*) FROM " + schema + ".memberships")).isEqualTo(1);
            assertThat(count("SELECT count(*) FROM " + schema + ".permissions WHERE module = 'application'")).isGreaterThanOrEqualTo(7);
            assertThat(count("SELECT count(*) FROM " + schema + ".club_applications WHERE status = 'PENDING'")).isEqualTo(1);
            assertThat(db.queryForObject(
                    "SELECT reference_type FROM " + schema + ".notifications LIMIT 1", String.class))
                    .isEqualTo("CLUB_APPLICATION");

            // Verify internal_note column exists on club_applications
            db.execute("UPDATE " + schema + ".club_applications SET internal_note = 'BCN internal note'");
            assertThat(count("SELECT count(*) FROM " + schema + ".club_applications WHERE internal_note = 'BCN internal note'"))
                    .isEqualTo(1);

            // Verify effective_user_permissions suppresses club permissions when membership is SUSPENDED
            assertThat(count("SELECT count(*) FROM " + schema + ".effective_user_permissions")).isGreaterThan(0);
            db.execute("UPDATE " + schema + ".memberships SET status = 'SUSPENDED'");
            assertThat(count("SELECT count(*) FROM " + schema + ".effective_user_permissions")).isZero();
        } finally {
            db.execute("DROP SCHEMA IF EXISTS " + schema + " CASCADE");
        }
    }
}
