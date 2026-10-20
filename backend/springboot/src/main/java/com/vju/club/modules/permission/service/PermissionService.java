package com.vju.club.modules.permission.service;

import com.vju.club.modules.permission.dto.request.GrantPermissionRequest;
import com.vju.club.modules.permission.dto.request.ReplacePermissionsRequest;
import com.vju.club.modules.permission.dto.response.EffectivePermissionResponse;
import com.vju.club.modules.permission.dto.response.PermissionGroupResponse;
import com.vju.club.modules.permission.dto.response.PermissionResponse;
import com.vju.club.modules.permission.dto.response.UserPermissionResponse;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.security.Actor;

import java.util.List;
import java.util.UUID;

public interface PermissionService {
    List<PermissionResponse> list(Actor actor);

    List<PermissionGroupResponse> listGroups(Actor actor);

    List<UserPermissionResponse> listUserPermissions(Actor actor, UUID targetUserId);

    List<EffectivePermissionResponse> listEffective(Actor actor, UUID targetUserId);

    UserPermissionResponse grant(Actor actor, UUID targetUserId, GrantPermissionRequest request);

    List<UserPermissionResponse> replace(Actor actor, UUID targetUserId, ReplacePermissionsRequest request);

    void revoke(Actor actor, UUID targetUserId, UUID permissionId, PermissionScope scope, UUID clubId, UUID departmentId);

    void revokeByKey(Actor actor, UUID targetUserId, String permissionKey, PermissionScope scope, UUID clubId, UUID departmentId);
}
