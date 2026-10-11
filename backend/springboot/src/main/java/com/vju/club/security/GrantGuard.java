package com.vju.club.security;

import com.vju.club.error.ApiException;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.role.repository.UserRoleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

import java.util.Collection;
import java.util.UUID;

@Component
@RequiredArgsConstructor
public class GrantGuard {
    public static final String SYSTEM_ADMIN = "SYSTEM_ADMIN";

    private final PermissionAuthorizationService authorization;
    private final UserRoleRepository userRoles;

    public void requireCanGrant(Actor actor, Collection<Permission> permissions, PermissionScope scope,
                                UUID clubId, Department department) {
        UUID targetClubId = department != null ? department.getClub().getId() : clubId;
        UUID departmentId = department == null ? null : department.getId();
        for (Permission permission : permissions) {
            boolean held = scope == PermissionScope.GLOBAL
                    ? authorization.hasGlobalPermission(actor, permission.getPermissionKey())
                    : authorization.hasPermission(actor, permission.getPermissionKey(), targetClubId, departmentId);
            if (!held) {
                throw new ApiException(HttpStatus.FORBIDDEN, "GRANT_EXCEEDS_OWN_PERMISSIONS",
                        "You can only grant permissions you hold yourself: " + permission.getPermissionKey());
            }
        }
    }

    public void requireCanGrantRole(Actor actor, Role role, PermissionScope scope, UUID clubId, Department department) {
        if (SYSTEM_ADMIN.equals(role.getCode()) && !isSystemAdmin(actor.id())) {
            throw new ApiException(HttpStatus.FORBIDDEN, "SYSTEM_ADMIN_ONLY",
                    "Only a system administrator can grant or revoke the system administrator role");
        }
        requireCanGrant(actor, role.getPermissions(), scope, clubId, department);
    }

    public boolean isSystemAdmin(UUID userId) {
        return userRoles.holdsRole(userId, SYSTEM_ADMIN);
    }

    public void requireNotLastSystemAdmin(UUID userId) {
        if (isSystemAdmin(userId) && userRoles.countActiveHolders(SYSTEM_ADMIN) <= 1) {
            throw new ApiException(HttpStatus.CONFLICT, "LAST_SYSTEM_ADMIN",
                    "The last active system administrator cannot be removed or deactivated");
        }
    }
}
