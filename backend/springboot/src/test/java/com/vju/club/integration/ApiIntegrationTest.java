package com.vju.club.integration;

import com.vju.club.modules.club.entity.Club;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.vju.club.modules.auth.service.JwtTokenService;
import com.vju.club.modules.user.entity.User;
import org.junit.jupiter.api.BeforeEach;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Callable;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.function.Supplier;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

/**
 * Base for API tests against a real PostgreSQL (docker-compose.test.yml). Every subclass shares one
 * Spring context and one isolated schema; data is wiped before each test.
 *
 * <p>Fixture: {@code admin} holds every permission globally, {@code member} holds none. Clubs A and B
 * each have departments (A1, A2 in A; B1 in B).
 */
@SpringBootTest
@ActiveProfiles("test")
abstract class ApiIntegrationTest {

    private static final String SCHEMA = "test_it_" + UUID.randomUUID().toString().replace("-", "");
    static final String PASSWORD = "Password123!";

    @DynamicPropertySource
    static void databaseSchema(DynamicPropertyRegistry properties) {
        TestDatabase.register(properties);
        properties.add("spring.flyway.schemas", () -> SCHEMA);
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
    }

    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    @Autowired PasswordEncoder passwords;
    @Autowired JwtTokenService tokens;
    @Autowired JwtEncoder encoder;

    MockMvc mvc;
    final ObjectMapper json = new ObjectMapper();
    UUID admin, member, clubA, clubB, depA1, depA2, depB1;
    String adminToken, memberToken;

    @BeforeEach
    void resetDatabase() {
        mvc = MockMvcBuilders.webAppContextSetup(context).apply(springSecurity()).build();
        db.execute("TRUNCATE users, clubs CASCADE");
        db.update("UPDATE permissions SET active = true");
        db.update("DELETE FROM roles WHERE NOT system");
        db.update("UPDATE roles SET active = true");
        admin = user("admin@test.local");
        member = user("member@test.local");
        for (UUID permission : db.queryForList("SELECT id FROM permissions", UUID.class)) {
            db.update("INSERT INTO user_permissions(user_id, permission_id, scope, granted_by) VALUES (?, ?, 'GLOBAL', ?)",
                    admin, permission, admin);
        }
        clubA = club("A");
        clubB = club("B");
        depA1 = department(clubA, "A1");
        depA2 = department(clubA, "A2");
        depB1 = department(clubB, "B1");
        adminToken = token(admin);
        memberToken = token(member);
    }

    // ---- fixtures -------------------------------------------------------------------------------

    UUID user(String email) {
        return user(email, "ACTIVE");
    }

    UUID user(String email, String status) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO users(id, email, password_hash, full_name, status) VALUES (?, ?, ?, ?, ?)",
                id, email, passwords.encode(PASSWORD), email, status);
        return id;
    }

    UUID club(String code) {
        return club(code, "ACTIVE");
    }

    UUID club(String code, String status) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO clubs(id, code, name, status) VALUES (?, ?, ?, ?)", id, code, "Club " + code, status);
        return id;
    }

    UUID department(UUID clubId, String name) {
        return department(clubId, name, "ACTIVE");
    }

    UUID department(UUID clubId, String name, String status) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO departments(id, club_id, name, status) VALUES (?, ?, ?, ?)", id, clubId, name, status);
        return id;
    }

    UUID membership(UUID userId, UUID clubId) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO memberships(id, user_id, club_id) VALUES (?, ?, ?)", id, userId, clubId);
        return id;
    }

    void assign(UUID departmentId, UUID membershipId) {
        db.update("INSERT INTO department_members(department_id, membership_id, club_id) "
                + "SELECT ?, ?, club_id FROM departments WHERE id = ?", departmentId, membershipId, departmentId);
    }

    String token(UUID id) {
        User user = new User();
        user.setId(id);
        user.setEmail("test@local");
        return tokens.issueAccessToken(user).value();
    }

    UUID permission(String key) {
        return db.queryForObject("SELECT id FROM permissions WHERE permission_key = ?", UUID.class, key);
    }

    void grant(UUID userId, String key, String scope, UUID clubId, UUID departmentId) {
        db.update("INSERT INTO user_permissions(user_id, permission_id, scope, club_id, department_id, granted_by) "
                + "VALUES (?, ?, ?, ?, ?, ?)", userId, permission(key), scope, clubId, departmentId, admin);
    }

    Map<String, Object> assignment(String key, String scope, UUID clubId, UUID departmentId) {
        Map<String, Object> body = new LinkedHashMap<>();
        body.put("permissionId", permission(key));
        body.put("scope", scope);
        if (clubId != null) body.put("clubId", clubId);
        if (departmentId != null) body.put("departmentId", departmentId);
        return body;
    }

    int count(String sql, Object... args) {
        return db.queryForObject(sql, Integer.class, args);
    }

    // ---- HTTP -----------------------------------------------------------------------------------

    MockHttpServletResponse send(MockHttpServletRequestBuilder request, String bearer, Object body) throws Exception {
        if (bearer != null) request.header("Authorization", "Bearer " + bearer);
        if (body != null) request.contentType("application/json").content(json.writeValueAsString(body));
        return mvc.perform(request).andReturn().getResponse();
    }

    /** Sends the request, asserts the status and returns the parsed JSON body (null node if empty). */
    JsonNode call(MockHttpServletRequestBuilder request, String bearer, Object body, int status) throws Exception {
        var built = request.buildRequest(context.getServletContext());
        MockHttpServletResponse response = send(request, bearer, body);
        String content = response.getContentAsString();
        assertThat(response.getStatus()).as("%s %s -> %s", built.getMethod(), built.getRequestURI(), content)
                .isEqualTo(status);
        return content.isEmpty() ? json.nullNode() : json.readTree(content);
    }

    /** Asserts an RFC 7807 error with the given status and code. */
    JsonNode problem(MockHttpServletRequestBuilder request, String bearer, Object body, int status, String code)
            throws Exception {
        JsonNode node = call(request, bearer, body, status);
        assertThat(node.path("code").asText()).as("error code").isEqualTo(code);
        assertThat(node.path("title").asText()).isEqualTo(code);
        assertThat(node.path("status").asInt()).isEqualTo(status);
        return node;
    }

    static UUID id(JsonNode node) {
        return UUID.fromString(node.path("id").asText());
    }

    /** Fires all requests at the same instant and returns their HTTP statuses. */
    List<Integer> concurrently(int threads, Supplier<Callable<Integer>> request) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        try {
            CountDownLatch start = new CountDownLatch(1);
            List<Future<Integer>> futures = new ArrayList<>();
            for (int i = 0; i < threads; i++) {
                Callable<Integer> task = request.get();
                futures.add(pool.submit(() -> {
                    start.await();
                    return task.call();
                }));
            }
            start.countDown();
            List<Integer> statuses = new ArrayList<>();
            for (Future<Integer> future : futures) statuses.add(future.get());
            return statuses;
        } finally {
            pool.shutdownNow();
        }
    }
}
