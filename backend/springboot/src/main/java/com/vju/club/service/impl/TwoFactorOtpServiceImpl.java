package com.vju.club.service.impl;

import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.dto.response.UserResponse;
import com.vju.club.entity.SecurityOtp;
import com.vju.club.entity.User;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.UserMapper;
import com.vju.club.repository.SecurityOtpRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.GrantGuard;
import com.vju.club.service.AuditService;
import com.vju.club.service.OtpMailService;
import com.vju.club.service.SystemSettingsService;
import com.vju.club.service.TwoFactorOtpService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.PlatformTransactionManager;
import org.springframework.transaction.TransactionDefinition;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.security.SecureRandom;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

@Service
@Slf4j
@RequiredArgsConstructor
public class TwoFactorOtpServiceImpl implements TwoFactorOtpService {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int MAX_ACTION_CONTEXT_LENGTH = 120;

    private final UserRepository userRepository;
    private final UserRoleRepository userRoleRepository;
    private final SecurityOtpRepository securityOtpRepository;
    private final PasswordEncoder passwordEncoder;
    private final AuditService auditService;
    private final UserMapper userMapper;

    @Autowired(required = false)
    private SystemSettingsService settingsService;
    @Autowired(required = false)
    private OtpMailService otpMailService;
    @Autowired(required = false)
    private PlatformTransactionManager transactionManager;
    @Autowired(required = false)
    private Environment environment;

    @Override
    @Transactional(readOnly = true)
    public boolean isTier1To3Admin(UUID userId) {
        return userId != null && userRoleRepository.holdsTier1To3AdminRole(userId);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean isTwoFactorEnabled(UUID userId) {
        if (userId == null) {
            return false;
        }
        return userRepository.findById(userId).map(User::isTwoFactorEnabled).orElse(false);
    }

    @Override
    @Transactional
    public OtpPolicyResult sendOtp(UUID userId, String purpose, String actionContext) {
        String normalizedPurpose = normalizePurpose(purpose);
        String normalizedContext = normalizeActionContext(actionContext);
        User user = requireActiveUser(userId);

        SystemSettingsResponse cfg = settingsService == null ? null : settingsService.current();
        int expiryMinutes = cfg != null ? cfg.otpExpiryMinutes() : 5;
        int maxSendCount = cfg != null ? cfg.otpMaxSendCount() : 5;
        int resendCooldownSeconds = cfg != null ? cfg.otpResendCooldownSeconds() : 60;
        int maxVerifyAttempts = cfg != null ? cfg.otpMaxVerifyAttempts() : 5;

        OffsetDateTime now = OffsetDateTime.now();
        if (resendCooldownSeconds > 0) {
            SecurityOtp latest = securityOtpRepository
                    .findFirstByUser_IdAndPurposeOrderByCreatedAtDesc(userId, normalizedPurpose)
                    .orElse(null);
            if (latest != null && latest.getCreatedAt() != null
                    && latest.getCreatedAt().isAfter(now.minusSeconds(resendCooldownSeconds))) {
                throw new ApiException(
                        HttpStatus.TOO_MANY_REQUESTS,
                        "OTP_COOLDOWN_ACTIVE",
                        "Please wait before requesting another verification code");
            }
        }

        long sentLastHour = securityOtpRepository.countByUser_IdAndPurposeAndCreatedAtAfter(
                userId, normalizedPurpose, now.minusHours(1));
        if (sentLastHour >= maxSendCount) {
            throw new ApiException(
                    HttpStatus.TOO_MANY_REQUESTS,
                    "OTP_SEND_LIMIT_EXCEEDED",
                    "Maximum OTP send count reached; please try again later");
        }

        String otpCode = "%06d".formatted(RANDOM.nextInt(1_000_000));
        securityOtpRepository.invalidateActiveForUserAndPurpose(userId, normalizedPurpose, now);

        SecurityOtp otp = new SecurityOtp();
        otp.setUser(user);
        otp.setPurpose(normalizedPurpose);
        otp.setActionContext(normalizedContext);
        otp.setOtpHash(passwordEncoder.encode(otpCode));
        otp.setExpiresAt(now.plusMinutes(expiryMinutes));
        otp.setAttempts(0);
        otp.setMaxAttempts(maxVerifyAttempts);
        securityOtpRepository.saveAndFlush(otp);

        boolean mailConfigured = otpMailService != null && otpMailService.isMailConfigured();
        boolean delivered = deliverOtpEmail(user, normalizedPurpose, normalizedContext, otpCode, expiryMinutes, maxVerifyAttempts);
        if (!delivered) {
            boolean isLocal = environment != null && environment.acceptsProfiles(Profiles.of("local"));
            if (isLocal) {
                log.info("[LOCAL-DEV 2FA OTP] {} OTP for {} (context={}) is {} (expires in {} min, max {} attempts)",
                        normalizedPurpose, user.getEmail(), normalizedContext, otpCode, expiryMinutes, maxVerifyAttempts);
            } else if (!mailConfigured) {
                log.warn("SMTP server is not configured; skipping 2FA OTP email delivery for {}", user.getEmail());
            }
        }

        return new OtpPolicyResult(
                expiryMinutes * 60,
                resendCooldownSeconds,
                maxVerifyAttempts,
                mailConfigured,
                normalizedPurpose,
                normalizedContext);
    }

    @Override
    @Transactional
    public VerifyResult verifyOtp(UUID userId, String purpose, String actionContext, String otpCode) {
        String normalizedPurpose = normalizePurpose(purpose);
        String normalizedContext = normalizeActionContext(actionContext);
        User user = requireActiveUser(userId);

        SecurityOtp activeOtp = securityOtpRepository
                .findFirstByUser_IdAndPurposeAndConsumedAtIsNullAndInvalidatedAtIsNullOrderByCreatedAtDesc(
                        userId, normalizedPurpose)
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST, "OTP_INVALID", "Invalid or expired verification code"));

