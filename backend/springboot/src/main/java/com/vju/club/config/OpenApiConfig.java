package com.vju.club.config;

import io.swagger.v3.oas.annotations.OpenAPIDefinition;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeIn;
import io.swagger.v3.oas.annotations.enums.SecuritySchemeType;
import io.swagger.v3.oas.annotations.info.Info;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.security.SecurityScheme;
import org.springframework.context.annotation.Configuration;

@Configuration
@OpenAPIDefinition(
        info = @Info(title = "VJU Club API", version = "v1"),
        security = @SecurityRequirement(name = OpenApiConfig.SESSION_AUTH))
@SecurityScheme(
        name = OpenApiConfig.SESSION_AUTH,
        type = SecuritySchemeType.APIKEY,
        in = SecuritySchemeIn.COOKIE,
        paramName = "CLUB_SESSION",
        description = "Session cookie set by POST /api/v1/auth/login. Unsafe methods also need the "
                + "XSRF-TOKEN cookie value in the X-XSRF-TOKEN header (GET /api/v1/auth/csrf sets the cookie).")
public class OpenApiConfig {
    static final String SESSION_AUTH = "sessionAuth";
}
