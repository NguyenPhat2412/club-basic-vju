package com.vju.club.service.impl;

import com.vju.club.config.GoogleSignInProperties;
import com.vju.club.dto.record.SignedIn;
import com.vju.club.dto.request.ChangePasswordRequest;
import com.vju.club.dto.request.ForgotPasswordRequest;
import com.vju.club.dto.request.GoogleLoginRequest;
import com.vju.club.dto.request.LoginRequest;
import com.vju.club.dto.request.RegisterRequest;
import com.vju.club.dto.request.ResetPasswordWithOtpRequest;
import com.vju.club.dto.response.AuthResponse;
import com.vju.club.dto.response.ForgotPasswordOtpResponse;
import com.vju.club.dto.response.GoogleSignInConfigResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.entity.PasswordResetOtp;
import com.vju.club.entity.User;
import com.vju.club.entity.UserRole;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.PermissionScope;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.UserMapper;
import com.vju.club.repository.PasswordResetOtpRepository;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.ClubPrincipal;
import com.vju.club.security.GoogleIdTokenVerifier;
import com.vju.club.security.GoogleIdentity;
import com.vju.club.security.GrantGuard;
import com.vju.club.service.AuditService;
import com.vju.club.service.AuthService;
import com.vju.club.service.NotificationService;
import com.vju.club.service.OtpMailService;
import com.vju.club.service.SystemSettingsService;
import com.vju.club.service.UserSessionService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;
import java.util.regex.Pattern;

