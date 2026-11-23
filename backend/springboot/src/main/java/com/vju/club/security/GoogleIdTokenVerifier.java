package com.vju.club.security;

import com.vju.club.error.ApiException;
import org.springframework.http.HttpStatus;
import org.springframework.security.oauth2.core.DelegatingOAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2Error;
import org.springframework.security.oauth2.core.OAuth2TokenValidator;
import org.springframework.security.oauth2.core.OAuth2TokenValidatorResult;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwtTimestampValidator;

import java.util.Set;
import java.util.function.Supplier;

public class GoogleIdTokenVerifier {
    static final Set<String> ISSUERS = Set.of("https://accounts.google.com", "accounts.google.com");

    private final JwtDecoder decoder;

    public GoogleIdTokenVerifier(JwtDecoder decoder) {
        this.decoder = decoder;
    }

    public static OAuth2TokenValidator<Jwt> validator(String clientId) {
        return validator(() -> clientId);
    }

    public static OAuth2TokenValidator<Jwt> validator(Supplier<String> clientIdSupplier) {
        OAuth2TokenValidator<Jwt> issuer = jwt -> ISSUERS.contains(jwt.getClaimAsString("iss"))
                ? OAuth2TokenValidatorResult.success()
                : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Unexpected issuer", null));
        OAuth2TokenValidator<Jwt> audience = jwt -> {
            String expected = clientIdSupplier == null ? null : clientIdSupplier.get();
            return expected != null && !expected.isBlank() && jwt.getAudience() != null && jwt.getAudience().contains(expected)
                    ? OAuth2TokenValidatorResult.success()
                    : OAuth2TokenValidatorResult.failure(new OAuth2Error("invalid_token", "Token is for another client", null));
        };
        return new DelegatingOAuth2TokenValidator<>(new JwtTimestampValidator(), issuer, audience);
    }

    public GoogleIdentity verify(String credential) {
        Jwt jwt;
        try {
            jwt = decoder.decode(credential);
        } catch (JwtException exception) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "GOOGLE_TOKEN_INVALID", "Google sign-in token is invalid or expired");
        }
        return new GoogleIdentity(jwt.getSubject(), jwt.getClaimAsString("email"),
                Boolean.TRUE.equals(jwt.getClaimAsBoolean("email_verified")), jwt.getClaimAsString("hd"),
                jwt.getClaimAsString("name"), jwt.getClaimAsString("picture"));
    }
}
