package com.vju.club.modules.permission.service.impl;

import com.vju.club.modules.permission.mapper.PermissionMapper;
import com.vju.club.modules.permission.service.PermissionService;

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
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

@Service
public class PermissionServiceImpl implements PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PermissionAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;
    private final AuditService auditService;
    private final PermissionMapper permissionMapper;

    public PermissionServiceImpl(
            PermissionRepository permissionRepository,
            UserPermissionRepository userPermissionRepository,
            PermissionAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            ClubRepository clubRepository,
            DepartmentRepository departmentRepository,
            PermissionAuthorizationService authorizationService,
            Clock clock,
            AuditService auditService,
            PermissionMapper permissionMapper) {
        this.permissionMapper = permissionMapper;
        this.auditService = auditService;
        this.permissionRepository = permissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.departmentRepository = departmentRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public List<PermissionResponse> list(Actor actor) {
        authorizationService.require(actor, "permission.view", null, null);
        return permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc().stream()
                .map(permissionMapper::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<PermissionGroupResponse> listGroups(Actor actor) {
        authorizationService.require(actor, "permission.view", null, null);
        Map<String, List<PermissionResponse>> byModule = new TreeMap<>();
        permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc().forEach(permission ->
                byModule.computeIfAbsent(permission.getModule(), module -> new ArrayList<>())
                        .add(permissionMapper.toResponse(permission)));
        return byModule.entrySet().stream()
                .map(entry -> new PermissionGroupResponse(entry.getKey(), entry.getValue())).toList();
    }

    @Transactional(readOnly = true)
    public List<UserPermissionResponse> listUserPermissions(Actor actor, UUID targetUserId) {
        if (!targetUserId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(targetUserId);
        return userPermissionRepository.findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(targetUserId).stream()
                .map(permissionMapper::toUserPermissionResponse).toList();
    }

    /** Direct grants and role-based permissions together: what the user can actually do. */
    @Transactional(readOnly = true)
    public List<EffectivePermissionResponse> listEffective(Actor actor, UUID targetUserId) {
        if (!targetUserId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(targetUserId);
        return userPermissionRepository.findEffective(targetUserId).stream()
                .map(permissionMapper::toEffectiveResponse).toList();
    }

    @Transactional
    public UserPermissionResponse grant(
            Actor actor, UUID targetUserId, GrantPermissionRequest request) {
        authorizationService.require(actor, "permission.assign", null, null);
        User actorUser = findUser(actor.id());
        User target = findUser(targetUserId);
        Permission permission = permissionRepository.findById(request.permissionId())
                .orElseThrow(() -> notFound("PERMISSION_NOT_FOUND", "Permission not found"));
        if (!permission.isActive()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_INACTIVE", "Permission is inactive");
        }
        validateScope(permission, request);

        List<UserPermission> existing = userPermissionRepository
                .findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(
                        targetUserId, permission.getId());
        if (existing.stream().anyMatch(grant -> sameScope(grant, request))) {
            throw new ApiException(HttpStatus.CONFLICT, "PERMISSION_ALREADY_GRANTED", "Permission is already granted");
        }

        Club club = request.clubId() == null ? null : findClub(request.clubId());
        Department department = request.departmentId() == null ? null : findDepartment(request.departmentId());
        return permissionMapper.toUserPermissionResponse(
                createGrant(actorUser, target, permission, request.scope(), club, department, request.reason()));
    }

    /**
     * Makes the user's direct grants at one scope target exactly {@code permissionKeys}: missing
     * permissions are granted and extra ones revoked, each audited. Needs permission.assign, plus
     * permission.revoke when something is removed.
     */
    @Transactional
    public List<UserPermissionResponse> replace(Actor actor, UUID targetUserId, ReplacePermissionsRequest request) {
        authorizationService.require(actor, "permission.assign", null, null);
        if (!ScopeRules.targetMatches(request.scope(), request.clubId(), request.departmentId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE", "Scope target is invalid");
        }
        User actorUser = findUser(actor.id());
        User target = findUser(targetUserId);
        Club club = request.clubId() == null ? null : findClub(request.clubId());
        Department department = request.departmentId() == null ? null : findDepartment(request.departmentId());

        List<Permission> wanted = request.permissionKeys().isEmpty()
                ? List.of() : permissionRepository.findByPermissionKeyIn(request.permissionKeys());
        if (wanted.size() != request.permissionKeys().size()) {
            Set<String> missing = new TreeSet<>(request.permissionKeys());
            wanted.forEach(permission -> missing.remove(permission.getPermissionKey()));
            throw new ApiException(HttpStatus.NOT_FOUND, "PERMISSION_NOT_FOUND", "Permission not found: " + missing);
        }
        for (Permission permission : wanted) {
            if (!permission.isActive()) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_INACTIVE",
                        "Permission is inactive: " + permission.getPermissionKey());
            }
            if (!ScopeRules.canGrantAt(permission.getScope(), request.scope())) {
                throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH",
                        permission.getPermissionKey() + " cannot be granted at " + request.scope() + " scope");
            }
        }

        List<UserPermission> current = userPermissionRepository.findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(targetUserId)
                .stream().filter(grant -> sameTarget(grant, request.scope(), request.clubId(), request.departmentId()))
                .toList();
        Set<UUID> wantedIds = new HashSet<>();
        wanted.forEach(permission -> wantedIds.add(permission.getId()));
        List<UserPermission> toRevoke = current.stream()
                .filter(grant -> !wantedIds.contains(grant.getPermission().getId())).toList();
        if (!toRevoke.isEmpty()) {
            authorizationService.require(actor, "permission.revoke", null, null);
        }
        Set<UUID> held = new HashSet<>();
        current.forEach(grant -> held.add(grant.getPermission().getId()));

        toRevoke.forEach(grant -> revokeGrant(actorUser, target, grant));
        List<UserPermission> result = new ArrayList<>(current);
        result.removeAll(toRevoke);
        for (Permission permission : wanted) {
            if (!held.contains(permission.getId())) {
                result.add(createGrant(actorUser, target, permission, request.scope(), club, department, request.reason()));
            }
        }
        return result.stream()
                .sorted(Comparator.comparing(grant -> grant.getPermission().getPermissionKey()))
                .map(permissionMapper::toUserPermissionResponse).toList();
    }

    @Transactional
    public void revoke(Actor actor, UUID targetUserId, UUID permissionId,
                       PermissionScope scope, UUID clubId, UUID departmentId) {
        authorizationService.require(actor, "permission.revoke", null, null);
        User actorUser = findUser(actor.id());
        User target = findUser(targetUserId);
        Permission permission = permissionRepository.findById(permissionId)
                .orElseThrow(() -> notFound("PERMISSION_NOT_FOUND", "Permission not found"));
        List<UserPermission> grants = userPermissionRepository
                .findByUser_IdAndPermission_IdAndRevokedAtIsNullOrderByGrantedAtDesc(targetUserId, permissionId)
                .stream()
                .filter(grant -> scope == null || grant.getScope() == scope)
                .filter(grant -> clubId == null || (grant.getClub() != null && clubId.equals(grant.getClub().getId())))
                .filter(grant -> departmentId == null || (grant.getDepartment() != null && departmentId.equals(grant.getDepartment().getId())))
                .toList();
        if (grants.isEmpty()) throw notFound("PERMISSION_GRANT_NOT_FOUND", "Permission grant not found");
        if (grants.size() > 1) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "AMBIGUOUS_PERMISSION_GRANT", "Specify scope and target to revoke this permission");
        }
        revokeGrant(actorUser, target, grants.get(0));
    }

    private UserPermission createGrant(User actorUser, User target, Permission permission, PermissionScope scope,
                                       Club club, Department department, String reason) {
        UserPermission grant = new UserPermission();
        grant.setUser(target);
        grant.setPermission(permission);
        grant.setScope(scope);
        grant.setClub(club);
        grant.setDepartment(department);
        grant.setGrantedBy(actorUser);
        grant.setGrantedAt(OffsetDateTime.now(clock));
        UserPermission saved = userPermissionRepository.saveAndFlush(grant);
        audit(actorUser, target, permission, PermissionAuditAction.GRANT, scope, club, department, reason);
        auditService.record(actorUser.getId(), AuditAction.PERMISSION_GRANTED, saved.getId(), clubOf(club, department),
                null, grantValues(saved, reason));
        return saved;
    }

    private void revokeGrant(User actorUser, User target, UserPermission grant) {
        grant.revoke(OffsetDateTime.now(clock), actorUser);
        userPermissionRepository.saveAndFlush(grant);
        audit(actorUser, target, grant.getPermission(), PermissionAuditAction.REVOKE, grant.getScope(),
                grant.getClub(), grant.getDepartment(), null);
        auditService.record(actorUser.getId(), AuditAction.PERMISSION_REVOKED, grant.getId(),
                clubOf(grant.getClub(), grant.getDepartment()), grantValues(grant, null), null);
    }

    private static Map<String, Object> grantValues(UserPermission grant, String reason) {
        Map<String, Object> values = new LinkedHashMap<>();
        values.put("userId", grant.getUser().getId());
        values.put("permissionKey", grant.getPermission().getPermissionKey());
        values.put("scope", grant.getScope());
        values.put("clubId", grant.getClub() == null ? null : grant.getClub().getId());
        values.put("departmentId", grant.getDepartment() == null ? null : grant.getDepartment().getId());
        if (reason != null) values.put("reason", reason);
        return values;
    }

    /** The club an action belongs to: the club itself, or the department's club. */
    private static UUID clubOf(Club club, Department department) {
        if (club != null) return club.getId();
        return department == null ? null : department.getClub().getId();
    }

    private static boolean sameTarget(UserPermission grant, PermissionScope scope, UUID clubId, UUID departmentId) {
        return grant.getScope() == scope
                && Objects.equals(grant.getClub() == null ? null : grant.getClub().getId(), clubId)
                && Objects.equals(grant.getDepartment() == null ? null : grant.getDepartment().getId(), departmentId);
    }

    /**
     * A permission may be granted at its own scope or any broader one (DEPARTMENT < CLUB < GLOBAL),
     * so a club-level grant of a department permission covers every department of that club.
     */
    private void validateScope(Permission permission, GrantPermissionRequest request) {
        if (!ScopeRules.canGrantAt(permission.getScope(), request.scope())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH", "Grant scope does not match permission scope");
        }
        if (!ScopeRules.targetMatches(request.scope(), request.clubId(), request.departmentId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE", "Scope target is invalid");
        }
    }

    private boolean sameScope(UserPermission grant, GrantPermissionRequest request) {
        UUID clubId = grant.getClub() == null ? null : grant.getClub().getId();
        UUID departmentId = grant.getDepartment() == null ? null : grant.getDepartment().getId();
        return grant.getScope() == request.scope()
                && Objects.equals(clubId, request.clubId())
                && Objects.equals(departmentId, request.departmentId());
    }

    private void audit(User actor, User target, Permission permission, PermissionAuditAction action,
                       PermissionScope scope, Club club, Department department, String reason) {
        PermissionAuditLog log = new PermissionAuditLog();
        log.setActorUser(actor);
        log.setTargetUser(target);
        log.setPermission(permission);
        log.setAction(action);
        log.setScope(scope);
        log.setClub(club);
        log.setDepartment(department);
        log.setReason(reason);
        auditLogRepository.saveAndFlush(log);
    }

    private User findUser(UUID id) {
        return userRepository.findById(id).orElseThrow(() -> notFound("USER_NOT_FOUND", "User not found"));
    }

    private Club findClub(UUID id) {
        return clubRepository.findById(id).orElseThrow(() -> notFound("CLUB_NOT_FOUND", "Club not found"));
    }

    private Department findDepartment(UUID id) {
        return departmentRepository.findById(id).orElseThrow(() -> notFound("DEPARTMENT_NOT_FOUND", "Department not found"));
    }

    private ApiException notFound(String code, String message) {
        return new ApiException(HttpStatus.NOT_FOUND, code, message);
    }
}
