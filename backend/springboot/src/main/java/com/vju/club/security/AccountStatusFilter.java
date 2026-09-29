package com.vju.club.security;

import com.vju.club.entity.UserStatus;
import com.vju.club.repository.UserRepository;
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
public class AccountStatusFilter extends OncePerRequestFilter {
    private final UserRepository userRepository;

    public AccountStatusFilter(UserRepository userRepository) { this.userRepository = userRepository; }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain filterChain)
            throws ServletException, IOException {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication instanceof JwtAuthenticationToken jwt) {
            try {
                UUID id = UUID.fromString(jwt.getToken().getSubject());
                if (userRepository.findById(id).map(user -> user.getStatus() == UserStatus.ACTIVE).orElse(false) == false) {
                    SecurityContextHolder.clearContext();
                    response.setStatus(HttpServletResponse.SC_FORBIDDEN);
                    response.setContentType("application/problem+json");
                    response.getWriter().write("{\"title\":\"ACCOUNT_INACTIVE\",\"status\":403,\"code\":\"ACCOUNT_INACTIVE\"}");
                    return;
                }
            } catch (IllegalArgumentException exception) {
                SecurityContextHolder.clearContext();
                response.setStatus(HttpServletResponse.SC_UNAUTHORIZED);
                return;
            }
        }
        filterChain.doFilter(request, response);
    }
}
