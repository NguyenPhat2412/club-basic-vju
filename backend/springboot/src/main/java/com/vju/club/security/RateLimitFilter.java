package com.vju.club.security;

import com.vju.club.common.ApiPaths;
import com.vju.club.error.ProblemResponses;
import com.vju.club.service.IpBlocklistService;
import com.vju.club.service.SecurityTelemetryService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

public class RateLimitFilter extends OncePerRequestFilter {
    private static final Set<String> MUTATING_METHODS = Set.of("POST", "PUT", "PATCH", "DELETE");

    private final RateLimitService rateLimitService;
    private final ObjectProvider<SecurityTelemetryService> telemetryProvider;
    private final ObjectProvider<IpBlocklistService> ipBlocklistProvider;

    public RateLimitFilter(RateLimitService rateLimitService) {
        this(rateLimitService, null, null);
    }

    public RateLimitFilter(
            RateLimitService rateLimitService,
            ObjectProvider<SecurityTelemetryService> telemetryProvider,
            ObjectProvider<IpBlocklistService> ipBlocklistProvider) {
        this.rateLimitService = rateLimitService;
        this.telemetryProvider = telemetryProvider;
        this.ipBlocklistProvider = ipBlocklistProvider;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        RequestMetadataExtractor.Metadata meta = RequestMetadataExtractor.extract(request);
        if (isIpBlocked(meta.ipAddress())) {
            ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "IP_BLOCKED",
                    "Your IP address has been temporarily blocked by the system administrator");
            return;
        }

        if (isPublicRateLimitedEndpoint(request)) {
            String route = request.getRequestURI();
            String remoteAddress = meta.ipAddress();
            String key = route + ":" + (remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress);
            RateLimitDecision decision = rateLimitService.check(key);
            if (!applyDecision(response, rateLimitService.limit(), decision, "Too many requests")) {
                recordRateLimit(route, meta, null);
                return;
            }
            filterChain.doFilter(request, response);
            return;
        }

        if (isAuthenticatedMutatingRequest(request)) {
            Optional<UUID> userId = SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication());
            if (userId.isPresent()) {
                RateLimitDecision decision = rateLimitService.checkWrite(userId.get());
                if (!applyDecision(response, rateLimitService.writeLimit(), decision,
                        "Bạn đang thực hiện quá nhiều thao tác trong thời gian ngắn. Vui lòng thử lại sau ít giây.")) {
                    recordRateLimit(request.getRequestURI(), meta, userId.get());
                    return;
                }
            }
        }

        filterChain.doFilter(request, response);
    }

    private boolean isIpBlocked(String ipAddress) {
        if (ipBlocklistProvider == null || ipAddress == null || ipAddress.isBlank()) return false;
        IpBlocklistService blocklist = ipBlocklistProvider.getIfAvailable();
        if (blocklist == null) return false;
        try {
            return blocklist.isBlocked(ipAddress);
        } catch (RuntimeException ignored) {
            return false;
        }
    }

    private void recordRateLimit(String route, RequestMetadataExtractor.Metadata meta, UUID userId) {
        if (telemetryProvider == null) return;
        SecurityTelemetryService telemetry = telemetryProvider.getIfAvailable();
        if (telemetry == null) return;
        try {
            telemetry.recordRateLimitBlocked(route, meta.ipAddress(), meta.userAgent(), userId);
        } catch (RuntimeException ignored) {
        }
    }

    private boolean applyDecision(HttpServletResponse response, int limit, RateLimitDecision decision, String message)
            throws IOException {
        response.setHeader("X-RateLimit-Limit", String.valueOf(limit));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));
        if (!decision.allowed()) {
            response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
            ProblemResponses.write(response, 429, "RATE_LIMIT_EXCEEDED", message);
            return false;
        }
        return true;
    }

    private boolean isPublicRateLimitedEndpoint(HttpServletRequest request) {
        String uri = request.getRequestURI();
        return "POST".equalsIgnoreCase(request.getMethod()) && (
                ApiPaths.FULL_AUTH_LOGIN.equals(uri)
                        || ApiPaths.FULL_AUTH_REGISTER.equals(uri)
                        || ApiPaths.FULL_AUTH_GOOGLE.equals(uri)
                        || ApiPaths.FULL_AUTH_FORGOT_PASSWORD.equals(uri)
                        || ApiPaths.FULL_AUTH_RESET_PASSWORD.equals(uri)
                        || ApiPaths.FULL_AUTH_TWO_FACTOR_SEND.equals(uri)
                        || ApiPaths.FULL_AUTH_TWO_FACTOR_VERIFY.equals(uri)
                        || (ApiPaths.API_V1 + ApiPaths.PUBLIC_I18N_TRANSLATE_BATCH).equals(uri));
    }

    private boolean isAuthenticatedMutatingRequest(HttpServletRequest request) {
        String method = request.getMethod();
        if (method == null || !MUTATING_METHODS.contains(method.toUpperCase())) {
            return false;
        }
        String uri = request.getRequestURI();
        return uri != null && uri.startsWith(ApiPaths.API_V1 + "/") && !ApiPaths.FULL_AUTH_LOGOUT.equals(uri);
    }
}
