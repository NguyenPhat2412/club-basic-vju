package com.vju.club.dto.response;

public record ForgotPasswordOtpResponse(
        int expirySeconds,
        int resendCooldownSeconds,
        int maxVerifyAttempts,
        boolean mailConfigured) {
}
