package com.vju.club.config;

import com.nimbusds.jose.jwk.source.ImmutableSecret;
import com.vju.club.modules.auth.service.JwtTokenService;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jose.jws.MacAlgorithm;
import org.springframework.security.oauth2.jwt.JwtClaimsSet;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.jwt.JwtEncoderParameters;
import org.springframework.security.oauth2.jwt.JwtException;
import org.springframework.security.oauth2.jwt.JwsHeader;
import org.springframework.security.oauth2.jwt.NimbusJwtEncoder;

import javax.crypto.SecretKey;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.time.Instant;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatNoException;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class SecurityBeansConfigTest {

    private final SecurityBeansConfig config = new SecurityBeansConfig();

    private static JwtProperties withSecret(String secret) {
        JwtProperties properties = new JwtProperties();
        properties.setSecret(secret);
        return properties;
    }

    @Test
    void refusesToStartWithoutASecret() {
        assertThatThrownBy(() -> config.jwtSecretKey(new JwtProperties()))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("JWT_SECRET");
        assertThatThrownBy(() -> config.jwtSecretKey(withSecret("   ")))
                .isInstanceOf(IllegalStateException.class);
    }

    @Test
    void refusesSecretsShorterThan256Bits() {
        assertThatThrownBy(() -> config.jwtSecretKey(withSecret("x".repeat(31))))
                .isInstanceOf(IllegalStateException.class).hasMessageContaining("32 bytes");
        assertThatNoException().isThrownBy(() -> config.jwtSecretKey(withSecret("x".repeat(32))));
    }

    private static String sign(SecretKey key, String issuer) {
        JwtEncoder encoder = new NimbusJwtEncoder(new ImmutableSecret<>(key));
        JwtClaimsSet.Builder claims = JwtClaimsSet.builder().subject("s")
                .issuedAt(Instant.now()).expiresAt(Instant.now().plusSeconds(60));
        if (issuer != null) claims.issuer(issuer);
        return encoder.encode(JwtEncoderParameters.from(JwsHeader.with(MacAlgorithm.HS256).build(), claims.build()))
                .getTokenValue();
    }

    @Test
    void decoderAcceptsOnlyOwnIssuerAndKey() {
        SecretKey key = config.jwtSecretKey(withSecret("a".repeat(40)));
        JwtDecoder decoder = config.jwtDecoder(key);

        assertThat(decoder.decode(sign(key, JwtTokenService.ISSUER)).getSubject()).isEqualTo("s");
        assertThatThrownBy(() -> decoder.decode(sign(key, "someone-else"))).isInstanceOf(JwtException.class);
        assertThatThrownBy(() -> decoder.decode(sign(key, null))).isInstanceOf(JwtException.class);
        SecretKey otherKey = new SecretKeySpec("b".repeat(40).getBytes(StandardCharsets.UTF_8), "HmacSHA256");
        assertThatThrownBy(() -> decoder.decode(sign(otherKey, JwtTokenService.ISSUER))).isInstanceOf(JwtException.class);
    }
}
