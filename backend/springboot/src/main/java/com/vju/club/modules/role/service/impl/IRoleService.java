package com.vju.club.modules.role.service.impl;

import com.vju.club.modules.role.service.RoleService;

import com.vju.club.security.Actor;
import com.vju.club.modules.audit.entity.AuditAction;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.audit.entity.PermissionAuditAction;
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
import com.vju.club.modules.role.config.request.AssignRoleRequest;
import com.vju.club.modules.role.config.request.CreateRoleRequest;
import com.vju.club.modules.role.config.response.RoleResponse;
import com.vju.club.modules.role.config.request.UpdateRoleRequest;
import com.vju.club.modules.role.config.response.UserRoleResponse;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.ScopeRules;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.LinkedHashMap;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

/**
 * Role definitions (named permission bundles) and their assignment to users. Assignments follow the
 * same scope rules as direct grants and are audited in permission_audit_logs.
 */
@Service
public class IRoleService implements RoleService {

    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;
    private final AuditService auditService;

    public IRoleService(RoleRepository roleRepository, UserRoleRepository userRoleRepository,
                       PermissionRepository permissionRepository, PermissionAuditLogRepository auditLogRepository,
                       UserRepository userRepository, ClubRepository clubRepository,
                       DepartmentRepository departmentRepository, PermissionAuthorizationService authorizationService,
                       Clock clock, AuditService auditService) {
        this.auditService = auditService;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.departmentRepository = departmentRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    // ---- role definitions -----------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<RoleResponse> list(Actor actor) {
        authorizationService.require(actor, "role.view", null, null);
        return roleRepository.findAllWithPermissions().stream().map(RoleResponse::from).toList();
    }

    @Transactional(readOnly = true)
    public RoleResponse get(Actor actor, UUID roleId) {
        authorizationService.require(actor, "role.view", null, null);
        return RoleResponse.from(findRole(roleId));
    }

    @Transactional
    public RoleResponse create(Actor actor, CreateRoleRequest request) {
        authorizationService.require(actor, "role.manage", null, null);
        String code = request.code().trim().toUpperCase(Locale.ROOT);
        if (roleRepository.existsByCodeIgnoreCase(code)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLE_CODE_ALREADY_EXISTS", "Role code is already used");
        }
        Role role = new Role();
        role.setCode(code);
        role.setName(request.name().trim());
        role.setDescription(request.description());
        role.setScope(request.scope());
        role.setPermissions(resolvePermissions(request.permissionIds(), role));
        Role saved = roleRepository.saveAndFlush(role);
        auditService.record(actor.id(), AuditAction.ROLE_CREATED, saved.getId(), null, null, snapshot(saved));
        return RoleResponse.from(saved);
    }

    @Transactional
    public RoleResponse update(Actor actor, UUID roleId, UpdateRoleRequest request) {
        authorizationService.require(actor, "role.manage", null, null);
        Role role = findRole(roleId);
        if (role.isSystem()) {
            throw new ApiException(HttpStatus.CONFLICT, "SYSTEM_ROLE_IMMUTABLE", "System roles cannot be changed");
        }
        Map<String, Object> before = snapshot(role);
        if (request.name() != null) {
            if (request.name().isBlank()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_ROLE_NAME", "Role name cannot be blank");
            }
            role.setName(request.name().trim());
        }
        if (request.description() != null) role.setDescription(request.description());
        if (request.active() != null) role.setActive(request.active());
        if (request.permissionIds() != null) role.setPermissions(resolvePermissions(request.permissionIds(), role));
        Role saved = roleRepository.saveAndFlush(role);
        auditService.recordChange(actor.id(), AuditAction.ROLE_UPDATED, roleId, null, before, snapshot(saved));
        return RoleResponse.from(saved);
    }

