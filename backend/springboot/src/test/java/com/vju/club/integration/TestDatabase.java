package com.vju.club.integration;

import org.springframework.test.context.DynamicPropertyRegistry;
import org.testcontainers.postgresql.PostgreSQLContainer;

final class TestDatabase {
    private static final String EXTERNAL_URL = System.getenv("TEST_DB_URL");
    private static PostgreSQLContainer container;

    private TestDatabase() { }

    static void register(DynamicPropertyRegistry properties) {
        if (EXTERNAL_URL != null && !EXTERNAL_URL.isBlank()) {
            properties.add("spring.datasource.url", () -> EXTERNAL_URL);
            properties.add("spring.datasource.username", () -> env("TEST_DB_USERNAME", "club_test"));
            properties.add("spring.datasource.password", () -> env("TEST_DB_PASSWORD", "club_test_local"));
            return;
        }
        PostgreSQLContainer postgres = container();
        properties.add("spring.datasource.url", postgres::getJdbcUrl);
        properties.add("spring.datasource.username", postgres::getUsername);
        properties.add("spring.datasource.password", postgres::getPassword);
    }

    private static synchronized PostgreSQLContainer container() {
        if (container == null) {
            container = new PostgreSQLContainer("postgres:16-alpine")
                    .withDatabaseName("club_test")
                    .withUsername("club_test")
                    .withPassword("club_test_local");
            container.start();
        }
        return container;
    }

    private static String env(String name, String fallback) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? fallback : value;
    }
}
