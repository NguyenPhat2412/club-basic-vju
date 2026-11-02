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
                Map.of("maxPendingApplications", 3, "reapplyCooldownDays", 7, "maxActiveClubs", 2),
                Map.of("maxPendingApplications", 6, "reapplyCooldownDays", 30, "maxActiveClubs", 4));
    }
}
