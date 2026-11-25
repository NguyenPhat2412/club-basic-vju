package com.vju.club.service.impl;

import com.vju.club.dto.request.GrantPermissionRequest;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Permission;
import com.vju.club.entity.PermissionAuditLog;
import com.vju.club.entity.User;
import com.vju.club.entity.UserPermission;
import com.vju.club.enums.PermissionAuditAction;
import com.vju.club.enums.PermissionScope;
import com.vju.club.error.ApiException;
import com.vju.club.repository.PermissionAuditLogRepository;
import com.vju.club.security.ScopeRules;
import org.springframework.http.HttpStatus;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.Objects;
import java.util.UUID;

final class PermissionServiceSupport {
    private PermissionServiceSupport() {
    }

    static Map<String, Object> grantValues(UserPermission grant, String reason) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", grant.getUser().getId());
        values.put("permissionKey", grant.getPermission().getPermissionKey());
        values.put("scope", grant.getScope());
        values.put("clubId", grant.getClub() == null ? null : grant.getClub().getId());
        values.put("departmentId", grant.getDepartment() == null ? null : grant.getDepartment().getId());
        if (reason != null) values.put("reason", reason);
        return values;
    }

    static UUID clubOf(Club club, Department department) {
        if (club != null) return club.getId();
        return department == null ? null : department.getClub().getId();
    }

    static boolean sameTarget(UserPermission grant, PermissionScope scope, UUID clubId, UUID departmentId) {
        return grant.getScope() == scope
                && Objects.equals(grant.getClub() == null ? null : grant.getClub().getId(), clubId)
                && Objects.equals(grant.getDepartment() == null ? null : grant.getDepartment().getId(), departmentId);
    }

    static void validateScope(Permission permission, GrantPermissionRequest request) {
        if (!ScopeRules.canGrantAt(permission.getScope(), request.scope())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH",
                    "Grant scope does not match permission scope");
        }
        if (!ScopeRules.targetMatches(request.scope(), request.clubId(), request.departmentId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE", "Scope target is invalid");
        }
    }

    static boolean sameScope(UserPermission grant, GrantPermissionRequest request) {
        UUID clubId = grant.getClub() == null ? null : grant.getClub().getId();
        UUID departmentId = grant.getDepartment() == null ? null : grant.getDepartment().getId();
        return grant.getScope() == request.scope()
                && Objects.equals(clubId, request.clubId())
                && Objects.equals(departmentId, request.departmentId());
    }

    static void recordPermissionAudit(
            PermissionAuditLogRepository auditLogRepository,
            User actor,
            User target,
            Permission permission,
            PermissionAuditAction action,
            PermissionScope scope,
            Club club,
            Department department,
            String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setActorUser(actor);
        log.setTargetUser(target);
        log.setPermission(permission);
        log.setAction(action);
        log.setScope(scope);
        log.setClub(club);
        log.setDepartment(department);
        log.setReason(reason);
        auditLogRepository.saveAndFlush(log);
    }
}
