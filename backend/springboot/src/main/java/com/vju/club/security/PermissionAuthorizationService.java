package com.vju.club.security;

import com.vju.club.entity.PermissionScope;
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

        if (departmentId != null && userPermissionRepository
                .existsForDepartment(
                        userId, permissionKey, PermissionScope.DEPARTMENT, departmentId)) {
            return true;
        }
        if (clubId != null && userPermissionRepository
                .existsForClub(
                        userId, permissionKey, PermissionScope.CLUB, clubId)) {
            return true;
        }
        return userPermissionRepository
                .existsGlobal(
                        userId, permissionKey, PermissionScope.GLOBAL);
    }

    public boolean hasGlobalPermission(Authentication authentication, String permissionKey) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        try {
            return userPermissionRepository.existsGlobal(
                    SecurityIdentity.userId(authentication), permissionKey, PermissionScope.GLOBAL);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    public boolean hasAnyPermission(Authentication authentication, String permissionKey) {
        if (authentication == null || !authentication.isAuthenticated()) return false;
        try {
            return userPermissionRepository.existsByUser_IdAndPermission_PermissionKeyAndPermission_ActiveTrueAndRevokedAtIsNull(
                    SecurityIdentity.userId(authentication), permissionKey);
        } catch (RuntimeException exception) {
            return false;
        }
    }

    public void require(Authentication authentication, String permissionKey, UUID clubId, UUID departmentId) {
        if (!hasPermission(authentication, permissionKey, clubId, departmentId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "PERMISSION_DENIED", "Permission denied");
        }
    }
}
