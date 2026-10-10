package com.vju.club.integration;

import com.vju.club.config.SessionConfig;
import com.vju.club.security.ClubPrincipal;
import jakarta.servlet.http.Cookie;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextImpl;
import org.springframework.security.web.context.HttpSessionSecurityContextRepository;
import org.springframework.session.Session;
import org.springframework.session.SessionRepository;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.session.web.http.SessionRepositoryFilter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.AbstractMockHttpServletRequestBuilder;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;
import org.springframework.web.context.WebApplicationContext;

import java.nio.charset.StandardCharsets;
import java.util.Base64;
import java.util.List;
import java.util.UUID;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.security.test.web.servlet.setup.SecurityMockMvcConfigurers.springSecurity;

final class TestSessions {
    static final String COOKIE = SessionConfig.COOKIE_NAME;

    private TestSessions() { }

    static MockMvc mockMvc(WebApplicationContext context) {
        return MockMvcBuilders.webAppContextSetup(context)
                .addFilters(context.getBean(SessionRepositoryFilter.class))
                .apply(springSecurity())
                .build();
    }

    @SuppressWarnings("unchecked")
    static String signedIn(JdbcIndexedSessionRepository repository, UUID userId) {
        SessionRepository<Session> sessions = (SessionRepository<Session>) (SessionRepository<?>) repository;
        Session session = sessions.createSession();
        var authentication = UsernamePasswordAuthenticationToken.authenticated(
                new ClubPrincipal(userId, "test@local", null, true), null, List.of());
        session.setAttribute(HttpSessionSecurityContextRepository.SPRING_SECURITY_CONTEXT_KEY,
                new SecurityContextImpl(authentication));
        sessions.save(session);
        return cookieValue(session.getId());
    }

    static String cookieValue(String sessionId) {
        return Base64.getEncoder().encodeToString(sessionId.getBytes(StandardCharsets.UTF_8));
    }

    static String fromResponse(MockHttpServletResponse response) {
        Cookie cookie = response.getCookie(COOKIE);
        return cookie == null || cookie.getMaxAge() == 0 ? null : cookie.getValue();
    }

    static void attach(AbstractMockHttpServletRequestBuilder<?> request, String session) {
        if (session != null) request.cookie(new Cookie(COOKIE, session));
        request.with(csrf());
    }
}
