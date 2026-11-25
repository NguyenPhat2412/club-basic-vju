package com.vju.club.service;

import com.vju.club.dto.response.UserResponse;

import java.util.UUID;

public interface TwoFactorOtpService {
    String PURPOSE_LOGIN_2FA = "LOGIN_2FA";
    String PURPOSE_CRITICAL_ACTION = "CRITICAL_ACTION";

    record OtpPolicyResult(
            int expirySeconds,
            int resendCooldownSeconds,
            int maxVerifyAttempts,
            boolean mailConfigured,
            String purpose,
            String actionContext
    ) {
    }

    record VerifyResult(
            UUID userId,
            String email,
            String purpose,
            String actionContext
    ) {
    }

    boolean isTier1To3Admin(UUID userId);

    boolean isTwoFactorEnabled(UUID userId);

    OtpPolicyResult sendOtp(UUID userId, String purpose, String actionContext);

    VerifyResult verifyOtp(UUID userId, String purpose, String actionContext, String otpCode);

    void requireCriticalActionOtpIfEnabled(UUID userId, String actionContext, String otpCode);

    UserResponse setTwoFactorEnabled(UUID userId, boolean enabled, String otpCode);
}
