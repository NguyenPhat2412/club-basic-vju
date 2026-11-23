package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.dto.request.TestSmtpEmailRequest;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.SystemSettingsMapper;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.AuditService;
import com.vju.club.service.OtpMailService;
import com.vju.club.service.SystemSettingsService;
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

    @Override
    @Transactional(readOnly = true)
    public SystemSettingsResponse current() {
        return settingsMapper.toResponse(find());
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(SettingConstants.PERMISSION_VIEW)
    public SystemSettingsResponse get(Actor actor) {
        return settingsMapper.toResponse(find());
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

        SystemSettings saved = repository.saveAndFlush(settings);
        auditService.record(actor.id(), AuditAction.SYSTEM_SETTINGS_UPDATED, saved.getId(), null, before, values(saved));
        return settingsMapper.toResponse(saved);
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
        return values;
    }
}
