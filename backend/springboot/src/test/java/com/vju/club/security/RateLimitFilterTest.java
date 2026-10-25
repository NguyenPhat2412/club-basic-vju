package com.vju.club.security;

import com.vju.club.config.RateLimitProperties;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {
    @Test
    void limitsTheLoginEndpoint() throws Exception {
        RateLimitFilter filter = filter(2);

        MockHttpServletResponse first = invoke(filter, "/api/v1/auth/login", "10.0.0.1");
        MockHttpServletResponse second = invoke(filter, "/api/v1/auth/login", "10.0.0.1");
        MockHttpServletResponse third = invoke(filter, "/api/v1/auth/login", "10.0.0.1");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(200);
        assertThat(third.getStatus()).isEqualTo(429);
        assertThat(third.getHeader("Retry-After")).isNotBlank();
        assertThat(third.getContentType()).startsWith("application/problem+json");
        assertThat(third.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
    }

    @Test
    void doesNotLimitBusinessEndpointsOrNonPostRequests() throws Exception {
        RateLimitFilter filter = filter(1);

        MockHttpServletResponse getResponse = invoke(filter, "/api/v1/auth/login", "10.0.0.1", "GET");
        MockHttpServletResponse businessResponse = invoke(filter, "/api/v1/clubs", "10.0.0.1");
        MockHttpServletResponse secondBusinessResponse = invoke(filter, "/api/v1/clubs", "10.0.0.1");

        assertThat(getResponse.getStatus()).isEqualTo(200);
        assertThat(businessResponse.getStatus()).isEqualTo(200);
        assertThat(secondBusinessResponse.getStatus()).isEqualTo(200);
    }

    @Test
    void usesRemoteAddressAndDoesNotTrustSpoofedForwardedHeaders() throws Exception {
        RateLimitFilter filter = filter(1);

        MockHttpServletRequest request = request("/api/v1/auth/login", "10.0.0.1", "POST");
        request.addHeader("X-Forwarded-For", "10.0.0.2");
        MockHttpServletResponse first = invoke(filter, request);
        MockHttpServletResponse second = invoke(filter, request("/api/v1/auth/login", "10.0.0.1", "POST"));

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
    }

    @Test
    void filterStopsTheChainWhenQuotaIsExceeded() throws Exception {
        RateLimitFilter filter = filter(1);
        invoke(filter, "/api/v1/auth/login", "10.0.0.1");

        MockFilterChain chain = new MockFilterChain();
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request("/api/v1/auth/login", "10.0.0.1", "POST"), response, chain);

        assertThat(response.getStatus()).isEqualTo(429);
        assertThat(chain.getRequest()).isNull();
    }

    @Test
    void disabledFilterPassesEveryRequest() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setEnabled(false);
        RateLimitFilter filter = new RateLimitFilter(
                new RateLimitService(properties, Clock.systemUTC()));

        MockHttpServletResponse first = invoke(filter, "/api/v1/auth/login", "10.0.0.1");
        MockHttpServletResponse second = invoke(filter, "/api/v1/auth/login", "10.0.0.1");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(200);
    }

    private RateLimitFilter filter(int limit) {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setMaxRequests(limit);
        properties.setWindow(Duration.ofMinutes(1));
        return new RateLimitFilter(new RateLimitService(properties, Clock.systemUTC()));
    }

    private MockHttpServletResponse invoke(RateLimitFilter filter, String path, String ip)
            throws ServletException, IOException {
        return invoke(filter, request(path, ip, "POST"));
    }

    private MockHttpServletResponse invoke(RateLimitFilter filter, String path, String ip, String method)
            throws ServletException, IOException {
        return invoke(filter, request(path, ip, method));
    }

    private MockHttpServletResponse invoke(RateLimitFilter filter, MockHttpServletRequest request)
            throws ServletException, IOException {
        MockHttpServletResponse response = new MockHttpServletResponse();
        filter.doFilter(request, response, new MockFilterChain());
        return response;
    }

    private MockHttpServletRequest request(String path, String ip, String method) {
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setMethod(method);
        request.setRequestURI(path);
        request.setRemoteAddr(ip);
        return request;
    }
}
