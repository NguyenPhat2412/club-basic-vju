package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.common.ApiPaths;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ProblemResponses;
import com.vju.club.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import jakarta.servlet.http.HttpSession;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.Optional;
import java.util.Set;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AccountStatusFilter extends OncePerRequestFilter {
    private static final Set<String> ALLOWED_BEFORE_PASSWORD_CHANGE = Set.of(
            "GET " + ApiPaths.FULL_AUTH_ME,
            "GET " + ApiPaths.FULL_AUTH_CSRF,
            "POST " + ApiPaths.FULL_AUTH_CHANGE_PASSWORD,
            "GET " + ApiPaths.FULL_USERS_ME);

    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Optional<UUID> userId = SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication());
        if (userId.isPresent()) {
            Optional<UserRepository.AccessState> state = userRepository.findAccessState(userId.get());
            if (state.isEmpty() || state.get().getStatus() != UserStatus.ACTIVE) {
                SecurityContextHolder.clearContext();
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.invalidate();
                }
                if (state.isPresent() && state.get().getStatus() == UserStatus.LOCKED) {
                    ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
                } else {
                    ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
                }
                return;
            }
            if (state.get().getRequiresPasswordChange()
                    && !ALLOWED_BEFORE_PASSWORD_CHANGE.contains(request.getMethod() + " " + request.getRequestURI())) {
                ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "PASSWORD_CHANGE_REQUIRED",
                        "Choose a new password before using the application");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