    /** Every permission must exist, be active and be no broader than the role's scope. */
    private Set<Permission> resolvePermissions(Set<UUID> ids, Role role) {
        List<Permission> found = permissionRepository.findAllById(ids);
        if (found.size() != ids.size()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission not found");
        }
        for (Permission permission : found) {
            if (!permission.isActive()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_INACTIVE",
                        "Permission is inactive: " + permission.getPermissionKey());
            }
            if (!ScopeRules.canGrantAt(permission.getScope(), role.getScope())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "ROLE_PERMISSION_SCOPE_MISMATCH",
                        permission.getPermissionKey() + " is " + permission.getScope() + " and cannot belong to a "
                                + role.getScope() + " role");
            }
        }
        return new LinkedHashSet<>(found);
    }

    // ---- assignments ----------------------------------------------------------------------------

    @Transactional(readOnly = true)
    public List<UserRoleResponse> listAssignments(Actor actor, UUID userId) {
        if (!userId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(userId);
        return userRoleRepository.findActiveByUser(userId).stream().map(UserRoleResponse::from).toList();
    }

    @Transactional
    public UserRoleResponse assign(Actor actor, UUID userId, AssignRoleRequest request) {
        authorizationService.require(actor, "permission.assign", null, null);
        User actorUser = findUser(actor.id());
        User target = findUser(userId);
        Role role = findRole(request.roleId());
        if (!role.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ROLE_INACTIVE", "Role is inactive");
        }
        if (!ScopeRules.canGrantAt(role.getScope(), request.scope())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ROLE_SCOPE_MISMATCH",
                    "A " + role.getScope() + " role cannot be assigned at " + request.scope() + " scope");
        }
        if (!ScopeRules.targetMatches(request.scope(), request.clubId(), request.departmentId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SCOPE_TARGET", "Scope target is invalid");
        }
        Club club = request.clubId() == null ? null : clubRepository.findById(request.clubId())
                .orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        Department department = request.departmentId() == null ? null : departmentRepository.findById(request.departmentId())
                .orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found"));
        if (userRoleRepository.existsActive(userId, role.getId(), request.scope(), request.clubId(), request.departmentId())) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLE_ALREADY_ASSIGNED", "Role is already assigned");
        }

        UserRole assignment = new UserRole();
        assignment.setUser(target);
        assignment.setRole(role);
        assignment.setScope(request.scope());
        assignment.setClub(club);
        assignment.setDepartment(department);
        assignment.setGrantedBy(actorUser);
        assignment.setGrantedAt(OffsetDateTime.now(clock));
        UserRole saved = userRoleRepository.saveAndFlush(assignment);
        audit(actorUser, saved, PermissionAuditAction.GRANT, request.reason());
        auditService.record(actorUser.getId(), AuditAction.ROLE_ASSIGNED, saved.getId(), clubOf(saved), null,
                assignmentValues(saved, request.reason()));
        return UserRoleResponse.from(saved);
    }

    @Transactional
    public void revoke(Actor actor, UUID userId, UUID assignmentId) {
        authorizationService.require(actor, "permission.revoke", null, null);
        User actorUser = findUser(actor.id());
        UserRole assignment = userRoleRepository.findByIdAndUser_Id(assignmentId, userId)
                .filter(found -> found.getRevokedAt() == null)
                .orElseThrow(() -> notFound("ROLE_ASSIGNMENT_NOT_FOUND", "Role assignment not found"));
        assignment.revoke(OffsetDateTime.now(clock), actorUser);
        userRoleRepository.saveAndFlush(assignment);
        audit(actorUser, assignment, PermissionAuditAction.REVOKE, null);
        auditService.record(actorUser.getId(), AuditAction.ROLE_REVOKED, assignment.getId(), clubOf(assignment),
                assignmentValues(assignment, null), null);
    }

    private void audit(User actor, UserRole assignment, PermissionAuditAction action, String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setActorUser(actor);
        log.setTargetUser(assignment.getUser());
        log.setRole(assignment.getRole());
        log.setAction(action);
        log.setScope(assignment.getScope());
        log.setClub(assignment.getClub());
        log.setDepartment(assignment.getDepartment());
        log.setReason(reason);
        auditLogRepository.saveAndFlush(log);
    }

    private static Map<String, Object> snapshot(Role role) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("code", role.getCode());
        values.put("name", role.getName());
        values.put("description", role.getDescription());
        values.put("scope", role.getScope());
        values.put("active", role.isActive());
        values.put("permissionKeys", role.getPermissions().stream().map(Permission::getPermissionKey).sorted().toList());
        return values;
    }

    private static Map<String, Object> assignmentValues(UserRole assignment, String reason) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", assignment.getUser().getId());
        values.put("roleCode", assignment.getRole().getCode());
        values.put("scope", assignment.getScope());
        values.put("clubId", assignment.getClub() == null ? null : assignment.getClub().getId());
        values.put("departmentId", assignment.getDepartment() == null ? null : assignment.getDepartment().getId());
        if (reason != null) values.put("reason", reason);
        return values;
    }

    private static UUID clubOf(UserRole assignment) {
        if (assignment.getClub() != null) return assignment.getClub().getId();
        return assignment.getDepartment() == null ? null : assignment.getDepartment().getClub().getId();
    }

    private Role findRole(UUID id) {
        return roleRepository.findWithPermissions(id).orElseThrow(() -> notFound("ROLE_NOT_FOUND", "Role not found"));
    }

    private User findUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
    }

    private static ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }
}
