package com.vju.club.modules.permission.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.audit.enums.PermissionAuditAction;
import com.vju.club.modules.audit.entity.PermissionAuditLog;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.error.ApiException;
import com.vju.club.modules.permission.dto.response.EffectivePermissionResponse;
import com.vju.club.modules.permission.dto.request.GrantPermissionRequest;
import com.vju.club.modules.permission.dto.response.PermissionGroupResponse;
import com.vju.club.modules.permission.dto.request.ReplacePermissionsRequest;
import com.vju.club.modules.permission.dto.response.PermissionResponse;
import com.vju.club.modules.permission.dto.response.UserPermissionResponse;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.audit.repository.PermissionAuditLogRepository;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.ScopeRules;
import org.springframework.http.HttpStatus;
import java.time.OffsetDateTime;
import java.time.Clock;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeMap;
import java.util.TreeSet;
import java.util.Objects;
import java.util.UUID;

public interface PermissionService {

    List<PermissionResponse> list(Actor actor);

    List<PermissionGroupResponse> listGroups(Actor actor);

    List<UserPermissionResponse> listUserPermissions(Actor actor, UUID targetUserId);

    List<EffectivePermissionResponse> listEffective(Actor actor, UUID targetUserId);

    UserPermissionResponse grant( Actor actor, UUID targetUserId, GrantPermissionRequest request);

    List<UserPermissionResponse> replace(Actor actor, UUID targetUserId, ReplacePermissionsRequest request);

    void revoke(Actor actor, UUID targetUserId, UUID permissionId, PermissionScope scope, UUID clubId, UUID departmentId);

}
