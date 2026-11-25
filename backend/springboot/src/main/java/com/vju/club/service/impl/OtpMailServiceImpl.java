package com.vju.club.service.impl;

import com.vju.club.entity.SystemSettings;
import com.vju.club.error.ApiException;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.service.OtpMailService;
import jakarta.mail.internet.InternetAddress;
import jakarta.mail.internet.MimeMessage;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.env.Environment;
import org.springframework.core.env.Profiles;
import org.springframework.http.HttpStatus;
import org.springframework.mail.javamail.JavaMailSenderImpl;
import org.springframework.mail.javamail.MimeMessageHelper;
import org.springframework.stereotype.Service;

import java.nio.charset.StandardCharsets;
import java.util.Properties;

@Service
@Slf4j
@RequiredArgsConstructor
public class OtpMailServiceImpl implements OtpMailService {
    private final SystemSettingsRepository settingsRepository;
    private final Environment environment;

    @Value("${app.mail.smtp-host:}")
    private String envSmtpHost = "";

    @Value("${app.mail.smtp-port:587}")
    private int envSmtpPort = 587;

    @Value("${app.mail.smtp-username:}")
    private String envSmtpUsername = "";

    @Value("${app.mail.smtp-password:}")
    private String envSmtpPassword = "";

    @Value("${app.mail.smtp-from-email:}")
    private String envSmtpFromEmail = "";

    @Value("${app.mail.smtp-from-name:VJU ClubHub}")
    private String envSmtpFromName = "VJU ClubHub";

    @Value("${app.mail.smtp-start-tls:true}")
    private boolean envSmtpStartTls = true;

    private record EffectiveSmtp(
            String host,
            int port,
            String username,
            String password,
            String fromEmail,
            String fromName,
            boolean startTls,
            int otpExpiryMinutes,
            int otpMaxVerifyAttempts) {
        boolean configured() {
            return host != null && !host.isBlank();
        }
    }

    @Override
    public boolean isMailConfigured() {
        return resolveSmtp().configured();
    }

    @Override
    public boolean sendPasswordResetOtpEmail(
            String recipientEmail,
            String recipientName,
            String otpCode,
            int expiryMinutes,
            int maxVerifyAttempts) {
        EffectiveSmtp smtp = resolveSmtp();
        if (!smtp.configured()) {
            boolean isLocal = environment != null && environment.acceptsProfiles(Profiles.of("local"));
            if (isLocal) {
                log.info("[LOCAL-DEV OTP] Password reset OTP for {} is {} (expires in {} min, max {} attempts)",
                        recipientEmail, otpCode, expiryMinutes, maxVerifyAttempts);
            } else {
                log.warn("SMTP server is not configured in system_settings; skipping email delivery for {}",
                        recipientEmail);
            }
            return false;
        }

        OtpMailTemplateBuilder.RenderedEmail rendered = OtpMailTemplateBuilder.buildPasswordResetOtp(
                recipientName, recipientEmail, otpCode, expiryMinutes, maxVerifyAttempts, false);
        deliver(smtp, recipientEmail, rendered);
        return true;
    }

