package com.vju.club.service.impl;

import com.vju.club.annotation.RequirePermission;
import com.vju.club.common.SettingConstants;
import com.vju.club.dto.request.UpdateSystemSettingsRequest;
import com.vju.club.dto.response.SystemSettingsResponse;
import com.vju.club.entity.SystemSettings;
import com.vju.club.enums.AuditAction;
import com.vju.club.error.ApiException;
import com.vju.club.mapper.SystemSettingsMapper;
import com.vju.club.repository.SystemSettingsRepository;
import com.vju.club.security.Actor;
import com.vju.club.service.AuditService;
import com.vju.club.service.SystemSettingsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Map;

@Service
@RequiredArgsConstructor
public class SystemSettingsServiceImpl implements SystemSettingsService {
    private final SystemSettingsRepository repository;
    private final AuditService auditService;
    private final SystemSettingsMapper settingsMapper;

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
        SystemSettings saved = repository.saveAndFlush(settings);
        auditService.record(actor.id(), AuditAction.SYSTEM_SETTINGS_UPDATED, saved.getId(), null, before, values(saved));
        return settingsMapper.toResponse(saved);
    }

    private SystemSettings find() {
        return repository.findSingleton().orElseThrow(() ->
                new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, "SYSTEM_SETTINGS_MISSING", "System settings row is missing"));
    }

    private static Map<String, Object> values(SystemSettings s) {
        return Map.of(
                "maxPendingApplications", s.getMaxPendingApplications(),
                "reapplyCooldownDays", s.getReapplyCooldownDays(),
                "maxActiveClubs", s.getMaxActiveClubs(),
                "attendanceEditWindowHours", s.getAttendanceEditWindowHours());
    }
}

