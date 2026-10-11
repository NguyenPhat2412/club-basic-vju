package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ProblemResponses;
import com.vju.club.modules.user.repository.UserRepository;
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
            "GET /api/v1/auth/me",
            "GET /api/v1/auth/csrf",
            "POST /api/v1/auth/change-password",
            "GET /api/v1/users/me");

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
                ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
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
