package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.config.RuntimeIntegrationConfig;
import com.vju.club.dto.request.TestSmtpEmailRequest;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.PublicSystemStatusResponse;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.SystemSettingsMapper;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.RequestMetadataExtractor;
import com.vju.club.security.TokenCryptoService;
import com.vju.club.service.AuditService;
import com.vju.club.service.OtpMailService;
import com.vju.club.service.SecurityTelemetryService;
import com.vju.club.service.SystemSettingsService;
import com.vju.club.service.TelegramAlertService;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class SystemSettingsServiceImpl implements SystemSettingsService {
    private final SystemSettingsRepository repository;
    private final AuditService auditService;
    private final SystemSettingsMapper settingsMapper;

    @Autowired(required = false)
    private OtpMailService otpMailService;

    @Autowired(required = false)
    private TokenCryptoService tokenCryptoService;

    @Autowired(required = false)
    private RuntimeIntegrationConfig runtimeIntegrationConfig;

    @Autowired(required = false)
    private TelegramAlertService telegramAlertService;

    @Autowired(required = false)
    private SecurityTelemetryService securityTelemetryService;

    @Autowired(required = false)
    private UserRepository userRepository;

    @Override
    @Transactional(readOnly = true)
    public SystemSettingsResponse current() {
        return toEnrichedResponse(find());
    }

    @Override
    @Transactional(readOnly = true)
    public PublicSystemStatusResponse publicStatus() {
        SystemSettings s = find();
        java.time.OffsetDateTime now = java.time.OffsetDateTime.now(java.time.ZoneOffset.UTC);
        boolean activeAnnouncement = s.isAnnouncementEnabled()
                && s.getAnnouncementMessage() != null
                && !s.getAnnouncementMessage().isBlank()
                && (s.getAnnouncementExpiresAt() == null || s.getAnnouncementExpiresAt().isAfter(now));
        return new PublicSystemStatusResponse(
                s.isMaintenanceMode(),
                s.getMaintenanceMessage(),
                activeAnnouncement,
                activeAnnouncement ? s.getAnnouncementMessage() : null,
                s.getAnnouncementTone() == null ? "info" : s.getAnnouncementTone(),
                s.getAnnouncementExpiresAt());
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_VIEW)
    public SystemSettingsResponse get(Actor actor) {
        return toEnrichedResponse(find());
    }

    @Override
    @Transactional
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public SystemSettingsResponse update(Actor actor, UpdateSystemSettingsRequest request) {
        SystemSettings settings = find();
        Map<String, Object> before = values(settings);
        settings.setMaxPendingApplications(request.maxPendingApplications());
        settings.setReapplyCooldownDays(request.reapplyCooldownDays());
        settings.setMaxActiveClubs(request.maxActiveClubs());
        if (request.attendanceEditWindowHours() != null) {
            settings.setAttendanceEditWindowHours(request.attendanceEditWindowHours());
        }
        if (request.allowSelfRegistration() != null) settings.setAllowSelfRegistration(request.allowSelfRegistration());
        if (request.attendanceOpensBeforeMinutes() != null) settings.setAttendanceOpensBeforeMinutes(request.attendanceOpensBeforeMinutes());
        if (request.eventTaskGraceDays() != null) settings.setEventTaskGraceDays(request.eventTaskGraceDays());
        if (request.chatSummariesPerHour() != null) settings.setChatSummariesPerHour(request.chatSummariesPerHour());
        if (request.chatMaxMessageLength() != null) settings.setChatMaxMessageLength(request.chatMaxMessageLength());
        if (request.chatMessagesPerMinute() != null) settings.setChatMessagesPerMinute(request.chatMessagesPerMinute());
        if (request.documentMaxFileMb() != null) settings.setDocumentMaxFileMb(request.documentMaxFileMb());
        if (request.clubImageMaxMb() != null) settings.setClubImageMaxMb(request.clubImageMaxMb());
        if (request.avatarMaxMb() != null) settings.setAvatarMaxMb(request.avatarMaxMb());
        if (request.clubStorageQuotaMb() != null) settings.setClubStorageQuotaMb(request.clubStorageQuotaMb());
        if (request.documentMaxVersions() != null) settings.setDocumentMaxVersions(request.documentMaxVersions());
        if (request.maxChannelsPerClub() != null) settings.setMaxChannelsPerClub(request.maxChannelsPerClub());
        if (request.maxDepartmentsPerClub() != null) settings.setMaxDepartmentsPerClub(request.maxDepartmentsPerClub());
        if (request.maxActiveEventsPerClub() != null) settings.setMaxActiveEventsPerClub(request.maxActiveEventsPerClub());
        if (request.maxOpenTasksPerClub() != null) settings.setMaxOpenTasksPerClub(request.maxOpenTasksPerClub());
        if (request.broadcastCooldownMinutes() != null) settings.setBroadcastCooldownMinutes(request.broadcastCooldownMinutes());
        if (request.facebookSyncCooldownMinutes() != null) settings.setFacebookSyncCooldownMinutes(request.facebookSyncCooldownMinutes());
        if (request.facebookAutoSyncEnabled() != null) settings.setFacebookAutoSyncEnabled(request.facebookAutoSyncEnabled());
        if (request.facebookAutoSyncIntervalMinutes() != null) settings.setFacebookAutoSyncIntervalMinutes(request.facebookAutoSyncIntervalMinutes());

        if (request.otpExpiryMinutes() != null) settings.setOtpExpiryMinutes(request.otpExpiryMinutes());
        if (request.otpMaxSendCount() != null) settings.setOtpMaxSendCount(request.otpMaxSendCount());
        if (request.otpResendCooldownSeconds() != null) settings.setOtpResendCooldownSeconds(request.otpResendCooldownSeconds());
        if (request.otpMaxVerifyAttempts() != null) settings.setOtpMaxVerifyAttempts(request.otpMaxVerifyAttempts());

        if (request.smtpHost() != null) settings.setSmtpHost(blankToNull(request.smtpHost()));
        if (request.smtpPort() != null) settings.setSmtpPort(request.smtpPort());
        if (request.smtpUsername() != null) settings.setSmtpUsername(blankToNull(request.smtpUsername()));
        if (Boolean.TRUE.equals(request.clearSmtpPassword())) {
            settings.setSmtpPassword(null);
        } else if (request.smtpPassword() != null && !request.smtpPassword().isBlank()) {
            String effectiveHost = settings.getSmtpHost();
            String rawPw = request.smtpPassword().trim();
            settings.setSmtpPassword(
                    effectiveHost != null && effectiveHost.toLowerCase(Locale.ROOT).contains("gmail.com")
                            ? rawPw.replaceAll("\\s+", "")
                            : rawPw);
        }
        if (request.smtpFromEmail() != null) {
            String normalizedFrom = blankToNull(request.smtpFromEmail());
            settings.setSmtpFromEmail(normalizedFrom == null ? null : normalizedFrom.toLowerCase(Locale.ROOT));
        }
        if (request.smtpFromName() != null) {
            String fromName = blankToNull(request.smtpFromName());
            settings.setSmtpFromName(fromName == null ? "VJU ClubHub" : fromName);
        }
        if (request.smtpStartTls() != null) settings.setSmtpStartTls(request.smtpStartTls());

        if (request.facebookAppId() != null) settings.setFacebookAppId(blankToNull(request.facebookAppId()));
        if (Boolean.TRUE.equals(request.clearFacebookAppSecret())) {
            settings.setFacebookAppSecret(null);
        } else if (request.facebookAppSecret() != null && !request.facebookAppSecret().isBlank()) {
            settings.setFacebookAppSecret(encryptSecret(request.facebookAppSecret().trim()));
        }
        if (request.facebookGraphVersion() != null) settings.setFacebookGraphVersion(blankToNull(request.facebookGraphVersion()));
        if (request.facebookOauthRedirectUri() != null) settings.setFacebookOauthRedirectUri(blankToNull(request.facebookOauthRedirectUri()));
        if (request.frontendBaseUrl() != null) settings.setFrontendBaseUrl(blankToNull(request.frontendBaseUrl()));

        if (request.aiBaseUrl() != null) settings.setAiBaseUrl(blankToNull(request.aiBaseUrl()));
        if (Boolean.TRUE.equals(request.clearAiApiKey())) {
            settings.setAiApiKey(null);
        } else if (request.aiApiKey() != null && !request.aiApiKey().isBlank()) {
            settings.setAiApiKey(encryptSecret(request.aiApiKey().trim()));
        }
        if (request.aiModel() != null) settings.setAiModel(blankToNull(request.aiModel()));

        if (request.googleClientId() != null) settings.setGoogleClientId(blankToNull(request.googleClientId()));
        if (request.googleAllowedDomains() != null) settings.setGoogleAllowedDomains(blankToNull(request.googleAllowedDomains()));
        if (request.googleCreateAccounts() != null) settings.setGoogleCreateAccounts(request.googleCreateAccounts());

        if (request.telegramEnabled() != null) settings.setTelegramEnabled(request.telegramEnabled());
        if (Boolean.TRUE.equals(request.clearTelegramBotToken())) {
            settings.setTelegramBotToken(null);
        } else if (request.telegramBotToken() != null && !request.telegramBotToken().isBlank()) {
            settings.setTelegramBotToken(encryptSecret(request.telegramBotToken().trim()));
        }
        if (request.telegramChatId() != null) settings.setTelegramChatId(blankToNull(request.telegramChatId()));
        if (request.telegramThreadId() != null) settings.setTelegramThreadId(blankToNull(request.telegramThreadId()));
        if (request.telegramAlertOnFailedLogin() != null) {
            settings.setTelegramAlertOnFailedLogin(request.telegramAlertOnFailedLogin());
        }
        if (request.telegramFailedLoginThreshold() != null) {
            settings.setTelegramFailedLoginThreshold(request.telegramFailedLoginThreshold());
        }
        if (request.telegramAlertOnRateLimit() != null) {
            settings.setTelegramAlertOnRateLimit(request.telegramAlertOnRateLimit());
        }
        if (request.telegramAlertOnAdminLogin() != null) {
            settings.setTelegramAlertOnAdminLogin(request.telegramAlertOnAdminLogin());
        }
        if (request.telegramAlertOnSettingsChange() != null) {
            settings.setTelegramAlertOnSettingsChange(request.telegramAlertOnSettingsChange());
        }
        if (request.telegramCooldownSeconds() != null) {
            settings.setTelegramCooldownSeconds(request.telegramCooldownSeconds());
        }
        if (request.maintenanceMode() != null) {
            settings.setMaintenanceMode(request.maintenanceMode());
        }
        if (request.maintenanceMessage() != null) {
            settings.setMaintenanceMessage(blankToNull(request.maintenanceMessage()));
        }
        if (request.announcementEnabled() != null) {
            settings.setAnnouncementEnabled(request.announcementEnabled());
        }
        if (request.announcementMessage() != null) {
            settings.setAnnouncementMessage(blankToNull(request.announcementMessage()));
        }
        if (request.announcementTone() != null) {
            String tone = request.announcementTone().trim().toLowerCase(Locale.ROOT);
            settings.setAnnouncementTone(
                    ("warning".equals(tone) || "danger".equals(tone)) ? tone : "info");
        }
        if (Boolean.TRUE.equals(request.clearAnnouncementExpiresAt())) {
            settings.setAnnouncementExpiresAt(null);
        } else if (request.announcementExpiresAt() != null) {
            settings.setAnnouncementExpiresAt(request.announcementExpiresAt());
        }

        SystemSettings saved = repository.saveAndFlush(settings);
        auditService.record(actor.id(), AuditAction.SYSTEM_SETTINGS_UPDATED, saved.getId(), null, before, values(saved));
        if (securityTelemetryService != null) {
            try {
                securityTelemetryService.onSensitiveSettingsChanged(actor.id(), "Cập nhật cấu hình hệ thống");
            } catch (RuntimeException ignored) {
            }
        }
        return toEnrichedResponse(saved);
    }

    private SystemSettingsResponse toEnrichedResponse(SystemSettings settings) {
        SystemSettingsResponse base = settingsMapper.toResponse(settings);
        if (runtimeIntegrationConfig == null) {
            return base;
        }
        boolean fbReady = runtimeIntegrationConfig.facebook().isOauthConfigured();
        boolean aiReady = runtimeIntegrationConfig.ai().isConfigured();
        boolean googleReady = runtimeIntegrationConfig.google().isEnabled();
        boolean telegramReady = runtimeIntegrationConfig.telegram().isConfigured();
        return new SystemSettingsResponse(
                base.maxPendingApplications(),
                base.reapplyCooldownDays(),
                base.maxActiveClubs(),
                base.attendanceEditWindowHours(),
                base.allowSelfRegistration(),
                base.attendanceOpensBeforeMinutes(),
                base.eventTaskGraceDays(),
                base.chatSummariesPerHour(),
                base.chatMaxMessageLength(),
                base.chatMessagesPerMinute(),
                base.documentMaxFileMb(),
                base.clubImageMaxMb(),
                base.avatarMaxMb(),
                base.clubStorageQuotaMb(),
                base.documentMaxVersions(),
                base.maxChannelsPerClub(),
                base.maxDepartmentsPerClub(),
                base.maxActiveEventsPerClub(),
                base.maxOpenTasksPerClub(),
                base.broadcastCooldownMinutes(),
                base.facebookSyncCooldownMinutes(),
                base.facebookAutoSyncEnabled(),
                base.facebookAutoSyncIntervalMinutes(),
                base.otpExpiryMinutes(),
                base.otpMaxSendCount(),
                base.otpResendCooldownSeconds(),
                base.otpMaxVerifyAttempts(),
                base.smtpHost(),
                base.smtpPort(),
                base.smtpUsername(),
                base.smtpPasswordConfigured(),
                base.smtpFromEmail(),
                base.smtpFromName(),
                base.smtpStartTls(),
                base.facebookAppId(),
                base.facebookAppSecretConfigured(),
                base.facebookGraphVersion(),
                base.facebookOauthRedirectUri(),
                base.frontendBaseUrl(),
                fbReady,
                base.aiBaseUrl(),
                base.aiApiKeyConfigured(),
                base.aiModel(),
                aiReady,
                base.googleClientId(),
                base.googleAllowedDomains(),
                base.googleCreateAccounts(),
                googleReady,
                base.telegramEnabled(),
                base.telegramBotTokenConfigured(),
                base.telegramChatId(),
                base.telegramThreadId(),
                base.telegramAlertOnFailedLogin(),
                base.telegramFailedLoginThreshold(),
                base.telegramAlertOnRateLimit(),
                base.telegramAlertOnAdminLogin(),
                base.telegramAlertOnSettingsChange(),
                base.telegramCooldownSeconds(),
                telegramReady,
                base.maintenanceMode(),
                base.maintenanceMessage(),
                base.announcementEnabled(),
                base.announcementMessage(),
                base.announcementTone(),
                base.announcementExpiresAt(),
                base.updatedAt(),
                base.updatedBy());
    }

    private String encryptSecret(String raw) {
        return tokenCryptoService != null ? tokenCryptoService.encrypt(raw) : raw;
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public void sendTestEmail(Actor actor, TestSmtpEmailRequest request) {
        if (otpMailService == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "SMTP_NOT_CONFIGURED", "Mail service is unavailable");
        }
        otpMailService.sendTestSmtpEmail(request.recipientEmail().trim().toLowerCase(Locale.ROOT));
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_UPDATE)
    public void sendTestTelegram(Actor actor) {
        if (telegramAlertService == null) {
            throw new ApiException(HttpStatus.SERVICE_UNAVAILABLE, "TELEGRAM_NOT_CONFIGURED", "Telegram alert service is unavailable");
        }
        String actorEmail = userRepository == null
                ? actor.id().toString()
                : userRepository.findById(actor.id()).map(u -> u.getEmail()).orElse(actor.id().toString());
        String ip = RequestMetadataExtractor.extractCurrent().ipAddress();
        telegramAlertService.sendTestMessage(actorEmail, ip);
    }

    private SystemSettings find() {
        return repository.findSingleton().orElseThrow(() ->
                new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SYSTEM_SETTINGS_MISSING", "System settings row is missing"));
    }

    private static String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private static Map<String, Object> values(SystemSettings s) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("maxPendingApplications", s.getMaxPendingApplications());
        values.put("reapplyCooldownDays", s.getReapplyCooldownDays());
        values.put("maxActiveClubs", s.getMaxActiveClubs());
        values.put("attendanceEditWindowHours", s.getAttendanceEditWindowHours());
        values.put("allowSelfRegistration", s.isAllowSelfRegistration());
        values.put("attendanceOpensBeforeMinutes", s.getAttendanceOpensBeforeMinutes());
        values.put("eventTaskGraceDays", s.getEventTaskGraceDays());
        values.put("chatSummariesPerHour", s.getChatSummariesPerHour());
        values.put("chatMaxMessageLength", s.getChatMaxMessageLength());
        values.put("chatMessagesPerMinute", s.getChatMessagesPerMinute());
        values.put("documentMaxFileMb", s.getDocumentMaxFileMb());
        values.put("clubImageMaxMb", s.getClubImageMaxMb());
        values.put("avatarMaxMb", s.getAvatarMaxMb());
        values.put("clubStorageQuotaMb", s.getClubStorageQuotaMb());
        values.put("documentMaxVersions", s.getDocumentMaxVersions());
        values.put("maxChannelsPerClub", s.getMaxChannelsPerClub());
        values.put("maxDepartmentsPerClub", s.getMaxDepartmentsPerClub());
        values.put("maxActiveEventsPerClub", s.getMaxActiveEventsPerClub());
        values.put("maxOpenTasksPerClub", s.getMaxOpenTasksPerClub());
        values.put("broadcastCooldownMinutes", s.getBroadcastCooldownMinutes());
        values.put("facebookSyncCooldownMinutes", s.getFacebookSyncCooldownMinutes());
        values.put("facebookAutoSyncEnabled", s.isFacebookAutoSyncEnabled());
        values.put("facebookAutoSyncIntervalMinutes", s.getFacebookAutoSyncIntervalMinutes());
        values.put("otpExpiryMinutes", s.getOtpExpiryMinutes());
        values.put("otpMaxSendCount", s.getOtpMaxSendCount());
        values.put("otpResendCooldownSeconds", s.getOtpResendCooldownSeconds());
        values.put("otpMaxVerifyAttempts", s.getOtpMaxVerifyAttempts());
        values.put("smtpHost", s.getSmtpHost());
        values.put("smtpPort", s.getSmtpPort());
        values.put("smtpUsername", s.getSmtpUsername());
        values.put("smtpPasswordConfigured", s.getSmtpPassword() != null && !s.getSmtpPassword().isBlank());
        values.put("smtpFromEmail", s.getSmtpFromEmail());
        values.put("smtpFromName", s.getSmtpFromName());
        values.put("smtpStartTls", s.isSmtpStartTls());
        values.put("facebookAppId", s.getFacebookAppId());
        values.put("facebookAppSecretConfigured", s.getFacebookAppSecret() != null && !s.getFacebookAppSecret().isBlank());
        values.put("facebookGraphVersion", s.getFacebookGraphVersion());
        values.put("facebookOauthRedirectUri", s.getFacebookOauthRedirectUri());
        values.put("frontendBaseUrl", s.getFrontendBaseUrl());
        values.put("aiBaseUrl", s.getAiBaseUrl());
        values.put("aiApiKeyConfigured", s.getAiApiKey() != null && !s.getAiApiKey().isBlank());
        values.put("aiModel", s.getAiModel());
        values.put("googleClientId", s.getGoogleClientId());
        values.put("googleAllowedDomains", s.getGoogleAllowedDomains());
        values.put("googleCreateAccounts", s.getGoogleCreateAccounts());
        values.put("telegramEnabled", s.isTelegramEnabled());
        values.put("telegramBotTokenConfigured", s.getTelegramBotToken() != null && !s.getTelegramBotToken().isBlank());
        values.put("telegramChatId", s.getTelegramChatId());
        values.put("telegramThreadId", s.getTelegramThreadId());
        values.put("telegramAlertOnFailedLogin", s.isTelegramAlertOnFailedLogin());
        values.put("telegramFailedLoginThreshold", s.getTelegramFailedLoginThreshold());
        values.put("telegramAlertOnRateLimit", s.isTelegramAlertOnRateLimit());
        values.put("telegramAlertOnAdminLogin", s.isTelegramAlertOnAdminLogin());
        values.put("telegramAlertOnSettingsChange", s.isTelegramAlertOnSettingsChange());
        values.put("telegramCooldownSeconds", s.getTelegramCooldownSeconds());
        values.put("maintenanceMode", s.isMaintenanceMode());
        values.put("maintenanceMessage", s.getMaintenanceMessage());
        values.put("announcementEnabled", s.isAnnouncementEnabled());
        values.put("announcementMessage", s.getAnnouncementMessage());
        values.put("announcementTone", s.getAnnouncementTone());
        values.put("announcementExpiresAt", s.getAnnouncementExpiresAt());
        return values;
    }
}
