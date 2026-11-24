package com.vju.club.service;

import com.vju.club.common.SettingConstants;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import com.vju.club.enums.AuditAction;
import com.vju.club.mapper.SystemSettingsMapperImpl;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.impl.SystemSettingsServiceImpl;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.OffsetDateTime;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class SystemSettingsServiceTest {
    @Mock SystemSettingsRepository repository;
    @Mock AuditService auditService;
    @Mock PermissionAuthorizationService authorization;

    private final Actor actor = new Actor(UUID.randomUUID());
    private SystemSettingsService service;

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(
                new SystemSettingsServiceImpl(repository, auditService, new SystemSettingsMapperImpl()),
                authorization);
    }

    private static SystemSettings singleton(int maxPending, int cooldownDays, int maxClubs) {
        SystemSettings settings = new SystemSettings();
        settings.setId(UUID.randomUUID());
        settings.setMaxPendingApplications(maxPending);
        settings.setReapplyCooldownDays(cooldownDays);
        settings.setMaxActiveClubs(maxClubs);
        settings.setUpdatedAt(OffsetDateTime.parse("2026-11-02T00:00:00Z"));
        return settings;
    }

    @Test
    void currentReturnsDtoWithoutPermissionCheck() {
        SystemSettings row = singleton(5, 14, 3);
        when(repository.findSingleton()).thenReturn(Optional.of(row));

        SystemSettingsResponse response = service.current();

        assertThat(response.maxPendingApplications()).isEqualTo(5);
        assertThat(response.reapplyCooldownDays()).isEqualTo(14);
        assertThat(response.maxActiveClubs()).isEqualTo(3);
        assertThat(response.updatedAt()).isEqualTo(row.getUpdatedAt());
    }

    @Test
    void getRequiresSettingViewPermission() {
        doThrow(FORBIDDEN).when(authorization).require(actor, SettingConstants.PERMISSION_VIEW, null, null);

        assertApiError(() -> service.get(actor), HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(repository, never()).findSingleton();
    }

    @Test
    void updatePersistsAndRecordsAuditLog() {
        SystemSettings row = singleton(3, 7, 2);
        when(repository.findSingleton()).thenReturn(Optional.of(row));
        when(repository.saveAndFlush(any(SystemSettings.class))).thenAnswer(inv -> inv.getArgument(0));

        SystemSettingsResponse updated = service.update(actor, new UpdateSystemSettingsRequest(6, 30, 4));

        verify(authorization).require(actor, SettingConstants.PERMISSION_UPDATE, null, null);
        assertThat(updated.maxPendingApplications()).isEqualTo(6);
        assertThat(updated.reapplyCooldownDays()).isEqualTo(30);
        assertThat(updated.maxActiveClubs()).isEqualTo(4);
        verify(auditService).record(
                actor.id(),
                AuditAction.SYSTEM_SETTINGS_UPDATED,
                row.getId(),
                null,
                auditValues(3, 7, 2),
                auditValues(6, 30, 4));
    }

    private static Map<String, Object> auditValues(int pending, int cooldown, int clubs) {
        Map<String, Object> values = new java.util.LinkedHashMap<>();
        values.put("maxPendingApplications", pending);
        values.put("reapplyCooldownDays", cooldown);
        values.put("maxActiveClubs", clubs);
        values.put("attendanceEditWindowHours", 48);
        values.put("allowSelfRegistration", true);
        values.put("attendanceOpensBeforeMinutes", 120);
        values.put("eventTaskGraceDays", 7);
        values.put("chatSummariesPerHour", 10);
        values.put("chatMaxMessageLength", 4000);
        values.put("chatMessagesPerMinute", 20);
        values.put("documentMaxFileMb", 20);
        values.put("clubImageMaxMb", 10);
        values.put("avatarMaxMb", 5);
        values.put("clubStorageQuotaMb", 500);
        values.put("documentMaxVersions", 20);
        values.put("maxChannelsPerClub", 30);
        values.put("maxDepartmentsPerClub", 20);
        values.put("maxActiveEventsPerClub", 50);
        values.put("maxOpenTasksPerClub", 200);
        values.put("broadcastCooldownMinutes", 5);
        values.put("facebookSyncCooldownMinutes", 2);
        values.put("facebookAutoSyncEnabled", true);
        values.put("facebookAutoSyncIntervalMinutes", 60);
        values.put("otpExpiryMinutes", 5);
        values.put("otpMaxSendCount", 5);
        values.put("otpResendCooldownSeconds", 60);
        values.put("otpMaxVerifyAttempts", 5);
        values.put("smtpHost", null);
        values.put("smtpPort", 587);
        values.put("smtpUsername", null);
        values.put("smtpPasswordConfigured", false);
        values.put("smtpFromEmail", null);
        values.put("smtpFromName", "VJU ClubHub");
        values.put("smtpStartTls", true);
        values.put("facebookAppId", null);
        values.put("facebookAppSecretConfigured", false);
        values.put("facebookGraphVersion", null);
        values.put("facebookOauthRedirectUri", null);
        values.put("frontendBaseUrl", null);
        values.put("aiBaseUrl", null);
        values.put("aiApiKeyConfigured", false);
        values.put("aiModel", null);
        values.put("googleClientId", null);
        values.put("googleAllowedDomains", null);
        values.put("googleCreateAccounts", null);
        return values;
    }

    @Test
    void updateSupportsAttendanceEditWindowHours() {
        SystemSettings row = singleton(3, 7, 2);
        when(repository.findSingleton()).thenReturn(Optional.of(row));
        when(repository.saveAndFlush(any(SystemSettings.class))).thenAnswer(inv -> inv.getArgument(0));

        SystemSettingsResponse updated = service.update(actor, new UpdateSystemSettingsRequest(3, 7, 2, 72));
        assertThat(updated.attendanceEditWindowHours()).isEqualTo(72);
    }

    @Test
    void updateEncryptsIntegrationSecretsAndSupportsClearing() {
        SystemSettingsServiceImpl impl = new SystemSettingsServiceImpl(repository, auditService, new SystemSettingsMapperImpl());
        com.vju.club.config.FacebookProperties fbProps = new com.vju.club.config.FacebookProperties();
        com.vju.club.security.TokenCryptoService crypto = new com.vju.club.security.TokenCryptoService(fbProps);
        org.springframework.test.util.ReflectionTestUtils.setField(impl, "tokenCryptoService", crypto);
        SystemSettingsService securedService = withPermissionChecks(impl, authorization);

        SystemSettings row = singleton(3, 7, 2);
        when(repository.findSingleton()).thenReturn(Optional.of(row));
        when(repository.saveAndFlush(any(SystemSettings.class))).thenAnswer(inv -> inv.getArgument(0));

        UpdateSystemSettingsRequest setReq = new UpdateSystemSettingsRequest(
                3, 7, 2, 48, true, 120, 7, 10, 4000, 20, 20, 10, 5, 500, 20, 30, 20, 50, 200, 5, 2, true, 30,
                5, 5, 60, 5, null, 587, null, null, false, null, "VJU ClubHub", true,
                "1536758708287043", "super-fb-secret", false, "v22.0",
                "http://localhost:8080/api/v1/integrations/facebook/oauth/callback", "http://localhost:3000",
                "https://router.anhchau.all1.vn/v1", "sk-ai-secret", false, "apmarket",
                "google-client-id", "st.vju.ac.vn", true);

        SystemSettingsResponse saved = securedService.update(actor, setReq);
        assertThat(saved.facebookAppId()).isEqualTo("1536758708287043");
        assertThat(saved.facebookAppSecretConfigured()).isTrue();
        assertThat(saved.facebookAutoSyncEnabled()).isTrue();
        assertThat(saved.facebookAutoSyncIntervalMinutes()).isEqualTo(30);
        assertThat(saved.aiApiKeyConfigured()).isTrue();
        assertThat(saved.googleClientId()).isEqualTo("google-client-id");
        assertThat(row.getFacebookAppSecret()).startsWith("enc:v1:");
        assertThat(crypto.decrypt(row.getFacebookAppSecret())).isEqualTo("super-fb-secret");
        assertThat(row.getAiApiKey()).startsWith("enc:v1:");
        assertThat(crypto.decrypt(row.getAiApiKey())).isEqualTo("sk-ai-secret");

        UpdateSystemSettingsRequest clearReq = new UpdateSystemSettingsRequest(
                3, 7, 2, 48, true, 120, 7, 10, 4000, 20, 20, 10, 5, 500, 20, 30, 20, 50, 200, 5, 2, false, 60,
                5, 5, 60, 5, null, 587, null, null, false, null, "VJU ClubHub", true,
                "", null, true, "", "", "", "", null, true, "", "", "", null);

        SystemSettingsResponse cleared = securedService.update(actor, clearReq);
        assertThat(cleared.facebookAppSecretConfigured()).isFalse();
        assertThat(cleared.aiApiKeyConfigured()).isFalse();
        assertThat(row.getFacebookAppSecret()).isNull();
        assertThat(row.getAiApiKey()).isNull();
    }
}
