package com.vju.club.security;

import lombok.RequiredArgsConstructor;
import com.vju.club.modules.permission.entity.Permission;

import com.vju.club.error.ApiException;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component
@RequiredArgsConstructor
public class PermissionAuthorizationService {
    private final UserPermissionRepository userPermissionRepository;

    public boolean hasPermission(Actor actor, String permissionKey, UUID clubId, UUID departmentId) {
        if (actor == null) {
            return false;
        }
        UUID userId = actor.id();
        if (departmentId != null && userPermissionRepository.hasInDepartment(userId, permissionKey, departmentId)) {
            return true;
        }
        if (clubId != null && userPermissionRepository.hasInClub(userId, permissionKey, clubId)) {
            return true;
        }
        return userPermissionRepository.hasGlobal(userId, permissionKey);
    }

    public boolean hasGlobalPermission(Actor actor, String permissionKey) {
        return actor != null && userPermissionRepository.hasGlobal(actor.id(), permissionKey);
    }

    public boolean hasAnyPermission(Actor actor, String permissionKey) {
        return actor != null && userPermissionRepository.hasAnywhere(actor.id(), permissionKey);
    }

    public java.util.Set<UUID> getPermittedClubIds(Actor actor, String permissionKey) {
        if (actor == null) {
            return java.util.Collections.emptySet();
        }
        return userPermissionRepository.findEffective(actor.id()).stream()
                .filter(row -> permissionKey.equals(row.getPermissionKey()) && "CLUB".equals(row.getScope()) && row.getClubId() != null)
                .map(UserPermissionRepository.EffectivePermissionRow::getClubId)
                .collect(java.util.stream.Collectors.toSet());
    }

    public void require(Actor actor, String permissionKey, UUID clubId, UUID departmentId) {
        if (!hasPermission(actor, permissionKey, clubId, departmentId)) {
            throw forbidden();
        }
    }

    public ApiException missingResource(Actor actor, String permissionKey, ApiException notFound) {
        return hasGlobalPermission(actor, permissionKey) ? notFound : forbidden();
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
