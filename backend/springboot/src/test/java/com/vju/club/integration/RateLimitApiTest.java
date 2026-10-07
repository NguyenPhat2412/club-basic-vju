package com.vju.club.integration;

import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.test.context.TestPropertySource;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

/** Runs in its own context with a tiny quota so the limiter is exercised end to end. */
@TestPropertySource(properties = {"app.rate-limit.max-requests=3", "app.rate-limit.window=1m"})
class RateLimitApiTest extends ApiIntegrationTest {

    private MockHttpServletResponse login(String ip) throws Exception {
        return send(post("/api/v1/auth/login").with(request -> {
            request.setRemoteAddr(ip);
            return request;
        }), null, Map.of("email", "member@test.local", "password", "wrong-password"));
    }

    @Test
    void fourthLoginFromOneAddressWithinTheWindowIsThrottled() throws Exception {
        for (int i = 0; i < 3; i++) {
            MockHttpServletResponse response = login("198.51.100.1");
            assertThat(response.getStatus()).isEqualTo(401);
            assertThat(response.getHeader("X-RateLimit-Limit")).isEqualTo("3");
            assertThat(response.getHeader("X-RateLimit-Remaining")).isEqualTo(String.valueOf(2 - i));
        }
        MockHttpServletResponse throttled = login("198.51.100.1");
        assertThat(throttled.getStatus()).isEqualTo(429);
        assertThat(throttled.getHeader("Retry-After")).isNotBlank();
        assertThat(throttled.getContentType()).startsWith("application/problem+json");
        assertThat(json.readTree(throttled.getContentAsString()).path("code").asText()).isEqualTo("RATE_LIMIT_EXCEEDED");

        // Another client is unaffected, and so are non-auth endpoints.
        assertThat(login("198.51.100.2").getStatus()).isEqualTo(401);
        for (int i = 0; i < 5; i++) {
            assertThat(send(get("/api/v1/users/me"), memberToken, null).getStatus()).isEqualTo(200);
        }
    }

    @Test
    void throttledRequestsNeverReachTheAuthLogic() throws Exception {
        for (int i = 0; i < 3; i++) login("198.51.100.9");
        MockHttpServletResponse response = send(post("/api/v1/auth/login").with(request -> {
            request.setRemoteAddr("198.51.100.9");
            return request;
        }), null, Map.of("email", "member@test.local", "password", PASSWORD));
        assertThat(response.getStatus()).isEqualTo(429);
    }
}
