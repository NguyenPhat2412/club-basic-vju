package com.vju.club.modules.auth.service.impl;

import com.vju.club.config.GoogleSignInProperties;
import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.auth.dto.record.SignedIn;
import com.vju.club.modules.auth.dto.request.ChangePasswordRequest;
import com.vju.club.modules.auth.dto.request.GoogleLoginRequest;
import com.vju.club.modules.auth.dto.request.LoginRequest;
import com.vju.club.modules.auth.dto.response.AuthResponse;
import com.vju.club.modules.auth.dto.response.GoogleSignInConfigResponse;
import com.vju.club.modules.auth.service.AuthService;
import com.vju.club.modules.auth.service.UserSessionService;
import com.vju.club.modules.user.dto.response.UserResponse;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.mapper.UserMapper;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.ClubPrincipal;
import com.vju.club.security.GoogleIdTokenVerifier;
import com.vju.club.security.GoogleIdentity;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.util.Base64;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern STUDENT_CODE = Pattern.compile("\\d{6,12}");

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserSessionService userSessionService;
    private final AuditService auditService;
    private final UserMapper userMapper;
    private final GoogleSignInProperties googleSignIn;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;

    @Override
    @Transactional
    public SignedIn login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        if (googleSignIn.isGoogleEmail(email)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_SIGN_IN_REQUIRED",
                    "Accounts on this email domain sign in with Google");
        }
        Authentication authentication;
        try {
            authentication = authenticationManager.authenticate(
                    UsernamePasswordAuthenticationToken.unauthenticated(email, request.password()));
        } catch (AuthenticationException exception) {
            User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (user != null && user.getStatus() != UserStatus.ACTIVE
                    && passwordEncoder.matches(request.password(), user.getPasswordHash())) {
                if (user.getStatus() == UserStatus.LOCKED) {
                    throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
                }
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
            }
            throw invalidCredentials();
        }

        ClubPrincipal principal = (ClubPrincipal) authentication.getPrincipal();
        assert principal != null;
        User user = userRepository.findById(principal.id()).orElseThrow(this::invalidCredentials);
        auditService.record(user.getId(), AuditAction.USER_LOGGED_IN, user.getId(), null, null,
                Map.of("email", user.getEmail()));
        return new SignedIn(principal, new AuthResponse(userMapper.toResponse(user)));
    }

    @Override
    @Transactional
    public SignedIn loginWithGoogle(GoogleLoginRequest request) {
        if (!googleSignIn.isEnabled()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "GOOGLE_SIGN_IN_DISABLED", "Google sign-in is not enabled");
        }
        GoogleIdentity identity = googleIdTokenVerifier.verify(request.credential());
        String email = identity.email() == null ? null : normalizeEmail(identity.email());
        if (!identity.emailVerified() || identity.hostedDomain() == null || identity.hostedDomain().isBlank()
                || !googleSignIn.isGoogleEmail(email)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_DOMAIN_NOT_ALLOWED",
                    "Only school Google accounts can sign in");
        }
        boolean register = Boolean.TRUE.equals(request.register());
        User user = userRepository.findByEmailIgnoreCase(email).orElseGet(() -> createStudent(identity, email, register));
        if (user.getGoogleSubject() != null && !user.getGoogleSubject().equals(identity.subject())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_ACCOUNT_MISMATCH",
                    "This account is linked to a different Google account");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            if (user.getStatus() == UserStatus.LOCKED) {
                throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
            }
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
        }
        user.setGoogleSubject(identity.subject());
        user.setRequiresPasswordChange(false);
        User saved = userRepository.saveAndFlush(user);
        auditService.record(saved.getId(), AuditAction.USER_LOGGED_IN, saved.getId(), null, null,
                Map.of("email", saved.getEmail(), "method", "google"));
        ClubPrincipal principal = new ClubPrincipal(saved.getId(), saved.getEmail(), null, true);
        return new SignedIn(principal, new AuthResponse(userMapper.toResponse(saved)));
    }

    private User createStudent(GoogleIdentity identity, String email, boolean register) {
        if (!register) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_ACCOUNT_NOT_REGISTERED",
                    "This school account has not signed up yet");
        }
        if (!googleSignIn.isCreateAccounts()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_SIGN_UP_CLOSED",
                    "Sign-up is closed; an administrator issues accounts");
        }
        String localPart = email.substring(0, email.indexOf('@'));
        String name = identity.name() == null || identity.name().isBlank() ? localPart : identity.name().trim();
        byte[] secret = new byte[32];
        RANDOM.nextBytes(secret);
        User user = new User();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(Base64.getEncoder().encodeToString(secret)));
        user.setFullName(name.length() > 200 ? name.substring(0, 200) : name);
        if (STUDENT_CODE.matcher(localPart).matches() && !userRepository.existsByStudentCodeIgnoreCase(localPart)) {
            user.setStudentCode(localPart);
        }
        String picture = identity.picture();
        if (picture != null && picture.startsWith("https://") && picture.length() <= 500) {
            user.setAvatarUrl(picture);
        }
        user.setStatus(UserStatus.ACTIVE);
        user.setRequiresPasswordChange(false);
        User saved = userRepository.saveAndFlush(user);
        auditService.record(saved.getId(), AuditAction.USER_CREATED, saved.getId(), null, null,
                Map.of("email", saved.getEmail(), "source", "google"));
        return saved;
    }

    @Override
    public GoogleSignInConfigResponse googleSignInConfig() {
        return googleSignIn.isEnabled()
                ? new GoogleSignInConfigResponse(true, googleSignIn.getClientId(), googleSignIn.getAllowedDomains())
                : new GoogleSignInConfigResponse(false, null, List.of());
    }

    @Override
    @Transactional(readOnly = true)
    public UserResponse getCurrentUser(UUID userId) {
        return userMapper.toResponse(userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found")));
    }

    @Override
    @Transactional
    public void changePassword(UUID userId, ChangePasswordRequest request, String currentSessionId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (!passwordEncoder.matches(request.currentPassword(), user.getPasswordHash())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CURRENT_PASSWORD_INVALID", "Current password is invalid");
        }
        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setRequiresPasswordChange(false);
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
