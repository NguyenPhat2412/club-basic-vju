package com.vju.club.modules.auth.service.impl;

import com.vju.club.modules.auth.service.JwtTokenService;

import com.vju.club.modules.auth.service.AuthService;

import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.request.RefreshTokenRequest;
import com.vju.club.modules.auth.dto.request.RegisterRequest;
import com.vju.club.modules.auth.dto.response.TokenResponse;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.config.JwtProperties;
import com.vju.club.modules.auth.entity.RefreshToken;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.auth.repository.RefreshTokenRepository;
import com.vju.club.modules.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService tokenService;
    private final JwtProperties jwtProperties;
    private final Clock clock;
    private final AuditService auditService;

    public AuthServiceImpl(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenService tokenService,
            JwtProperties jwtProperties,
            Clock clock,
            AuditService auditService) {
        this.auditService = auditService;
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
        this.jwtProperties = jwtProperties;
        this.clock = clock;
    }

    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        String studentCode = blankToNull(request.studentCode());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email is already registered");
        }
        if (studentCode != null && userRepository.existsByStudentCodeIgnoreCase(studentCode)) {
            throw new ApiException(HttpStatus.CONFLICT, "STUDENT_CODE_ALREADY_EXISTS", "Student code is already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setStudentCode(studentCode);
        user.setPhone(blankToNull(request.phone()));
        user.setStatus(UserStatus.ACTIVE);
        User saved = userRepository.saveAndFlush(user);
        auditService.record(saved.getId(), AuditAction.USER_REGISTERED, saved.getId(), null, null,
                Map.of("email", saved.getEmail()));
        return UserResponse.from(saved);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException exception) {
            // Only reveal that an account is inactive to someone who proved they own it.
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user != null && user.getStatus() != UserStatus.ACTIVE
                    && passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
            }
            throw invalidCredentials();
        }

        User user = userRepository.findByEmailIgnoreCase(email).orElseThrow(this::invalidCredentials);
        return new AuthResponse(UserResponse.from(user), issueTokens(user));
    }

    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        RefreshToken existing = refreshTokenRepository.findByTokenHash(tokenService.hash(request.refreshToken()))
                .orElseThrow(this::invalidRefreshToken);
        OffsetDateTime now = now();
        User user = existing.getUser();
        if (!existing.isActive(now) || user.getStatus() != UserStatus.ACTIVE) {
            throw invalidRefreshToken();
        }
        if (refreshTokenRepository.revokeIfActive(existing.getId(), now) != 1) {
            // Another request rotated this token first.
            throw invalidRefreshToken();
        }
        return new AuthResponse(UserResponse.from(user), issueTokens(user));
    }

    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenService.hash(refreshToken))
                .ifPresent(token -> refreshTokenRepository.revokeIfActive(token.getId(), now()));
    }

    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return UserResponse.from(userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found")));
    }

    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID", "Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.saveAndFlush(user);
        refreshTokenRepository.revokeAllForUser(userId, now());
        auditService.record(userId, AuditAction.USER_PASSWORD_CHANGED, userId, null, null, null);
    }

    private TokenResponse issueTokens(User user) {
        JwtTokenService.AccessToken accessToken = tokenService.issueAccessToken(user);
        JwtTokenService.RefreshTokenValue refreshToken = tokenService.issueRefreshToken();
        Instant refreshExpiresAt = clock.instant().plus(jwtProperties.getRefreshTokenTtl());

        RefreshToken refreshEntity = new RefreshToken();
        refreshEntity.setUser(user);
        refreshEntity.setTokenHash(refreshToken.hash());
        refreshEntity.setExpiresAt(OffsetDateTime.ofInstant(refreshExpiresAt, ZoneOffset.UTC));
        refreshTokenRepository.saveAndFlush(refreshEntity);
        return new TokenResponse(accessToken.value(), refreshToken.value(),
                accessToken.expiresAt(), refreshExpiresAt);
    }

    private OffsetDateTime now() {
        return OffsetDateTime.now(clock);
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    private ApiException invalidRefreshToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
