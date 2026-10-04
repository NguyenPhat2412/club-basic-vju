package com.vju.club.auth;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.vju.club.config.JwtProperties;
import com.vju.club.entity.User;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Duration;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.HashSet;
import java.util.Set;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

class JwtTokenServiceTest {

    private static final SecretKey KEY = new SecretKeySpec(
            "unit-test-secret-0123456789-abcdefghijkl".getBytes(StandardCharsets.UTF_8), "HmacSHA256");

    private JwtTokenService service(Instant now) {
        JwtProperties properties = new JwtProperties();
        properties.setAccessTokenTtl(Duration.ofMinutes(15));
        return new JwtTokenService(new NimbusJwtEncoder(new ImmutableSecret<>(KEY)), properties,
                Clock.fixed(now, ZoneOffset.UTC));
    }

    @Test
    void accessTokenCarriesSubjectEmailIssuerAndExpiry() {
        Instant now = Instant.now();
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("user@example.com");

        JwtTokenService.AccessToken token = service(now).issueAccessToken(user);
        Jwt jwt = NimbusJwtDecoder.withSecretKey(KEY).macAlgorithm(MacAlgorithm.HS256).build().decode(token.value());

        assertThat(jwt.getSubject()).isEqualTo(user.getId().toString());
        assertThat(jwt.getClaimAsString("email")).isEqualTo("user@example.com");
        assertThat(jwt.getClaimAsString("iss")).isEqualTo(JwtTokenService.ISSUER);
        assertThat(token.expiresAt()).isEqualTo(now.plus(Duration.ofMinutes(15)));
        assertThat(jwt.getExpiresAt()).isEqualTo(token.expiresAt().truncatedTo(java.time.temporal.ChronoUnit.SECONDS));
    }

    @Test
    void refreshTokensAreRandomUrlSafeAndStoredOnlyAsHash() {
        JwtTokenService service = service(Instant.now());
        Set<String> seen = new HashSet<>();
        for (int i = 0; i < 200; i++) {
            JwtTokenService.RefreshTokenValue value = service.issueRefreshToken();
            assertThat(value.value()).matches("[A-Za-z0-9_-]{64}");
            assertThat(value.hash()).isEqualTo(service.hash(value.value())).isNotEqualTo(value.value());
            assertThat(seen.add(value.value())).isTrue();
        }
    }

    @Test
    void hashIsLowercaseHexSha256() {
        JwtTokenService service = service(Instant.now());
        assertThat(service.hash("abc"))
                .isEqualTo("ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad");
        assertThat(service.hash("abc")).isEqualTo(service.hash("abc"));
        assertThat(service.hash("abd")).isNotEqualTo(service.hash("abc"));
    }
}
