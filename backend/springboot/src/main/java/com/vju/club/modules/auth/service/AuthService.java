package com.vju.club.modules.auth.service;

import com.vju.club.modules.audit.entity.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.config.response.AuthResponse;
import com.vju.club.modules.auth.config.request.ChangePasswordRequest;
import com.vju.club.modules.auth.config.request.LoginRequest;
import com.vju.club.modules.auth.config.request.RefreshTokenRequest;
import com.vju.club.modules.auth.config.request.RegisterRequest;
import com.vju.club.modules.auth.config.response.TokenResponse;
import com.vju.club.modules.user.config.response.UserResponse;
import com.vju.club.config.JwtProperties;
import com.vju.club.modules.auth.entity.RefreshToken;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.entity.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.modules.auth.repository.RefreshTokenRepository;
import com.vju.club.modules.user.repository.UserRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;

public interface AuthService {

    UserResponse register(RegisterRequest request);

    AuthResponse login(LoginRequest request);

    AuthResponse refresh(RefreshTokenRequest request);

    void logout(String refreshToken);

    UserResponse getCurrentUser(UUID userId);

    void changePassword(UUID userId, ChangePasswordRequest request);

}
