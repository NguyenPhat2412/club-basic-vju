package com.vju.club.security;

import com.vju.club.config.RateLimitProperties;
import jakarta.servlet.ServletException;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockFilterChain;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;

import java.io.IOException;
import java.time.Clock;
import java.time.Duration;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class RateLimitFilterTest {
    @AfterEach
    void clearSecurityContext() {
        SecurityContextHolder.clearContext();
    }
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
    void limitsPublicAiTranslateBatchEndpoint() throws Exception {
        RateLimitFilter filter = filter(1);

        MockHttpServletResponse first = invoke(filter, "/api/v1/public/i18n/translate-batch", "10.0.0.9");
        MockHttpServletResponse second = invoke(filter, "/api/v1/public/i18n/translate-batch", "10.0.0.9");

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
        assertThat(second.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");
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
        request.addHeader("CF-Connecting-IP", "198.51.100.77");
        MockHttpServletResponse first = invoke(filter, request);
        MockHttpServletResponse second = invoke(filter, request("/api/v1/auth/login", "10.0.0.1", "POST"));

        assertThat(first.getStatus()).isEqualTo(200);
        assertThat(second.getStatus()).isEqualTo(429);
    }

    @Test
    void requestMetadataExtractorPrefersAuthoritativeXRealIpOverSpoofedCfHeader() {
        MockHttpServletRequest req = request("/api/v1/auth/login", "127.0.0.1", "POST");
        req.addHeader("X-Real-IP", "203.0.113.10");
        req.addHeader("CF-Connecting-IP", "198.51.100.99");

        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extract(req);
        assertThat(meta.ipAddress()).isEqualTo("203.0.113.10");
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

    @Test
    void limitsAuthenticatedMutatingRequestsPerUserWithoutBlockingReadsOrLogout() throws Exception {
        RateLimitProperties properties = new RateLimitProperties();
        properties.setEnabled(true);
        properties.setWriteMaxRequests(2);
        properties.setWriteWindow(Duration.ofMinutes(1));
        RateLimitFilter filter = new RateLimitFilter(new RateLimitService(properties, Clock.systemUTC()));

        UUID userA = UUID.randomUUID();
        UUID userB = UUID.randomUUID();
        authenticate(userA);

        assertThat(invoke(filter, "/api/v1/clubs", "10.0.0.1", "POST").getStatus()).isEqualTo(200);
        assertThat(invoke(filter, "/api/v1/clubs/123", "10.0.0.1", "PUT").getStatus()).isEqualTo(200);
        MockHttpServletResponse third = invoke(filter, "/api/v1/clubs/123", "10.0.0.1", "DELETE");
        assertThat(third.getStatus()).isEqualTo(429);
        assertThat(third.getContentType()).startsWith("application/problem+json");
        assertThat(third.getContentAsString()).contains("RATE_LIMIT_EXCEEDED");

        // GET reads and logout are still permitted
        assertThat(invoke(filter, "/api/v1/clubs", "10.0.0.1", "GET").getStatus()).isEqualTo(200);
        assertThat(invoke(filter, "/api/v1/auth/logout", "10.0.0.1", "POST").getStatus()).isEqualTo(200);

        // Another authenticated user has an independent write quota
        authenticate(userB);
        assertThat(invoke(filter, "/api/v1/clubs", "10.0.0.1", "POST").getStatus()).isEqualTo(200);
    }

    private void authenticate(UUID userId) {
        ClubPrincipal principal = new ClubPrincipal(userId, userId + "@vju.local", "pw", true);
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(principal, null, List.of()));
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
