package com.vju.club.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import com.vju.club.modules.auth.annotation.PublicEndpoint;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.RequestMethod;
import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;
import org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.security.web.access.intercept.AuthorizationFilter;
import org.springframework.security.web.authentication.logout.HttpStatusReturningLogoutSuccessHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfException;
import org.springframework.security.web.csrf.CsrfFilter;
import org.springframework.security.web.csrf.CsrfTokenRepository;
import org.springframework.security.web.savedrequest.NullRequestCache;
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
            SecurityContextRepository securityContextRepository,
            CsrfTokenRepository csrfTokenRepository,
            @Qualifier("requestMappingHandlerMapping") RequestMappingHandlerMapping handlerMapping) throws Exception {
        http
                .csrf(csrf -> csrf.spa().csrfTokenRepository(csrfTokenRepository))
                .cors(Customizer.withDefaults())
                .securityContext(context -> context.securityContextRepository(securityContextRepository))
                .requestCache(cache -> cache.requestCache(new NullRequestCache()))
                .logout(logout -> logout
                        .logoutUrl("/api/v1/auth/logout")
                        .logoutSuccessHandler(new HttpStatusReturningLogoutSuccessHandler(HttpStatus.NO_CONTENT)))
                .exceptionHandling(exceptions -> exceptions
                        .authenticationEntryPoint(authenticationEntryPoint())
                        .accessDeniedHandler(accessDeniedHandler()))
                .authorizeHttpRequests(authorize -> {
                    publicRoutes(handlerMapping).forEach(route ->
                            authorize.requestMatchers(route.method(), route.pattern()).permitAll());
                    authorize.requestMatchers("/swagger-ui.html", "/swagger-ui/**", "/v3/api-docs/**").permitAll();
                    authorize.anyRequest().authenticated();
                });
        http.addFilterBefore(rateLimitFilter, CsrfFilter.class);
        http.addFilterBefore(accountStatusFilter, AuthorizationFilter.class);
        return http.build();
    }

    record PublicRoute(HttpMethod method, String pattern) { }

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
        return (request, response, exception) -> ProblemResponses.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                "UNAUTHORIZED", "Authentication is required");
    }

    private AccessDeniedHandler accessDeniedHandler() {
        return (request, response, exception) -> {
            if (exception instanceof CsrfException) {
                ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN,
                        "CSRF_INVALID", "Missing or invalid CSRF token");
            } else {
                ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN,
                        "PERMISSION_DENIED", "Permission denied");
            }
        };
    }
}
