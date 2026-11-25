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

    default boolean sendNotificationAlertEmail(
            String recipientEmail,
            String recipientName,
            String title,
            String message) {
        return sendNotificationAlertEmail(recipientEmail, recipientName, title, message, null);
    }

    boolean sendNotificationAlertEmail(
            String recipientEmail,
            String recipientName,
            String title,
            String message,
            String referenceType);
}
