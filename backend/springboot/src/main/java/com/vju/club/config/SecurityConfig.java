package com.vju.club.config;

import com.vju.club.modules.permission.entity.Permission;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.http.HttpMethod;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.config.http.SessionCreationPolicy;
import org.springframework.security.oauth2.jwt.JwtValidationException;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.oauth2.server.resource.web.authentication.BearerTokenAuthenticationFilter;
import com.vju.club.error.ProblemResponses;
import com.vju.club.security.AccountStatusFilter;
import com.vju.club.security.RateLimitFilter;
import org.springframework.security.config.Customizer;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import jakarta.servlet.http.HttpServletResponse;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AccountStatusFilter accountStatusFilter,
            RateLimitFilter rateLimitFilter) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(authorize -> authorize
                        .requestMatchers(HttpMethod.GET, "/api/v1/api-catalog").permitAll()
                        .requestMatchers(HttpMethod.GET, "/api-docs/phase1.yaml").permitAll()
                        .requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll()
                        .requestMatchers("/api/v1/auth/register", "/api/v1/auth/login", "/api/v1/auth/refresh-token").permitAll()
                        .anyRequest().authenticated());
        http.oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()));
        http.addFilterBefore(rateLimitFilter, BearerTokenAuthenticationFilter.class);
        http.addFilterAfter(accountStatusFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    private AuthenticationEntryPoint authenticationEntryPoint() {
        return (request, response, exception) -> {
            if (isExpiredToken(exception)) {
                // Distinct code so clients know to call /auth/refresh-token instead of logging in again.
                ProblemResponses.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "AUTH_TOKEN_EXPIRED", "Access token has expired");
            } else {
                ProblemResponses.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "UNAUTHORIZED", "Authentication is required");
            }
        };
    }

    /** True when JWT validation failed only because the token's exp is in the past. */
    static boolean isExpiredToken(Throwable exception) {
        for (Throwable cause = exception; cause != null; cause = cause.getCause()) {
            if (cause instanceof JwtValidationException validation) {
                return validation.getErrors().stream().anyMatch(error ->
                        error.getDescription() != null && error.getDescription().startsWith("Jwt expired at"));
            }
        }
        return false;
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, exception) -> ProblemResponses.write(
                response, HttpServletResponse.SC_FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
