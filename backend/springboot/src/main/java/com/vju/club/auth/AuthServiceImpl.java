package com.vju.club.auth;

import com.vju.club.auth.dto.AuthResponse;
import com.vju.club.auth.dto.LoginRequest;
import com.vju.club.auth.dto.RefreshTokenRequest;
import com.vju.club.auth.dto.RegisterRequest;
import com.vju.club.auth.dto.TokenResponse;
import com.vju.club.auth.dto.UserResponse;
import com.vju.club.auth.dto.ChangePasswordRequest;
import com.vju.club.config.JwtProperties;
import com.vju.club.entity.RefreshToken;
import com.vju.club.entity.User;
import com.vju.club.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.RefreshTokenRepository;
import com.vju.club.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class AuthServiceImpl implements AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final JwtTokenService tokenService;
    private final JwtProperties jwtProperties;

    public AuthServiceImpl(
            UserRepository userRepository,
            RefreshTokenRepository refreshTokenRepository,
            PasswordEncoder passwordEncoder,
            AuthenticationManager authenticationManager,
            JwtTokenService tokenService,
            JwtProperties jwtProperties) {
        this.userRepository = userRepository;
        this.refreshTokenRepository = refreshTokenRepository;
        this.passwordEncoder = passwordEncoder;
        this.authenticationManager = authenticationManager;
        this.tokenService = tokenService;
        this.jwtProperties = jwtProperties;
    }

    @Override
    @Transactional
    public UserResponse register(RegisterRequest request) {
        String email = normalizeEmail(request.email());
        if (userRepository.existsByEmailIgnoreCase(email)) {
            throw new ApiException(HttpStatus.CONFLICT, "EMAIL_ALREADY_EXISTS", "Email is already registered");
        }
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.password()));
        user.setFullName(request.fullName().trim());
        user.setStudentCode(blankToNull(request.studentCode()));
        user.setPhone(blankToNull(request.phone()));
        user.setStatus(UserStatus.ACTIVE);
        userRepository.save(user);
        userRepository.flush();
        return UserResponse.from(user);
    }

    @Override
    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        try {
            authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException exception) {
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user != null && user.getStatus() != UserStatus.ACTIVE) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
            }
            throw new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
        }

        User user = userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials"));
        return new AuthResponse(UserResponse.from(user), issueTokens(user));
    }

    @Override
    @Transactional
    public AuthResponse refresh(RefreshTokenRequest request) {
        String hash = tokenService.hash(request.refreshToken());
        RefreshToken existing = refreshTokenRepository.findByTokenHash(hash)
                .orElseThrow(() -> invalidRefreshToken());
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        if (!existing.isActive(now) || existing.getUser().getStatus() != UserStatus.ACTIVE) {
            throw invalidRefreshToken();
        }
        existing.revoke(now);
        refreshTokenRepository.save(existing);
        refreshTokenRepository.flush();
        return new AuthResponse(UserResponse.from(existing.getUser()), issueTokens(existing.getUser()));
    }

    @Override
    @Transactional
    public void logout(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) {
            return;
        }
        refreshTokenRepository.findByTokenHash(tokenService.hash(refreshToken)).ifPresent(token -> {
            if (token.getRevokedAt() == null) {
                token.revoke(OffsetDateTime.now(ZoneOffset.UTC));
                refreshTokenRepository.save(token);
                refreshTokenRepository.flush();
            }
        });
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return UserResponse.from(userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found")));
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID", "Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        userRepository.save(user);
        userRepository.flush();
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        for (RefreshToken token : refreshTokenRepository.findByUser_IdAndRevokedAtIsNull(userId)) {
            token.revoke(now);
            refreshTokenRepository.save(token);
        }
        refreshTokenRepository.flush();
    }

    private TokenResponse issueTokens(User user) {
        JwtTokenService.AccessToken accessToken = tokenService.issueAccessToken(user);
        JwtTokenService.RefreshTokenValue refreshToken = tokenService.issueRefreshToken();
        InstantPair expiration = new InstantPair(accessToken.expiresAt(),
                java.time.Instant.now().plus(jwtProperties.getRefreshTokenTtl()));

        RefreshToken refreshEntity = new RefreshToken();
        refreshEntity.setUser(user);
        refreshEntity.setTokenHash(refreshToken.hash());
        refreshEntity.setExpiresAt(OffsetDateTime.ofInstant(expiration.refreshExpiresAt(), ZoneOffset.UTC));
        refreshTokenRepository.save(refreshEntity);
        refreshTokenRepository.flush();
        return new TokenResponse(accessToken.value(), refreshToken.value(),
                expiration.accessExpiresAt(), expiration.refreshExpiresAt());
    }

    private ApiException invalidRefreshToken() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_REFRESH_TOKEN", "Refresh token is invalid or expired");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private record InstantPair(java.time.Instant accessExpiresAt, java.time.Instant refreshExpiresAt) { }
}
