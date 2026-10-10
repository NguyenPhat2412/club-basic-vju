package com.vju.club.config;

import org.springframework.web.servlet.mvc.method.annotation.RequestMappingHandlerMapping;

import java.util.List;

public final class SecurityConfigAccess {
    private SecurityConfigAccess() { }

    public static List<String> publicRoutes(RequestMappingHandlerMapping handlerMapping) {
        return SecurityConfig.publicRoutes(handlerMapping).stream()
                .map(route -> (route.method() == null ? "ANY" : route.method().name()) + " " + route.pattern())
                .toList();
    }
}
