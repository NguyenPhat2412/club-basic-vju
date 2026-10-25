package com.vju.club.security;

import com.nimbusds.jose.JWSAlgorithm;
import com.nimbusds.jose.JWSHeader;
import com.nimbusds.jose.crypto.RSASSASigner;
import com.nimbusds.jwt.JWTClaimsSet;
import com.nimbusds.jwt.SignedJWT;
import com.vju.club.error.ApiException;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.NimbusJwtDecoder;

import java.security.KeyPair;
import java.security.KeyPairGenerator;
import java.security.interfaces.RSAPublicKey;
import java.time.Instant;
import java.util.Date;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

class GoogleIdTokenVerifierTest {
    private static final String CLIENT_ID = "club-web.apps.googleusercontent.com";
    private static KeyPair google;
    private static KeyPair attacker;
    private static GoogleIdTokenVerifier verifier;

    @BeforeAll
    static void keys() throws Exception {
        KeyPairGenerator generator = KeyPairGenerator.getInstance("RSA");
        generator.initialize(2048);
        google = generator.generateKeyPair();
        attacker = generator.generateKeyPair();
        NimbusJwtDecoder decoder = NimbusJwtDecoder.withPublicKey((RSAPublicKey) google.getPublic()).build();
        decoder.setJwtValidator(GoogleIdTokenVerifier.validator(CLIENT_ID));
        verifier = new GoogleIdTokenVerifier(decoder);
    }

    private static String token(KeyPair key, Consumer<JWTClaimsSet.Builder> customize) throws Exception {
        Instant now = Instant.now();
        JWTClaimsSet.Builder claims = new JWTClaimsSet.Builder()
                .issuer("https://accounts.google.com")
                .audience(CLIENT_ID)
                .subject("109876543210")
                .issueTime(Date.from(now))
                .expirationTime(Date.from(now.plusSeconds(3600)))
                .claim("email", "an.nguyen@st.vju.ac.vn")
                .claim("email_verified", true)
                .claim("hd", "st.vju.ac.vn");
        customize.accept(claims);
        SignedJWT jwt = new SignedJWT(new JWSHeader(JWSAlgorithm.RS256), claims.build());
        jwt.sign(new RSASSASigner(key.getPrivate()));
        return jwt.serialize();
    }

    private static void rejected(String credential) {
        assertThatThrownBy(() -> verifier.verify(credential)).isInstanceOf(ApiException.class)
                .extracting("code").isEqualTo("GOOGLE_TOKEN_INVALID");
    }

    @Test
    void readsTheIdentityFromAGenuineToken() throws Exception {
        GoogleIdentity identity = verifier.verify(token(google, claims -> { }));
        assertThat(identity).isEqualTo(new GoogleIdentity("109876543210", "an.nguyen@st.vju.ac.vn", true, "st.vju.ac.vn"));
    }

    @Test
    void acceptsTheShortIssuerAndStringEmailVerified() throws Exception {
        GoogleIdentity identity = verifier.verify(token(google, claims -> claims
                .issuer("accounts.google.com").claim("email_verified", "true")));
        assertThat(identity.emailVerified()).isTrue();
    }

    @Test
    void reportsUnverifiedEmailAndMissingHostedDomain() throws Exception {
        GoogleIdentity identity = verifier.verify(token(google, claims -> claims
                .claim("email_verified", false).claim("hd", null)));
        assertThat(identity.emailVerified()).isFalse();
        assertThat(identity.hostedDomain()).isNull();
    }

    @Test
    void rejectsTokensSignedByAnyoneElse() throws Exception {
        rejected(token(attacker, claims -> { }));
    }

    @Test
    void rejectsTokensIssuedForAnotherApp() throws Exception {
        rejected(token(google, claims -> claims.audience("someone-else.apps.googleusercontent.com")));
    }

    @Test
    void rejectsTokensFromAnotherIssuer() throws Exception {
        rejected(token(google, claims -> claims.issuer("https://evil.example")));
    }

    @Test
    void rejectsExpiredTokens() throws Exception {
        rejected(token(google, claims -> claims
                .issueTime(Date.from(Instant.now().minusSeconds(7200)))
                .expirationTime(Date.from(Instant.now().minusSeconds(3600)))));
    }

    @Test
    void rejectsGarbageAndUnsignedTokens() throws Exception {
        rejected("not-a-jwt");
        String genuine = token(google, claims -> { });
        String[] parts = genuine.split("\\.");
        rejected(parts[0] + "." + parts[1] + ".");
    }
}
