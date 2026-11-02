package com.vju.club.service.impl;

import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.dto.response.PageResponse;
import com.vju.club.error.ApiException;
import com.vju.club.enums.AuditAction;
import com.vju.club.service.AuditService;
import com.vju.club.entity.Department;
import com.vju.club.enums.DepartmentStatus;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.dto.request.AddDepartmentMemberRequest;
import com.vju.club.dto.request.MoveDepartmentMemberRequest;
import com.vju.club.dto.response.DepartmentMemberResponse;
import com.vju.club.entity.DepartmentMember;
import com.vju.club.mapper.DepartmentMemberMapper;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.service.DepartmentMemberService;
import com.vju.club.entity.Membership;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepartmentMemberServiceImpl implements DepartmentMemberService {
    private final DepartmentMemberRepository departmentMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;
    private final AuditService auditService;
    private final DepartmentMemberMapper departmentMemberMapper;
    private final UserRoleRepository userRoleRepository;
    private final UserPermissionRepository userPermissionRepository;

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DepartmentMemberResponse> list(Actor actor, UUID departmentId, int offset, int limit) {
        authorize(actor, "department.member.view", departmentId);
        var items = departmentMemberRepository
                .findPageByDepartment(departmentId, new OffsetLimitRequest(offset, limit)).stream()
                .map(departmentMemberMapper::toResponse).toList();
        return new PageResponse<>(items, departmentMemberRepository.countByDepartment_Id(departmentId), offset, limit);
    }

    @Override
    @Transactional
    public DepartmentMemberResponse add(Actor actor, UUID departmentId, AddDepartmentMemberRequest request) {
        Department department = authorize(actor, "department.member.add", departmentId);
        requireActive(department);
        Membership membership = findMembership(request.membershipId());
        if (membership.getStatus() != MembershipStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_NOT_ACTIVE", "Only active memberships can be assigned");
        }
        validateSameClub(department, membership);
        if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(departmentId, request.membershipId()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBER_ALREADY_EXISTS", "Department member already exists");
        }
        DepartmentMember member = new DepartmentMember();
        member.setDepartment(department);
        member.setMembership(membership);
        member.setClubId(department.getClub().getId());
        member.setJoinedAt(OffsetDateTime.now(clock));
        DepartmentMember saved = departmentMemberRepository.saveAndFlush(member);
        auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_ADDED, saved.getId(), saved.getClubId(), null,
                Map.of("departmentId", departmentId, "membershipId", membership.getId()));
        return departmentMemberMapper.toResponse(saved);
    }

    @Override
    @Transactional
    public void remove(Actor actor, UUID departmentId, UUID membershipId) {
        authorize(actor, "department.member.remove", departmentId);
        DepartmentMember assignment = findAssignment(departmentId, membershipId);
        OffsetDateTime now = OffsetDateTime.now(clock);
        UUID targetUserId = assignment.getMembership() != null && assignment.getMembership().getUser() != null
                ? assignment.getMembership().getUser().getId()
                : null;
        int revokedRoles = targetUserId != null && userRoleRepository != null
                ? userRoleRepository.revokeAllInDepartment(targetUserId, departmentId, actor.id(), now)
                : 0;
        int revokedPermissions = targetUserId != null && userPermissionRepository != null
                ? userPermissionRepository.revokeAllInDepartment(targetUserId, departmentId, actor.id(), now)
                : 0;
        departmentMemberRepository.delete(assignment);
        departmentMemberRepository.flush();
        auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_REMOVED, assignment.getId(), assignment.getClubId(),
                Map.of("departmentId", departmentId, "membershipId", membershipId),
                Map.of("revokedRoles", revokedRoles, "revokedPermissions", revokedPermissions));
    }

    @Override
    @Transactional
    public DepartmentMemberResponse move(Actor actor, UUID departmentId, UUID membershipId,
                                         MoveDepartmentMemberRequest request) {
        Department source = authorize(actor, "department.member.remove", departmentId);
        Department target = authorize(actor, "department.member.add", request.targetDepartmentId());
        if (source.getId().equals(target.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_DEPARTMENT", "Target department must differ");
        }
        validateSameClub(source, target);
        requireActive(target);
        DepartmentMember assignment = findAssignment(departmentId, membershipId);
        if (assignment.getMembership() != null && assignment.getMembership().getStatus() != MembershipStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_NOT_ACTIVE",
                    "Only active memberships can be moved between departments");
        }
        if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(target.getId(), membershipId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBER_ALREADY_EXISTS", "Department member already exists");
        }
        OffsetDateTime now = OffsetDateTime.now(clock);
        UUID targetUserId = assignment.getMembership() != null && assignment.getMembership().getUser() != null
                ? assignment.getMembership().getUser().getId()
                : null;
        int revokedRoles = targetUserId != null && userRoleRepository != null
                ? userRoleRepository.revokeAllInDepartment(targetUserId, departmentId, actor.id(), now)
                : 0;
        int revokedPermissions = targetUserId != null && userPermissionRepository != null
                ? userPermissionRepository.revokeAllInDepartment(targetUserId, departmentId, actor.id(), now)
                : 0;

        assignment.setDepartment(target);
        assignment.setJoinedAt(now);
        DepartmentMember saved = departmentMemberRepository.saveAndFlush(assignment);
        Map<String, Object> after = new LinkedHashMap<>();
        after.put("departmentId", target.getId());
        after.put("membershipId", membershipId);
        after.put("revokedRoles", revokedRoles);
        after.put("revokedPermissions", revokedPermissions);
        auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_MOVED, saved.getId(), saved.getClubId(),
                Map.of("departmentId", departmentId, "membershipId", membershipId), after);
        return departmentMemberMapper.toResponse(saved);
    }

    private Department authorize(Actor actor, String permissionKey, UUID departmentId) {
        Department department = departmentRepository.findById(departmentId).orElseThrow(() ->
                authorizationService.missingResource(actor, permissionKey,
                        new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found")));
        authorizationService.require(actor, permissionKey, department.getClub().getId(), department.getId());
        return department;
    }

    private void requireActive(Department department) {
        if (department.getStatus() != DepartmentStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_INACTIVE", "Department is inactive");
        }
    }

    private DepartmentMember findAssignment(UUID departmentId, UUID membershipId) {
        return departmentMemberRepository.findByDepartment_IdAndMembership_Id(departmentId, membershipId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_MEMBER_NOT_FOUND", "Department member not found"));
    }

    private Membership findMembership(UUID id) {
        return membershipRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "MEMBERSHIP_NOT_FOUND", "Membership not found"));
    }

    private void validateSameClub(Department department, Membership membership) {
        if (!department.getClub().getId().equals(membership.getClub().getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CROSS_CLUB_ASSIGNMENT", "Membership and department belong to different clubs");
        }
    }

    private void validateSameClub(Department source, Department target) {
        if (!source.getClub().getId().equals(target.getClub().getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "CROSS_CLUB_MOVE", "Departments belong to different clubs");
        }
    }
}
