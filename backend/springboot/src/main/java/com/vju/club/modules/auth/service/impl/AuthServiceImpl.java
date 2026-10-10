package com.vju.club.modules.auth.service.impl;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.user.mapper.UserMapper;

import com.vju.club.modules.auth.service.AuthService;
import com.vju.club.modules.auth.service.UserSessionService;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.ClubPrincipal;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Locale;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserSessionService userSessionService;
    private final AuditService auditService;
    private final UserMapper userMapper;

    @Transactional(readOnly = true)
    public SignedIn login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException exception) {
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user != null && user.getStatus() != UserStatus.ACTIVE
                    && passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
            }
            throw invalidCredentials();
        }

        ClubPrincipal principal = (ClubPrincipal) authentication.getPrincipal();
        User user = userRepository.findById(principal.id()).orElseThrow(this::invalidCredentials);
        return new SignedIn(principal, new AuthResponse(userMapper.toResponse(user)));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return userMapper.toResponse(userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found")));
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String currentSessionId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID", "Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.saveAndFlush(user);
        userSessionService.endSessionsExcept(userId, currentSessionId);
        auditService.record(userId, AuditAction.USER_PASSWORD_CHANGED, userId, null, null, null);
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }
}
