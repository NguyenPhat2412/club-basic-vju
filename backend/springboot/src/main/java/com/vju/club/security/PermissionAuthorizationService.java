package com.vju.club.security;

import com.vju.club.error.ApiException;
import com.vju.club.repository.UserPermissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.UUID;

/**
 * Answers "may this actor do X here?". A permission counts when granted directly or through an
 * active role, at the department, the department's club, or globally.
 */
@Component
public class PermissionAuthorizationService {

    private final UserPermissionRepository userPermissionRepository;

    public PermissionAuthorizationService(UserPermissionRepository userPermissionRepository) {
        this.userPermissionRepository = userPermissionRepository;
    }

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

    public void require(Actor actor, String permissionKey, UUID clubId, UUID departmentId) {
        if (!hasPermission(actor, permissionKey, clubId, departmentId)) {
            throw forbidden();
        }
    }

    /**
     * Error for a resource id that does not exist. Only callers holding the permission globally may
     * learn that (404); everyone else gets the same 403 as for an existing resource they cannot
     * access, so ids cannot be probed.
     */
    public ApiException missingResource(Actor actor, String permissionKey, ApiException notFound) {
        return hasGlobalPermission(actor, permissionKey) ? notFound : forbidden();
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
