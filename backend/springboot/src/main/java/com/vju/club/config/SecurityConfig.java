package com.vju.club.config;

import com.vju.club.modules.permission.entity.Permission;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.vju.club.modules.auth.annotation.PublicEndpoint;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
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

import java.util.ArrayList;
import java.util.List;
import java.util.Set;

@Configuration
@EnableMethodSecurity
public class SecurityConfig {

    @Bean
    SecurityFilterChain securityFilterChain(
            HttpSecurity http,
            AccountStatusFilter accountStatusFilter,
            RateLimitFilter rateLimitFilter,
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .cors(Customizer.withDefaults())
                .sessionManagement(session -> session.sessionCreationPolicy(SessionCreationPolicy.STATELESS))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(authorize -> {
                    // Handlers annotated with @PublicEndpoint are open; everything else needs a token.
                    publicRoutes(handlerMapping).forEach(route ->
                            authorize.requestMatchers(route.method(), route.pattern()).permitAll());
                    authorize.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll();
                    authorize.anyRequest().authenticated();
                });
        http.oauth2ResourceServer(oauth2 -> oauth2
                .jwt(Customizer.withDefaults())
                .authenticationEntryPoint(authenticationEntryPoint())
                .accessDeniedHandler(accessDeniedHandler()));
        http.addFilterBefore(rateLimitFilter, BearerTokenAuthenticationFilter.class);
        http.addFilterAfter(accountStatusFilter, BearerTokenAuthenticationFilter.class);
        return http.build();
    }

    record PublicRoute(HttpMethod method, String pattern) { }

    /** Every (method, path) served by a handler annotated with {@link PublicEndpoint}. */
    static List<PublicRoute> publicRoutes(RequestMappingHandlerMapping handlerMapping) {
        List<PublicRoute> routes = new ArrayList<>();
        handlerMapping.getHandlerMethods().forEach((info, handler) -> {
            if (!handler.hasMethodAnnotation(PublicEndpoint.class)) return;
            Set<RequestMethod> methods = info.getMethodsCondition().getMethods();
            for (String pattern : info.getPatternValues()) {
                if (methods.isEmpty()) {
                    routes.add(new PublicRoute(null, pattern));
                } else {
                    methods.forEach(m -> routes.add(new PublicRoute(HttpMethod.valueOf(m.name()), pattern)));
                }
            }
        });
        return routes;
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
