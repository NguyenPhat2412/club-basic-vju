package com.vju.club.permission;

import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.Permission;
import com.vju.club.entity.PermissionAuditAction;
import com.vju.club.entity.PermissionAuditLog;
import com.vju.club.entity.PermissionScope;
import com.vju.club.entity.User;
import com.vju.club.entity.UserPermission;
import com.vju.club.error.ApiException;
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
import com.vju.club.security.SecurityIdentity;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.List;
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

    public PermissionServiceImpl(
            PermissionRepository permissionRepository,
            UserPermissionRepository userPermissionRepository,
            PermissionAuditLogRepository auditLogRepository,
            UserRepository userRepository,
            ClubRepository clubRepository,
            DepartmentRepository departmentRepository,
            PermissionAuthorizationService authorizationService) {
        this.permissionRepository = permissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.auditLogRepository = auditLogRepository;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.departmentRepository = departmentRepository;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public List<PermissionResponse> list() {
        return permissionRepository.findAllByActiveTrueOrderByModuleAscActionAsc().stream()
                .map(PermissionResponse::from)
                .toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<UserPermissionResponse> listUserPermissions(Authentication authentication, UUID targetUserId) {
        if (!targetUserId.equals(SecurityIdentity.userId(authentication))) {
            authorizationService.require(authentication, "permission.view", null, null);
        }
        findUser(targetUserId);
        return userPermissionRepository.findByUser_IdAndRevokedAtIsNullOrderByGrantedAtDesc(targetUserId).stream()
                .map(UserPermissionResponse::from).toList();
    }

    @Override
    @Transactional
    public UserPermissionResponse grant(
            Authentication authentication, UUID targetUserId, GrantPermissionRequest request) {
        authorizationService.require(authentication, "permission.assign", null, null);
        User actor = findUser(SecurityIdentity.userId(authentication));
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
        grant.setGrantedBy(actor);
        grant.setGrantedAt(OffsetDateTime.now(ZoneOffset.UTC));
        userPermissionRepository.save(grant);
        userPermissionRepository.flush();
        UserPermission saved = grant;
        audit(actor, target, permission, PermissionAuditAction.GRANT, request.scope(),
                grant.getClub(), grant.getDepartment(), request.reason());
        return UserPermissionResponse.from(saved);
    }

    @Override
    @Transactional
    public void revoke(Authentication authentication, UUID targetUserId, UUID permissionId,
                       PermissionScope scope, UUID clubId, UUID departmentId) {
        authorizationService.require(authentication, "permission.revoke", null, null);
        User actor = findUser(SecurityIdentity.userId(authentication));
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
        OffsetDateTime now = OffsetDateTime.now(ZoneOffset.UTC);
        grant.revoke(now);
        userPermissionRepository.save(grant);
        userPermissionRepository.flush();
        audit(actor, target, permission, PermissionAuditAction.REVOKE, grant.getScope(),
                grant.getClub(), grant.getDepartment(), null);
    }

    private void validateScope(Permission permission, GrantPermissionRequest request) {
        if (request.scope() != PermissionScope.GLOBAL && permission.getScope() != request.scope()) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "PERMISSION_SCOPE_MISMATCH", "Grant scope does not match permission scope");
        }
        boolean valid = switch (request.scope()) {
            case GLOBAL -> request.clubId() == null && request.departmentId() == null;
            case CLUB -> request.clubId() != null && request.departmentId() == null;
            case DEPARTMENT -> request.clubId() == null && request.departmentId() != null;
        };
        if (!valid) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "INVALID_PERMISSION_SCOPE", "Scope target is invalid");
        }
    }

    private boolean sameScope(UserPermission grant, GrantPermissionRequest request) {
        UUID clubId = grant.getClub() == null ? null : grant.getClub().getId();
        UUID departmentId = grant.getDepartment() == null ? null : grant.getDepartment().getId();
        return grant.getScope() == request.scope()
                && java.util.Objects.equals(clubId, request.clubId())
                && java.util.Objects.equals(departmentId, request.departmentId());
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
        auditLogRepository.save(log);
        auditLogRepository.flush();
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
