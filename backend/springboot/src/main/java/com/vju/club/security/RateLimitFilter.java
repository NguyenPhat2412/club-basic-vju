package com.vju.club.security;

import com.vju.club.error.ProblemResponses;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;

public class RateLimitFilter extends OncePerRequestFilter {
    private final RateLimitService rateLimitService;

    public RateLimitFilter(RateLimitService rateLimitService) {
        this.rateLimitService = rateLimitService;
    }

    @Override
    protected void doFilterInternal(
            HttpServletRequest request,
            HttpServletResponse response,
            FilterChain filterChain) throws ServletException, IOException {
        if (!isRateLimitedEndpoint(request)) {
            filterChain.doFilter(request, response);
            return;
        }

        String route = request.getRequestURI();
        String remoteAddress = request.getRemoteAddr();
        String key = route + ":" + (remoteAddress == null || remoteAddress.isBlank() ? "unknown" : remoteAddress);
        RateLimitDecision decision = rateLimitService.check(key);
        response.setHeader("X-RateLimit-Limit", String.valueOf(rateLimitService.limit()));
        response.setHeader("X-RateLimit-Remaining", String.valueOf(decision.remaining()));
        if (!decision.allowed()) {
            response.setHeader("Retry-After", String.valueOf(decision.retryAfterSeconds()));
            ProblemResponses.write(response, 429, "RATE_LIMIT_EXCEEDED", "Too many requests");
            return;
        }
        filterChain.doFilter(request, response);
    }

    private boolean isRateLimitedEndpoint(HttpServletRequest request) {
        return "POST".equalsIgnoreCase(request.getMethod()) && "/api/v1/auth/login".equals(request.getRequestURI());
    }
}
