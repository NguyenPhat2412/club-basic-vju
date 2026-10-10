package com.vju.club.integration;

import com.vju.club.config.SecurityConfigAccess;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class PublicEndpointApiTest extends ApiIntegrationTest {
    @Autowired @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping;

    @Test
    void exactlyTheAnnotatedHandlersArePublic() {
        assertThat(SecurityConfigAccess.publicRoutes(handlerMapping)).containsExactlyInAnyOrder(
                "POST /api/v1/auth/login", "GET /api/v1/auth/csrf",
                "GET /api/v1/api-catalog", "GET /api-docs/phase1.yaml");
    }

    @Test
    void publicRoutesWorkWithoutASessionAndOthersDoNot() throws Exception {
        call(get("/api/v1/api-catalog"), null, null, 200);
        problem(post("/api/v1/auth/login"), null, Map.of("email", "member@test.local", "password", "wrong-password"),
                401, "INVALID_CREDENTIALS");
        problem(get("/api/v1/auth/me"), null, null, 401, "UNAUTHORIZED");
        call(post("/api/v1/auth/logout"), null, null, 204);
        problem(get("/api/v1/auth/login"), null, null, 401, "UNAUTHORIZED");
    }
}
