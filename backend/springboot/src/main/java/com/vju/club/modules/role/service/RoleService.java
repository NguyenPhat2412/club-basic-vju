package com.vju.club.modules.role.service;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.audit.enums.PermissionAuditAction;
import com.vju.club.modules.audit.entity.PermissionAuditLog;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.role.entity.UserRole;
import com.vju.club.error.ApiException;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.audit.repository.PermissionAuditLogRepository;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import com.vju.club.modules.role.dto.request.AssignRoleRequest;
import com.vju.club.modules.role.dto.request.CreateRoleRequest;
import com.vju.club.modules.role.dto.response.RoleResponse;
import com.vju.club.modules.role.dto.request.UpdateRoleRequest;
import com.vju.club.modules.role.dto.response.UserRoleResponse;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.ScopeRules;
import org.springframework.http.HttpStatus;
import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

public interface RoleService {

    List<RoleResponse> list(Actor actor);

    RoleResponse get(Actor actor, UUID roleId);

    RoleResponse create(Actor actor, CreateRoleRequest request);

    RoleResponse update(Actor actor, UUID roleId, UpdateRoleRequest request);

    List<UserRoleResponse> listAssignments(Actor actor, UUID userId);

    UserRoleResponse assign(Actor actor, UUID userId, AssignRoleRequest request);

    void revoke(Actor actor, UUID userId, UUID assignmentId);

}