        if (!Objects.equals(normalizedContext, activeOtp.getActionContext())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID",
                    "Verification code does not match the requested action");
        }

        OffsetDateTime now = OffsetDateTime.now();
        if (!activeOtp.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_EXPIRED", "Verification code has expired");
        }
        if (activeOtp.getAttempts() >= activeOtp.getMaxAttempts()) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_MAX_ATTEMPTS_EXCEEDED",
                    "Maximum verification attempts exceeded; please request a new OTP");
        }

        String trimmedOtp = otpCode == null ? "" : otpCode.trim();
        if (trimmedOtp.isEmpty() || !passwordEncoder.matches(trimmedOtp, activeOtp.getOtpHash())) {
            int attemptsNow = recordFailedAttempt(activeOtp.getId(), now);
            if (attemptsNow >= activeOtp.getMaxAttempts()) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "OTP_MAX_ATTEMPTS_EXCEEDED",
                        "Maximum verification attempts exceeded; please request a new OTP");
            }
            throw new ApiException(HttpStatus.BAD_REQUEST, "OTP_INVALID", "Verification code is incorrect");
        }

        activeOtp.setConsumedAt(now);
        securityOtpRepository.saveAndFlush(activeOtp);
        securityOtpRepository.invalidateActiveForUserAndPurpose(userId, normalizedPurpose, now);
        return new VerifyResult(user.getId(), user.getEmail(), normalizedPurpose, activeOtp.getActionContext());
    }

    @Override
    @Transactional
    public void requireCriticalActionOtpIfEnabled(UUID userId, String actionContext, String otpCode) {
        User user = requireActiveUser(userId);
        if (!user.isTwoFactorEnabled()) {
            return;
        }
        if (otpCode == null || otpCode.isBlank()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TWO_FACTOR_REQUIRED",
                    "Two-factor verification code is required for this critical action");
        }
        verifyOtp(userId, PURPOSE_CRITICAL_ACTION, actionContext, otpCode);
    }

    @Override
    @Transactional
    public UserResponse setTwoFactorEnabled(UUID userId, boolean enabled, String otpCode) {
        User user = requireActiveUser(userId);
        if (enabled && !isTier1To3Admin(userId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "TWO_FACTOR_ADMIN_ROLE_REQUIRED",
                    "Only Tier 1–3 administrators can enable two-factor authentication");
        }
        if (!enabled && user.isTwoFactorEnabled()) {
            String resolvedOtp = CriticalActionOtpSupport.resolveOtp(otpCode);
            if (resolvedOtp == null || resolvedOtp.isBlank()) {
                throw new ApiException(HttpStatus.FORBIDDEN, "TWO_FACTOR_REQUIRED",
                        "Two-factor verification code is required to disable two-factor authentication");
            }
            verifyOtp(userId, PURPOSE_CRITICAL_ACTION, "DISABLE_2FA", resolvedOtp);
        } else if (otpCode != null && !otpCode.isBlank()) {
            verifyOtp(userId, PURPOSE_CRITICAL_ACTION,
                    enabled ? "TWO_FACTOR_ENABLE" : "DISABLE_2FA", otpCode);
        }

        boolean previous = user.isTwoFactorEnabled();
        user.setTwoFactorEnabled(enabled);
        User saved = userRepository.saveAndFlush(user);
        auditService.recordChange(
                userId,
                AuditAction.USER_PROFILE_UPDATED,
                userId,
                null,
                Map.of("twoFactorEnabled", previous),
                Map.of("twoFactorEnabled", enabled));
        return userMapper.toResponse(saved);
    }

    private User requireActiveUser(UUID userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "User not found"));
        if (user.getStatus() == UserStatus.LOCKED) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_LOCKED", "Account is locked");
        }
        if (user.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.FORBIDDEN, "ACCOUNT_INACTIVE", "Account is inactive");
        }
        return user;
    }

    private String normalizePurpose(String purpose) {
        if (purpose == null || purpose.isBlank()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "2FA purpose is required");
        }
        String normalized = purpose.trim();
        if (!PURPOSE_LOGIN_2FA.equals(normalized) && !PURPOSE_CRITICAL_ACTION.equals(normalized)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR", "Invalid 2FA purpose");
        }
        return normalized;
    }

    private String normalizeActionContext(String actionContext) {
        if (actionContext == null || actionContext.isBlank()) {
            return null;
        }
        String trimmed = actionContext.trim();
        if (trimmed.length() > MAX_ACTION_CONTEXT_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "VALIDATION_ERROR",
                    "actionContext must not exceed " + MAX_ACTION_CONTEXT_LENGTH + " characters");
        }
        return trimmed;
    }

    private boolean deliverOtpEmail(
            User user,
            String purpose,
            String actionContext,
            String otpCode,
            int expiryMinutes,
            int maxVerifyAttempts) {
        if (otpMailService == null) {
            return false;
        }
        String title = PURPOSE_LOGIN_2FA.equals(purpose)
                ? "Mã OTP xác thực đăng nhập (2FA): " + otpCode
                : "Mã OTP xác thực thao tác trọng yếu (2FA): " + otpCode;
        StringBuilder message = new StringBuilder();
        message.append("Mã xác thực 2 yếu tố (OTP) cho tài khoản ").append(user.getEmail()).append(" là: ")
                .append(otpCode).append("\n");
        message.append("Hiệu lực: ").append(expiryMinutes).append(" phút · Tối đa ")
                .append(maxVerifyAttempts).append(" lần nhập.");
        if (actionContext != null) {
            message.append("\nNgữ cảnh thao tác: ").append(actionContext);
        }
        message.append("\nKhông chia sẻ mã này cho bất kỳ ai.");
        return otpMailService.sendNotificationAlertEmail(user.getEmail(), user.getFullName(), title, message.toString());
    }

    private int recordFailedAttempt(UUID otpId, OffsetDateTime now) {
        if (transactionManager == null) {
            return incrementAttemptDirect(otpId, now);
        }
        TransactionTemplate requiresNew = new TransactionTemplate(transactionManager);
        requiresNew.setPropagationBehavior(TransactionDefinition.PROPAGATION_REQUIRES_NEW);
        Integer result = requiresNew.execute(status -> incrementAttemptDirect(otpId, now));
        return result != null ? result : 0;
    }

    private int incrementAttemptDirect(UUID otpId, OffsetDateTime now) {
        SecurityOtp otp = securityOtpRepository.findById(otpId).orElse(null);
        if (otp == null) {
            return 0;
        }
        int nextAttempts = otp.getAttempts() + 1;
        otp.setAttempts(nextAttempts);
        if (nextAttempts >= otp.getMaxAttempts() && otp.getInvalidatedAt() == null) {
            otp.setInvalidatedAt(now);
        }
        securityOtpRepository.saveAndFlush(otp);
        return nextAttempts;
    }
}
