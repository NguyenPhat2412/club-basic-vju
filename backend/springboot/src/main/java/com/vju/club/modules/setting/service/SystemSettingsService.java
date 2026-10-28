package com.vju.club.modules.setting.service;

import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.security.Actor;
import com.vju.club.modules.setting.dto.SystemSettingsResponse;
import com.vju.club.modules.setting.dto.UpdateSystemSettingsRequest;
import com.vju.club.modules.setting.entity.SystemSettings;
import com.vju.club.modules.setting.repository.SystemSettingsRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class SystemSettingsService {
    private final SystemSettingsRepository repository;
    private final AuditService auditService;

    /** The limits the rest of the system enforces; no permission check. */
    @Transactional(readOnly = true)
    public SystemSettings current() {
        return find();
    }

    @Transactional(readOnly = true)
    @RequirePermission("setting.view")
    public SystemSettingsResponse get(Actor actor) {
        return toResponse(find());
    }

    @Transactional
    @RequirePermission("setting.update")
    public SystemSettingsResponse update(Actor actor, UpdateSystemSettingsRequest request) {
        SystemSettings settings = find();
        Map<String, Object> before = values(settings);
        settings.setMaxPendingApplications(request.maxPendingApplications());
        settings.setReapplyCooldownDays(request.reapplyCooldownDays());
        settings.setMaxActiveClubs(request.maxActiveClubs());
        SystemSettings saved = repository.saveAndFlush(settings);
        auditService.record(actor.id(), AuditAction.SYSTEM_SETTINGS_UPDATED, saved.getId(), null, before, values(saved));
        return toResponse(saved);
    }

    private SystemSettings find() {
        return repository.findSingleton().orElseThrow(() ->
                new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SYSTEM_SETTINGS_MISSING", "System settings row is missing"));
    }

    private static Map<String, Object> values(SystemSettings s) {
        return Map.of(
                "maxPendingApplications", s.getMaxPendingApplications(),
                "reapplyCooldownDays", s.getReapplyCooldownDays(),
                "maxActiveClubs", s.getMaxActiveClubs());
    }

    private static SystemSettingsResponse toResponse(SystemSettings s) {
        return new SystemSettingsResponse(s.getMaxPendingApplications(), s.getReapplyCooldownDays(), s.getMaxActiveClubs(),
                s.getUpdatedAt(), s.getUpdatedBy());
    }
}
