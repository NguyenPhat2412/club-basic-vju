package com.vju.club.modules.role.service.impl;

import com.vju.club.error.ApiException;
import com.vju.club.modules.audit.entity.PermissionAuditLog;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.audit.enums.PermissionAuditAction;
import com.vju.club.modules.audit.repository.PermissionAuditLogRepository;
import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.permission.annotation.RequirePermission;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.role.dto.request.AssignClubPositionRequest;
import com.vju.club.modules.role.dto.request.AssignRoleRequest;
import com.vju.club.modules.role.dto.request.CreateRoleRequest;
import com.vju.club.modules.role.dto.request.UpdateRoleRequest;
import com.vju.club.modules.role.dto.response.ClubPositionHolderResponse;
import com.vju.club.modules.role.dto.response.ClubPositionSlotResponse;
import com.vju.club.modules.role.dto.response.ClubStructureResponse;
import com.vju.club.modules.role.dto.response.RoleResponse;
import com.vju.club.modules.role.dto.response.UserRoleResponse;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.role.entity.UserRole;
import com.vju.club.modules.role.mapper.RoleMapper;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import com.vju.club.modules.role.service.RoleService;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.GrantGuard;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.ScopeRules;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Set;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoleServiceImpl implements RoleService {
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;
    private final PermissionAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;
    private final AuditService auditService;
    private final RoleMapper roleMapper;
    private final GrantGuard grantGuard;

    @Override
    @Transactional(readOnly = true)
    @RequirePermission("role.view")
    public List<RoleResponse> list(Actor actor) {
        return roleRepository.findAllWithPermissions().stream().map(roleMapper::toResponse).toList();
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission("role.view")
    public RoleResponse get(Actor actor, UUID roleId) {
        return roleMapper.toResponse(findRole(roleId));
    }

    @Override
    @Transactional
    @RequirePermission("role.manage")
    public RoleResponse create(Actor actor, CreateRoleRequest request) {
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
        grantGuard.requireCanGrant(actor, role.getPermissions(), PermissionScope.GLOBAL, null, null);
        Role saved = roleRepository.saveAndFlush(role);
        auditService.record(actor.id(), AuditAction.ROLE_CREATED, saved.getId(), null, null, snapshot(saved));
        return roleMapper.toResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission("role.manage")
    public RoleResponse update(Actor actor, UUID roleId, UpdateRoleRequest request) {
        Role role = findRole(roleId);
        if (GrantGuard.SYSTEM_ADMIN.equals(role.getCode())
                || (role.isSystem() && (request.name() != null || request.active() != null))) {
            throw new ApiException(HttpStatus.CONFLICT, "SYSTEM_ROLE_IMMUTABLE",
                    "The system administrator role is locked; other system roles only allow permission and description changes");
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
        if (request.permissionIds() != null) {
            Set<Permission> permissions = resolvePermissions(request.permissionIds(), role);
            Set<Permission> added = new LinkedHashSet<>(permissions);
            added.removeAll(role.getPermissions());
            grantGuard.requireCanGrant(actor, added, PermissionScope.GLOBAL, null, null);
            role.setPermissions(permissions);
        }
        Role saved = roleRepository.saveAndFlush(role);
        auditService.recordChange(actor.id(), AuditAction.ROLE_UPDATED, roleId, null, before, snapshot(saved));
        return roleMapper.toResponse(saved);
    }

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

    @Override
    @Transactional(readOnly = true)
    public List<UserRoleResponse> listAssignments(Actor actor, UUID userId) {
        if (!userId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(userId);
        return userRoleRepository.findActiveByUser(userId).stream().map(roleMapper::toUserRoleResponse).toList();
    }

    @Override
    @Transactional
    @RequirePermission("permission.assign")
    public UserRoleResponse assign(Actor actor, UUID userId, AssignRoleRequest request) {
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
        grantGuard.requireCanGrantRole(actor, role, request.scope(), request.clubId(), department);
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
        return roleMapper.toUserRoleResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission("permission.revoke")
    public void revoke(Actor actor, UUID userId, UUID assignmentId) {
        User actorUser = findUser(actor.id());
        UserRole assignment = userRoleRepository.findByIdAndUser_Id(assignmentId, userId)
                .filter(found -> found.getRevokedAt() == null)
                .orElseThrow(() -> notFound("ROLE_ASSIGNMENT_NOT_FOUND", "Role assignment not found"));
        if (GrantGuard.SYSTEM_ADMIN.equals(assignment.getRole().getCode())) {
            if (userId.equals(actor.id())) {
                throw new ApiException(HttpStatus.CONFLICT, "CANNOT_REVOKE_OWN_ADMIN",
                        "You cannot remove your own system administrator role");
            }
            grantGuard.requireNotLastSystemAdmin(userId);
        }
        grantGuard.requireCanGrantRole(actor, assignment.getRole(), assignment.getScope(),
                assignment.getClub() == null ? null : assignment.getClub().getId(), assignment.getDepartment());
        assignment.revoke(OffsetDateTime.now(clock), actorUser);
        userRoleRepository.saveAndFlush(assignment);
        audit(actorUser, assignment, PermissionAuditAction.REVOKE, null);
        auditService.record(actorUser.getId(), AuditAction.ROLE_REVOKED, assignment.getId(), clubOf(assignment),
                assignmentValues(assignment, null), null);
    }

    @Override
    @Transactional(readOnly = true)
    @RequirePermission(value = "department.view", clubId = "clubId")
    public ClubStructureResponse getClubStructure(Actor actor, UUID clubId) {
        if (!clubRepository.existsById(clubId)) {
            throw notFound("CLUB_NOT_FOUND", "Club not found");
        }
        List<Role> positions = roleRepository.findActiveLeadershipPositions();
        List<Department> departments = departmentRepository.findByClub_IdOrderByNameAscIdAsc(clubId);
        List<UserRole> activeAssignments = userRoleRepository.findActiveLeadershipInClub(clubId);

        List<ClubPositionSlotResponse> clubPositions = new ArrayList<>();
        for (Role role : positions) {
            if (role.getScope() != PermissionScope.CLUB) continue;
            List<ClubPositionHolderResponse> holders = activeAssignments.stream()
                    .filter(ur -> ur.getScope() == PermissionScope.CLUB && ur.getRole().getId().equals(role.getId()))
                    .map(this::toHolderResponse)
                    .toList();
            clubPositions.add(new ClubPositionSlotResponse(
                    role.getId(),
                    role.getCode(),
                    role.getName(),
                    role.getScope().name(),
                    null,
                    null,
                    null,
                    role.getMaxHolders(),
                    holders
            ));
        }

        List<ClubPositionSlotResponse> departmentPositions = new ArrayList<>();
        for (Department department : departments) {
            for (Role role : positions) {
                if (role.getScope() != PermissionScope.DEPARTMENT) continue;
                List<ClubPositionHolderResponse> holders = activeAssignments.stream()
                        .filter(ur -> ur.getScope() == PermissionScope.DEPARTMENT
                                && ur.getDepartment() != null
                                && ur.getDepartment().getId().equals(department.getId())
                                && ur.getRole().getId().equals(role.getId()))
                        .map(this::toHolderResponse)
                        .toList();
                departmentPositions.add(new ClubPositionSlotResponse(
                        role.getId(),
                        role.getCode(),
                        role.getName(),
                        role.getScope().name(),
                        department.getId(),
                        department.getName(),
                        department.getStatus().name(),
                        role.getMaxHolders(),
                        holders
                ));
            }
        }

        return new ClubStructureResponse(clubId, clubPositions, departmentPositions);
    }

    @Override
    @Transactional
    @RequirePermission(value = "permission.assign", clubId = "clubId")
    public UserRoleResponse assignClubPosition(Actor actor, UUID clubId, AssignClubPositionRequest request) {
        User actorUser = findUser(actor.id());
        Club club = clubRepository.findById(clubId).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
        if (club.getStatus() != ClubStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "CLUB_INACTIVE", "Club is inactive");
        }
        User target = findUser(request.userId());
        if (target.getStatus() != UserStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "USER_INACTIVE", "Target user is not active");
        }
        Role role = findRole(request.roleId());
        if (!role.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "ROLE_INACTIVE", "Role is inactive");
        }
        if (role.getMaxHolders() == null || role.getMaxHolders() <= 0) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "NOT_ORGANIZATIONAL_POSITION",
                    "Selected role is not an organizational leadership position");
        }
        if (!membershipRepository.existsByUser_IdAndClub_IdAndStatus(target.getId(), clubId, MembershipStatus.ACTIVE)) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_REQUIRED_FOR_POSITION",
                    "Target user must be an active member of the club before holding an organizational position");
        }

        PermissionScope targetScope;
        Department department = null;
        if (role.getScope() == PermissionScope.CLUB) {
            if (request.departmentId() != null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SCOPE_TARGET",
                        "Club-level position cannot target a specific department");
            }
            targetScope = PermissionScope.CLUB;
        } else if (role.getScope() == PermissionScope.DEPARTMENT) {
            if (request.departmentId() == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SCOPE_TARGET",
                        "Department-level position requires departmentId");
            }
            department = departmentRepository.findById(request.departmentId())
                    .orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found"));
            if (!department.getClub().getId().equals(clubId)) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "DEPARTMENT_CLUB_MISMATCH",
                        "Department does not belong to the specified club");
            }
            if (department.getStatus() != DepartmentStatus.ACTIVE) {
                throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_INACTIVE", "Department is inactive");
            }
            if (!departmentMemberRepository.isUserInDepartment(department.getId(), target.getId())) {
                throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBERSHIP_REQUIRED",
                        "Target user must be an active member of the department before holding a department position");
            }
            targetScope = PermissionScope.DEPARTMENT;
        } else {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_SCOPE_TARGET", "Unsupported position scope");
        }

        UUID targetClubId = targetScope == PermissionScope.CLUB ? clubId : null;
        UUID targetDeptId = department == null ? null : department.getId();
        grantGuard.requireCanGrantRole(actor, role, targetScope, targetClubId, department);

        if (userRoleRepository.existsActive(target.getId(), role.getId(), targetScope, targetClubId, targetDeptId)) {
            throw new ApiException(HttpStatus.CONFLICT, "ROLE_ALREADY_ASSIGNED",
                    "User already holds this organizational position");
        }

        List<UserRole> activeHolders = userRoleRepository.findActiveHoldersForTarget(
                role.getId(), targetScope, targetClubId, targetDeptId);
        boolean replaceHolder = request.replaceHolder() == null || request.replaceHolder();
        if (activeHolders.size() >= role.getMaxHolders()) {
            if (!replaceHolder) {
                throw new ApiException(HttpStatus.CONFLICT, "POSITION_LIMIT_REACHED",
                        "Position holder limit (" + role.getMaxHolders() + ") reached");
            }
            int toRevoke = activeHolders.size() - role.getMaxHolders() + 1;
            OffsetDateTime now = OffsetDateTime.now(clock);
            for (int i = 0; i < toRevoke; i++) {
                UserRole incumbent = activeHolders.get(i);
                incumbent.revoke(now, actorUser);
                userRoleRepository.saveAndFlush(incumbent);
                String revokeReason = "Replaced by " + target.getEmail()
                        + (request.reason() != null && !request.reason().isBlank() ? ": " + request.reason() : "");
                audit(actorUser, incumbent, PermissionAuditAction.REVOKE, revokeReason);
                auditService.record(actorUser.getId(), AuditAction.ROLE_REVOKED, incumbent.getId(), clubId,
                        assignmentValues(incumbent, revokeReason), null);
            }
        }

        UserRole assignment = new UserRole();
        assignment.setUser(target);
        assignment.setRole(role);
        assignment.setScope(targetScope);
        assignment.setClub(targetScope == PermissionScope.CLUB ? club : null);
        assignment.setDepartment(department);
        assignment.setGrantedBy(actorUser);
        assignment.setGrantedAt(OffsetDateTime.now(clock));
        UserRole saved = userRoleRepository.saveAndFlush(assignment);
        audit(actorUser, saved, PermissionAuditAction.GRANT, request.reason());
        auditService.record(actorUser.getId(), AuditAction.ROLE_ASSIGNED, saved.getId(), clubId, null,
                assignmentValues(saved, request.reason()));
        return roleMapper.toUserRoleResponse(saved);
    }

    @Override
    @Transactional
    @RequirePermission(value = "permission.revoke", clubId = "clubId")
    public void revokeClubPosition(Actor actor, UUID clubId, UUID assignmentId) {
        if (!clubRepository.existsById(clubId)) {
            throw notFound("CLUB_NOT_FOUND", "Club not found");
        }
        User actorUser = findUser(actor.id());
        UserRole assignment = userRoleRepository.findActiveInClub(assignmentId, clubId)
                .orElseThrow(() -> notFound("ROLE_ASSIGNMENT_NOT_FOUND", "Position assignment not found in this club"));
        grantGuard.requireCanGrantRole(actor, assignment.getRole(), assignment.getScope(),
                assignment.getClub() == null ? null : assignment.getClub().getId(), assignment.getDepartment());
        assignment.revoke(OffsetDateTime.now(clock), actorUser);
        userRoleRepository.saveAndFlush(assignment);
        audit(actorUser, assignment, PermissionAuditAction.REVOKE, null);
        auditService.record(actorUser.getId(), AuditAction.ROLE_REVOKED, assignment.getId(), clubId,
                assignmentValues(assignment, null), null);
    }

    private ClubPositionHolderResponse toHolderResponse(UserRole ur) {
        User u = ur.getUser();
        return new ClubPositionHolderResponse(
                ur.getId(),
                u.getId(),
                u.getFullName(),
                u.getEmail(),
                u.getStudentCode(),
                u.getAvatarUrl(),
                ur.getGrantedAt()
        );
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