@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final Pattern STUDENT_CODE = Pattern.compile("\\d{6,12}");
    private static final String SELF_REGISTERED_MARKER = "SELF_REGISTERED";

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuthenticationManager authenticationManager;
    private final UserSessionService userSessionService;
    private final AuditService auditService;
    private final UserMapper userMapper;
    private final GoogleSignInProperties googleSignIn;
    private final GoogleIdTokenVerifier googleIdTokenVerifier;
    // optional so hand-built unit tests keep working; absent means the built-in defaults
    @Autowired(required = false)
    private SystemSettingsService settingsService;
    @Autowired(required = false)
    private NotificationService notificationService;
    @Autowired(required = false)
    private UserRoleRepository userRoleRepository;
    @Autowired(required = false)
    private RoleRepository roleRepository;
    @Autowired(required = false)
    private PasswordResetOtpRepository otpRepository;
    @Autowired(required = false)
    private PasswordResetOtpAttemptService otpAttemptService;
    @Autowired(required = false)
    private OtpMailService otpMailService;

    @Override
    @Transactional
    public SignedIn login(LoginRequest request) {
        String email = normalizeEmail(request.email());
        if (googleSignIn.isGoogleEmail(email)) {
            User existing = userRepository.findByEmailIgnoreCase(email).orElse(null);
            if (existing == null || !isSelfRegistered(existing.getGoogleSubject())) {
                throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_SIGN_IN_REQUIRED",
                        "Accounts on this email domain sign in with Google");
            }
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
    public SignedIn register(RegisterRequest request) {
        if (!selfRegistrationOpen()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SIGN_UP_CLOSED", "Sign-up is closed; an administrator issues accounts");
        }
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
        user.setRequiresPasswordChange(false);
        user.setGoogleSubject(SELF_REGISTERED_MARKER + ":" + UUID.randomUUID());
        User saved = userRepository.saveAndFlush(user);
        auditService.record(saved.getId(), AuditAction.USER_CREATED, saved.getId(), null, null,
                Map.of("email", saved.getEmail(), "source", "self-register"));
        auditService.record(saved.getId(), AuditAction.USER_LOGGED_IN, saved.getId(), null, null,
                Map.of("email", saved.getEmail(), "method", "register"));
        ClubPrincipal principal = new ClubPrincipal(saved.getId(), saved.getEmail(), null, true);
        return new SignedIn(principal, new AuthResponse(userMapper.toResponse(saved)));
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
        if (user.getGoogleSubject() != null
                && !isSelfRegistered(user.getGoogleSubject())
                && !user.getGoogleSubject().equals(identity.subject())) {
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

    private boolean selfRegistrationOpen() {
        return settingsService == null || settingsService.current().allowSelfRegistration();
    }

    private User createStudent(GoogleIdentity identity, String email, boolean register) {
        if (!register) {
            throw new ApiException(HttpStatus.FORBIDDEN, "GOOGLE_ACCOUNT_NOT_REGISTERED",
                    "This school account has not signed up yet");
        }
        if (!googleSignIn.isCreateAccounts() || !selfRegistrationOpen()) {
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

    @Override
    @Transactional
    public ForgotPasswordOtpResponse requestPasswordReset(ForgotPasswordRequest request) {
        SystemSettingsResponse cfg = settingsService == null ? null : settingsService.current();
        int expiryMinutes = cfg != null ? cfg.otpExpiryMinutes() : 5;
        int maxSendCount = cfg != null ? cfg.otpMaxSendCount() : 5;
        int resendCooldownSeconds = cfg != null ? cfg.otpResendCooldownSeconds() : 60;
        int maxVerifyAttempts = cfg != null ? cfg.otpMaxVerifyAttempts() : 5;
        boolean mailConfigured = otpMailService != null && otpMailService.isMailConfigured();

        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || user.getStatus() == UserStatus.INACTIVE) {
            return new ForgotPasswordOtpResponse(
                    expiryMinutes * 60, resendCooldownSeconds, maxVerifyAttempts, mailConfigured);
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (otpRepository != null) {
            if (resendCooldownSeconds > 0) {
                PasswordResetOtp latest = otpRepository.findFirstByUser_IdOrderByCreatedAtDesc(user.getId()).orElse(null);
                if (latest != null && latest.getCreatedAt() != null
                        && latest.getCreatedAt().isAfter(now.minusSeconds(resendCooldownSeconds))) {
                    throw new ApiException(
                            HttpStatus.TOO_MANY_REQUESTS,
                            "OTP_COOLDOWN_ACTIVE",
                            "Please wait before requesting another verification code");
                }
            }
            long sentLastHour = otpRepository.countByUser_IdAndCreatedAtAfter(user.getId(), now.minusHours(1));
            if (sentLastHour >= maxSendCount) {
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "OTP_SEND_LIMIT_EXCEEDED",
                        "Maximum OTP send count reached; please try again later");
            }
        }

        String otpCode = "%06d".formatted(RANDOM.nextInt(1_000_000));
        if (otpRepository != null) {
            otpRepository.invalidateActiveForUser(user.getId(), now);
            PasswordResetOtp otp = new PasswordResetOtp();
            otp.setUser(user);
            otp.setOtpHash(passwordEncoder.encode(otpCode));
            otp.setExpiresAt(now.plusMinutes(expiryMinutes));
            otp.setAttempts(0);
            otp.setMaxAttempts(maxVerifyAttempts);
            otpRepository.saveAndFlush(otp);
        }

        boolean deliveredByMail = otpMailService != null
                && otpMailService.sendPasswordResetOtpEmail(
                        user.getEmail(), user.getFullName(), otpCode, expiryMinutes, maxVerifyAttempts);

        String suppliedCode = blankToNull(request.studentCode());
        String note = blankToNull(request.note());
        String studentCodeCheck = resolveStudentCodeCheck(user, suppliedCode);

        Map<String, Object> auditValues = new LinkedHashMap<>();
        auditValues.put("type", "PASSWORD_RESET_OTP_REQUESTED");
        auditValues.put("email", user.getEmail());
        auditValues.put("accountStatus", user.getStatus().name());
        auditValues.put("mailDelivered", deliveredByMail);
        auditValues.put("studentCodeCheck", studentCodeCheck);
        if (suppliedCode != null) {
            auditValues.put("suppliedStudentCode", suppliedCode);
        }
        if (note != null) {
            auditValues.put("note", note);
        }
        auditService.record(null, AuditAction.USER_PASSWORD_RESET, user.getId(), null, null, auditValues);

        if (notificationService != null && userRoleRepository != null && roleRepository != null) {
            roleRepository.findByCode(GrantGuard.SYSTEM_ADMIN).ifPresent(adminRole -> {
                String title = "Yêu cầu đặt lại mật khẩu: " + user.getEmail();
                String message = buildPasswordResetMessage(user, suppliedCode, studentCodeCheck, note, deliveredByMail);
                String eventKey = "PW_RESET_REQ:" + user.getId() + ":" + LocalDate.now();
                Set<UUID> notifiedAdmins = new LinkedHashSet<>();
                for (UserRole holder : userRoleRepository.findActiveHoldersForTarget(
                        adminRole.getId(), PermissionScope.GLOBAL, null, null)) {
                    User admin = holder.getUser();
                    if (admin != null && admin.getStatus() == UserStatus.ACTIVE && notifiedAdmins.add(admin.getId())) {
                        notificationService.create(admin.getId(), title, message, "USER", user.getId(), eventKey);
                    }
                }
            });
        }

        return new ForgotPasswordOtpResponse(
                expiryMinutes * 60, resendCooldownSeconds, maxVerifyAttempts, deliveredByMail);
    }

    @Override
    @Transactional
    public void resetPasswordWithOtp(ResetPasswordWithOtpRequest request) {
        if (otpRepository == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Verification code is invalid");
        }
        String email = normalizeEmail(request.email());
        User user = userRepository.findByEmailIgnoreCase(email).orElse(null);
        if (user == null || user.getStatus() == UserStatus.INACTIVE) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Invalid or expired verification code");
        }
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
        }

        PasswordResetOtp activeOtp = otpRepository
                .findFirstByUser_IdAndConsumedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(user.getId())
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Invalid or expired verification code"));

        OffsetDateTime now = OffsetDateTime.now();
        if (!activeOtp.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "Verification code has expired");
        }
        if (activeOtp.getAttempts() >= activeOtp.getMaxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_MAX_ATTEMPTS_EXCEEDED",
                    "Maximum verification attempts exceeded; please request a new OTP");
        }

        if (!passwordEncoder.matches(request.otp().trim(), activeOtp.getOtpHash())) {
            int attemptsNow = otpAttemptService != null
                    ? otpAttemptService.recordFailedAttempt(activeOtp.getId(), now)
                    : activeOtp.getAttempts() + 1;
            if (attemptsNow >= activeOtp.getMaxAttempts()) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_MAX_ATTEMPTS_EXCEEDED",
                        "Maximum verification attempts exceeded; please request a new OTP");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Verification code is incorrect");
        }

        activeOtp.setConsumedAt(now);
        otpRepository.saveAndFlush(activeOtp);
        otpRepository.invalidateActiveForUser(user.getId(), now);

        user.setPasswordHash(passwordEncoder.encode(request.newPassword()));
        user.setRequiresPasswordChange(false);
        userRepository.saveAndFlush(user);
        userSessionService.endAllSessions(user.getId());
        auditService.record(
                user.getId(),
                AuditAction.USER_PASSWORD_RESET,
                user.getId(),
                null,
                null,
                Map.of("type", "PASSWORD_RESET_OTP_COMPLETED", "email", user.getEmail()));
    }

    private String resolveStudentCodeCheck(User user, String suppliedCode) {
        if (suppliedCode == null) return "NOT_PROVIDED";
        if (user.getStudentCode() == null || user.getStudentCode().isBlank()) return "NOT_ON_PROFILE";
        return user.getStudentCode().equalsIgnoreCase(suppliedCode) ? "MATCHED" : "MISMATCH";
    }

    private String buildPasswordResetMessage(
            User user, String suppliedCode, String studentCodeCheck, String note, boolean deliveredByMail) {
        StringBuilder sb = new StringBuilder("Tài khoản ")
                .append(user.getFullName())
                .append(" (").append(user.getEmail()).append(") yêu cầu đặt lại mật khẩu")
                .append(deliveredByMail ? " (đã gửi mã OTP qua email)." : " (chưa cấu hình SMTP — vui lòng kiểm tra Cài đặt hệ thống hoặc hỗ trợ cấp lại mật khẩu).");
        if (suppliedCode != null) {
            sb.append(" Mã SV cung cấp: ").append(suppliedCode);
            if ("MATCHED".equals(studentCodeCheck)) {
                sb.append(" (khớp hồ sơ).");
            } else if ("MISMATCH".equals(studentCodeCheck)) {
                sb.append(" (không khớp mã SV hồ sơ: ").append(user.getStudentCode()).append(").");
            } else {
                sb.append(" (hồ sơ chưa lưu mã SV).");
            }
        }
        if (note != null) {
            sb.append(" Ghi chú xác minh: ").append(note);
        }
        return sb.toString();
    }

    private ApiException invalidCredentials() {
        return new ApiException(HttpStatus.UNAUTHORIZED, "INVALID_CREDENTIALS", "Invalid credentials");
    }

    private String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private boolean isSelfRegistered(String googleSubject) {
        return googleSubject != null
                && (SELF_REGISTERED_MARKER.equals(googleSubject)
                || googleSubject.startsWith(SELF_REGISTERED_MARKER + ":"));
    }
}
