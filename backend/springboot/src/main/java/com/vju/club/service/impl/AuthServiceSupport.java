package com.vju.club.service.impl;

import com.vju.club.dto.request.ForgotPasswordRequest;
import com.vju.club.dto.request.ResetPasswordWithOtpRequest;
import com.vju.club.dto.response.ForgotPasswordOtpResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.PasswordResetOtp;
import com.vju.club.entity.User;
import com.vju.club.entity.UserRole;
import com.vju.club.enums.AuditAction;
import com.vju.club.enums.PermissionScope;
import com.vju.club.enums.UserStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.PasswordResetOtpRepository;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.GrantGuard;
import com.vju.club.service.AuditService;
import com.vju.club.service.NotificationService;
import com.vju.club.service.OtpMailService;
import com.vju.club.service.SystemSettingsService;
import com.vju.club.service.UserSessionService;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.security.SecureRandom;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

final class AuthServiceSupport {
    private static final SecureRandom RANDOM = new SecureRandom();

    private AuthServiceSupport() {
    }

    static ForgotPasswordOtpResponse requestPasswordReset(
            ForgotPasswordRequest request,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            AuditService auditService,
            SystemSettingsService settingsService,
            NotificationService notificationService,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository,
            PasswordResetOtpRepository otpRepository,
            OtpMailService otpMailService) {
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

        notifySystemAdmins(user, suppliedCode, studentCodeCheck, note, deliveredByMail,
                notificationService, userRoleRepository, roleRepository);

        return new ForgotPasswordOtpResponse(
                expiryMinutes * 60, resendCooldownSeconds, maxVerifyAttempts, deliveredByMail);
    }

    static void resetPasswordWithOtp(
            ResetPasswordWithOtpRequest request,
            UserRepository userRepository,
            PasswordEncoder passwordEncoder,
            UserSessionService userSessionService,
            AuditService auditService,
            PasswordResetOtpRepository otpRepository,
            PasswordResetOtpAttemptService otpAttemptService) {
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
                .orElseThrow(() -> new ApiException(
                        HttpStatus.BAD_REQUEST, "OTP_INVALID", "Invalid or expired verification code"));

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

    private static void notifySystemAdmins(
            User user,
            String suppliedCode,
            String studentCodeCheck,
            String note,
            boolean deliveredByMail,
            NotificationService notificationService,
            UserRoleRepository userRoleRepository,
            RoleRepository roleRepository) {
        if (notificationService == null || userRoleRepository == null || roleRepository == null) {
            return;
        }
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

    static String resolveStudentCodeCheck(User user, String suppliedCode) {
        if (suppliedCode == null) return "NOT_PROVIDED";
        if (user.getStudentCode() == null || user.getStudentCode().isBlank()) return "NOT_ON_PROFILE";
        return user.getStudentCode().equalsIgnoreCase(suppliedCode) ? "MATCHED" : "MISMATCH";
    }

    static String buildPasswordResetMessage(
            User user, String suppliedCode, String studentCodeCheck, String note, boolean deliveredByMail) {
        StringBuilder sb = new StringBuilder("Tài khoản ")
                .append(user.getFullName())
                .append(" (").append(user.getEmail()).append(") yêu cầu đặt lại mật khẩu")
                .append(deliveredByMail
                        ? " (đã gửi mã OTP qua email)."
                        : " (chưa cấu hình SMTP — vui lòng kiểm tra Cài đặt hệ thống hoặc hỗ trợ cấp lại mật khẩu).");
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

    static String normalizeEmail(String email) {
        return email.trim().toLowerCase(Locale.ROOT);
    }

    static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
