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
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AccountStatusFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Optional<UUID> userId = SecurityIdentity.currentUserId(SecurityContextHolder.getContext().getAuthentication());
        if (userId.isPresent() && !userRepository.existsByIdAndStatus(userId.get(), UserStatus.ACTIVE)) {
            SecurityContextHolder.clearContext();
            HttpSession session = request.getSession(false);
            if (session != null) {
                session.invalidate();
            }
            ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
            return;
        }
        filterChain.doFilter(request, response);
    }
}
