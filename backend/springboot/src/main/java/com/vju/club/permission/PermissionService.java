package com.vju.club.permission;

import com.vju.club.security.Actor;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Permission;
import com.vju.club.entity.PermissionAuditAction;
import com.vju.club.entity.PermissionAuditLog;
import com.vju.club.entity.PermissionScope;
import com.vju.club.entity.User;
import com.vju.club.entity.UserPermission;
import com.vju.club.error.ApiException;
import com.vju.club.permission.dto.EffectivePermissionResponse;
import com.vju.club.permission.dto.GrantPermissionRequest;
import com.vju.club.permission.dto.PermissionResponse;
import com.vju.club.permission.dto.UserPermissionResponse;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.PermissionAuditLogRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.security.ScopeRules;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.Clock;
import java.util.List;
import java.util.Objects;
import java.util.UUID;

@Service
public class PermissionService {

    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PermissionAuditLogRepository auditLogRepository;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    public PermissionService(
            PermissionRepository permissionRepository,
            UserPermissionRepository userPermissionRepository,
            PermissionAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            ClubRepository clubRepository,
            DepartmentRepository departmentRepository,
            PermissionAuthorizationService authorizationService,
            Clock clock) {
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
                .map(PermissionResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<UserPermissionResponse> listUserPermissions(Actor actor, UUID targetUserId) {
        if (!targetUserId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(targetUserId);
        return userPermissionRepository.findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(targetUserId).stream()
                .map(UserPermissionResponse::from).toList();
    }

    /** Direct grants and role-based permissions together: what the user can actually do. */
    @Transactional(readOnly = true)
    public List<EffectivePermissionResponse> listEffective(Actor actor, UUID targetUserId) {
        if (!targetUserId.equals(actor.id())) {
            authorizationService.require(actor, "permission.view", null, null);
        }
        findUser(targetUserId);
        return userPermissionRepository.findEffective(targetUserId).stream()
                .map(EffectivePermissionResponse::from).toList();
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

        UserPermission grant = new UserPermission();
        grant.setUser(target);
        grant.setPermission(permission);
        grant.setScope(request.scope());
        if (request.clubId() != null) grant.setClub(findClub(request.clubId()));
        if (request.departmentId() != null) grant.setDepartment(findDepartment(request.departmentId()));
        grant.setGrantedBy(actorUser);
        grant.setGrantedAt(OffsetDateTime.now(clock));
        UserPermission saved = userPermissionRepository.saveAndFlush(grant);
        audit(actorUser, target, permission, PermissionAuditAction.GRANT, request.scope(),
                grant.getClub(), grant.getDepartment(), request.reason());
        return UserPermissionResponse.from(saved);
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
        UserPermission grant = grants.get(0);
        OffsetDateTime now = OffsetDateTime.now(clock);
        grant.revoke(now, actorUser);
        userPermissionRepository.saveAndFlush(grant);
        audit(actorUser, target, permission, PermissionAuditAction.REVOKE, grant.getScope(),
                grant.getClub(), grant.getDepartment(), null);
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
