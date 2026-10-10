package com.vju.club.integration;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;

import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@ActiveProfiles("prod")
class ProdProfileStartupTest {

    private static final String SCHEMA = "test_prod_" + UUID.randomUUID().toString().replace("-", "");

    @DynamicPropertySource
    static void properties(DynamicPropertyRegistry properties) {
        TestDatabase.register(properties);
        properties.add("spring.flyway.schemas", () -> SCHEMA);
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
        properties.add("CORS_ALLOWED_ORIGINS", () -> "https://vju-club.example.test");
        properties.add("COOKIE_DOMAIN", () -> "example.test");
        properties.add("STORAGE_TYPE", () -> "local");
        properties.add("BOOTSTRAP_ADMIN_EMAIL", () -> "prod-admin@example.test");
        properties.add("BOOTSTRAP_ADMIN_PASSWORD", () -> "Prod-Admin-12345");
    }

    @Autowired ApplicationContext context;
    @Autowired JdbcTemplate db;

    @Test
    void startsWithoutDemoDataAndCreatesOnlyTheConfiguredAdmin() {
        assertThat(context.containsBean("demoDataSeeder")).isFalse();
        assertThat(db.queryForList("SELECT email FROM users", String.class)).containsExactly("prod-admin@example.test");
        assertThat(db.queryForObject("SELECT count(*) FROM user_roles ur JOIN roles r ON r.id = ur.role_id "
                + "WHERE r.code = 'SYSTEM_ADMIN' AND ur.revoked_at IS NULL", Integer.class)).isEqualTo(1);
    }
}
