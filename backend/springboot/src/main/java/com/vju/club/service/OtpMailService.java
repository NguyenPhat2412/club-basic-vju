package com.vju.club.service;

public interface OtpMailService {
    boolean isMailConfigured();

    boolean sendPasswordResetOtpEmail(
            String recipientEmail,
            String recipientName,
            String otpCode,
            int expiryMinutes,
            int maxVerifyAttempts);

    void sendTestSmtpEmail(String recipientEmail);
}
