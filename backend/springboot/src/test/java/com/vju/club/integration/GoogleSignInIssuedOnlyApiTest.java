package com.vju.club.integration;

import com.vju.club.security.GoogleIdTokenVerifier;
import com.vju.club.security.GoogleIdentity;
import org.junit.jupiter.api.Test;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

@TestPropertySource(properties = {"app.auth.google.client-id=club-web.apps.googleusercontent.com",
        "app.auth.google.create-accounts=false"})
class GoogleSignInIssuedOnlyApiTest extends ApiIntegrationTest {
    @MockitoBean GoogleIdTokenVerifier verifier;

    @Test
    void withAccountCreationOffOnlyIssuedAddressesSignIn() throws Exception {
        when(verifier.verify("stranger")).thenReturn(new GoogleIdentity("s9", "stranger@st.vju.ac.vn", true,
                "st.vju.ac.vn", "Stranger", null));
        problem(post("/api/v1/auth/google"), null, Map.of("credential", "stranger"), 403, "GOOGLE_ACCOUNT_NOT_REGISTERED");
        assertThat(count("SELECT count(*) FROM users WHERE email = 'stranger@st.vju.ac.vn'")).isZero();

        user("issued@st.vju.ac.vn");
        when(verifier.verify("issued")).thenReturn(new GoogleIdentity("s10", "issued@st.vju.ac.vn", true,
                "st.vju.ac.vn", "Issued", null));
        call(post("/api/v1/auth/google"), null, Map.of("credential", "issued"), 200);
    }
}
