package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ProblemResponses;
import com.vju.club.modules.user.repository.UserRepository;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationToken;
import org.springframework.stereotype.Component;
import org.springframework.web.filter.OncePerRequestFilter;

import java.io.IOException;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class AccountStatusFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwt) {
            try {
                UUID id = UUID.fromString(jwt.getToken().getSubject());
                if (!userRepository.existsByIdAndStatus(id, UserStatus.ACTIVE)) {
                    SecurityContextHolder.clearContext();
                    ProblemResponses.write(response, HttpServletResponse.SC_FORBIDDEN,
                            "ACCOUNT_INACTIVE", "Account is inactive");
                    return;
                }
            } catch (IllegalArgumentException | NullPointerException exception) {
                SecurityContextHolder.clearContext();
                ProblemResponses.write(response, HttpServletResponse.SC_UNAUTHORIZED,
                        "UNAUTHORIZED", "Authentication is required");
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
