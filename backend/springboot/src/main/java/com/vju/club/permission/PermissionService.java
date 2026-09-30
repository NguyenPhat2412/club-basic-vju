package com.vju.club.permission;

import com.vju.club.permission.dto.EffectivePermissionResponse;
import com.vju.club.permission.dto.GrantPermissionRequest;
import com.vju.club.permission.dto.PermissionResponse;
import com.vju.club.permission.dto.UserPermissionResponse;
import org.springframework.security.core.Authentication;

import java.util.List;
import java.util.UUID;

public interface PermissionService {
    List<PermissionResponse> list(Authentication authentication);
    List<UserPermissionResponse> listUserPermissions(Authentication authentication, UUID targetUserId);
    List<EffectivePermissionResponse> listEffective(Authentication authentication, UUID targetUserId);
    UserPermissionResponse grant(Authentication authentication, UUID targetUserId, GrantPermissionRequest request);
    void revoke(Authentication authentication, UUID targetUserId, UUID permissionId,
                com.vju.club.entity.PermissionScope scope, UUID clubId, UUID departmentId);
}
