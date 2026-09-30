package com.vju.club.security;

import com.vju.club.error.ApiException;
import com.vju.club.repository.UserPermissionRepository;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Component;

import java.util.UUID;

@Component("permissionAuthorizationService")
public class PermissionAuthorizationService {

    private final UserPermissionRepository userPermissionRepository;

    public PermissionAuthorizationService(UserPermissionRepository userPermissionRepository) {
        this.userPermissionRepository = userPermissionRepository;
    }

    public boolean hasPermission(Authentication authentication, String permissionKey, UUID clubId, UUID departmentId) {
        if (authentication == null || !authentication.isAuthenticated()) {
            return false;
        }
        UUID userId;
        try {
            userId = SecurityIdentity.userId(authentication);
        } catch (RuntimeException exception) {
            return false;
        }

        if (departmentId != null && userPermissionRepository.hasInDepartment(userId, permissionKey, departmentId)) {
            return true;
        }
        if (clubId != null && userPermissionRepository.hasInClub(userId, permissionKey, clubId)) {
            return true;
        }
        return userPermissionRepository.hasGlobal(userId, permissionKey);
    }

    public boolean hasGlobalPermission(Authentication authentication, String permissionKey) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        try {
            return userPermissionRepository.hasGlobal(SecurityIdentity.userId(authentication), permissionKey);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    public boolean hasAnyPermission(Authentication authentication, String permissionKey) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        try {
            return userPermissionRepository.hasAnywhere(SecurityIdentity.userId(authentication), permissionKey);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    public void require(Authentication authentication, String permissionKey, UUID clubId, UUID departmentId) {
        if (!hasPermission(authentication, permissionKey, clubId, departmentId)) {
            throw forbidden();
        }
    }

    /**
     * Error for a resource id that does not exist. Only callers holding the permission globally may
     * learn that (404); everyone else gets the same 403 as for an existing resource they cannot
     * access, so ids cannot be probed.
     */
    public ApiException missingResource(Authentication authentication, String permissionKey, ApiException notFound) {
        return hasGlobalPermission(authentication, permissionKey) ? notFound : forbidden();
    }

    private static ApiException forbidden() {
        return new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
    }
}