    @Override
    public void sendTestSmtpEmail(String recipientEmail) {
        EffectiveSmtp smtp = resolveSmtp();
        if (!smtp.configured()) {
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    "SMTP_NOT_CONFIGURED",
                    "Please configure and save SMTP server settings before sending a test email");
        }
        OtpMailTemplateBuilder.RenderedEmail rendered = OtpMailTemplateBuilder.buildPasswordResetOtp(
                recipientEmail,
                recipientEmail,
                "842916",
                smtp.otpExpiryMinutes(),
                smtp.otpMaxVerifyAttempts(),
                true);
        deliver(smtp, recipientEmail, rendered);
    }

    @Override
    public boolean sendNotificationAlertEmail(
            String recipientEmail,
            String recipientName,
            String title,
            String message,
            String referenceType) {
        if (recipientEmail == null || recipientEmail.isBlank()) {
            return false;
        }
        EffectiveSmtp smtp = resolveSmtp();
        if (!smtp.configured()) {
            return false;
        }
        try {
            OtpMailTemplateBuilder.RenderedEmail rendered = OtpMailTemplateBuilder.buildNotificationAlert(
                    recipientName, recipientEmail.strip(), title, message, referenceType);
            deliver(smtp, recipientEmail.strip(), rendered);
            return true;
        } catch (Exception ex) {
            log.warn("Notification email delivery skipped for {}: {}", recipientEmail, ex.getMessage());
            return false;
        }
    }

    private void deliver(EffectiveSmtp smtp, String recipientEmail, OtpMailTemplateBuilder.RenderedEmail rendered) {
        try {
            JavaMailSenderImpl sender = new JavaMailSenderImpl();
            sender.setHost(smtp.host());
            sender.setPort(smtp.port());
            sender.setDefaultEncoding(StandardCharsets.UTF_8.name());
            boolean hasAuth = smtp.username() != null && !smtp.username().isBlank()
                    && smtp.password() != null && !smtp.password().isBlank();
            if (smtp.username() != null && !smtp.username().isBlank()) {
                sender.setUsername(smtp.username());
            }
            if (smtp.password() != null && !smtp.password().isBlank()) {
                String normalizedPassword = smtp.host() != null
                        && smtp.host().toLowerCase(java.util.Locale.ROOT).contains("gmail.com")
                        ? smtp.password().replaceAll("\\s+", "")
                        : smtp.password();
                sender.setPassword(normalizedPassword);
            }

            Properties props = sender.getJavaMailProperties();
            props.put("mail.transport.protocol", "smtp");
            props.put("mail.smtp.auth", String.valueOf(hasAuth));
            props.put("mail.smtp.starttls.enable", String.valueOf(smtp.startTls()));
            if (smtp.port() == 465) {
                props.put("mail.smtp.ssl.enable", "true");
            }
            props.put("mail.smtp.connectiontimeout", "8000");
            props.put("mail.smtp.timeout", "8000");
            props.put("mail.smtp.writetimeout", "8000");

            MimeMessage message = sender.createMimeMessage();
            MimeMessageHelper helper = new MimeMessageHelper(message, true, StandardCharsets.UTF_8.name());
            String senderAddress = firstNonBlank(smtp.fromEmail(), smtp.username(), "no-reply@vju.local");
            String senderName = firstNonBlank(smtp.fromName(), "VJU ClubHub");
            helper.setFrom(new InternetAddress(senderAddress, senderName, StandardCharsets.UTF_8.name()));
            helper.setTo(recipientEmail);
            helper.setSubject(rendered.subject());
            helper.setText(rendered.plainText(), rendered.html());
            sender.send(message);
        } catch (Exception ex) {
            log.warn("Failed to send email via SMTP {}:{} to {}: {}",
                    smtp.host(), smtp.port(), recipientEmail, ex.getMessage());
            throw new ApiException(
                    HttpStatus.BAD_GATEWAY,
                    "MAIL_DELIVERY_FAILED",
                    "Unable to send email via configured SMTP server; please verify host, port, and credentials");
        }
    }

    private EffectiveSmtp resolveSmtp() {
        SystemSettings db = settingsRepository == null ? null : settingsRepository.findSingleton().orElse(null);
        int expiry = db != null ? db.getOtpExpiryMinutes() : 5;
        int maxAttempts = db != null ? db.getOtpMaxVerifyAttempts() : 5;

        if (db != null && db.getSmtpHost() != null && !db.getSmtpHost().isBlank()) {
            return new EffectiveSmtp(
                    db.getSmtpHost().trim(),
                    db.getSmtpPort() > 0 ? db.getSmtpPort() : 587,
                    blankToNull(db.getSmtpUsername()),
                    firstNonBlank(db.getSmtpPassword(), envSmtpPassword, null),
                    firstNonBlank(db.getSmtpFromEmail(), db.getSmtpUsername(), envSmtpFromEmail),
                    firstNonBlank(db.getSmtpFromName(), "VJU ClubHub"),
                    db.isSmtpStartTls(),
                    expiry,
                    maxAttempts);
        }

        return new EffectiveSmtp(
                blankToNull(envSmtpHost),
                envSmtpPort > 0 ? envSmtpPort : 587,
                blankToNull(envSmtpUsername),
                blankToNull(envSmtpPassword),
                firstNonBlank(envSmtpFromEmail, envSmtpUsername, null),
                firstNonBlank(envSmtpFromName, "VJU ClubHub"),
                envSmtpStartTls,
                expiry,
                maxAttempts);
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static String firstNonBlank(String... candidates) {
        for (String c : candidates) {
            if (c != null && !c.isBlank()) {
                return c.trim();
            }
        }
        return null;
    }
}
