package com.vju.club.departmentmember;

import com.vju.club.security.Actor;
import com.vju.club.audit.AuditAction;
import com.vju.club.audit.AuditService;
import com.vju.club.common.OffsetLimitRequest;
import com.vju.club.common.dto.PageResponse;
import com.vju.club.departmentmember.dto.AddDepartmentMemberRequest;
import com.vju.club.departmentmember.dto.DepartmentMemberResponse;
import com.vju.club.departmentmember.dto.MoveDepartmentMemberRequest;
import com.vju.club.entity.Department;
import com.vju.club.entity.DepartmentMember;
import com.vju.club.entity.DepartmentStatus;
import com.vju.club.entity.Membership;
import com.vju.club.entity.MembershipStatus;
import com.vju.club.error.ApiException;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.Map;
import java.util.UUID;

@Service
public class DepartmentMemberService {
    private final DepartmentMemberRepository departmentMemberRepository;
    private final AuditService auditService;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    public DepartmentMemberService(DepartmentMemberRepository departmentMemberRepository,
                                       DepartmentRepository departmentRepository,
                                       MembershipRepository membershipRepository,
                                       PermissionAuthorizationService authorizationService,
                                       Clock clock,
                                       AuditService auditService) {
        this.auditService = auditService;
        this.departmentMemberRepository = departmentMemberRepository;
        this.departmentRepository = departmentRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    @Transactional(readOnly = true)
    public PageResponse<DepartmentMemberResponse> list(Actor actor, UUID departmentId, int offset, int limit) {
        authorize(actor, "department.member.view", departmentId);
        var items = departmentMemberRepository
                .findPageByDepartment(departmentId, new OffsetLimitRequest(offset, limit)).stream()
                .map(DepartmentMemberResponse::from).toList();
        return new PageResponse<>(items, departmentMemberRepository.countByDepartment_Id(departmentId), offset, limit);
    }

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
        return DepartmentMemberResponse.from(saved);
    }

    @Transactional
    public void remove(Actor actor, UUID departmentId, UUID membershipId) {
        authorize(actor, "department.member.remove", departmentId);
        DepartmentMember assignment = findAssignment(departmentId, membershipId);
        departmentMemberRepository.delete(assignment);
        auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_REMOVED, assignment.getId(), assignment.getClubId(),
                Map.of("departmentId", departmentId, "membershipId", membershipId), null);
    }

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
        if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(target.getId(), membershipId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBER_ALREADY_EXISTS", "Department member already exists");
        }
        // Re-point the existing row: a single UPDATE, so the member is never in zero or two departments.
        assignment.setDepartment(target);
        assignment.setJoinedAt(OffsetDateTime.now(clock));
        DepartmentMember saved = departmentMemberRepository.saveAndFlush(assignment);
        auditService.record(actor.id(), AuditAction.DEPARTMENT_MEMBER_MOVED, saved.getId(), saved.getClubId(),
                Map.of("departmentId", departmentId), Map.of("departmentId", target.getId()));
        return DepartmentMemberResponse.from(saved);
    }

    /** Loads the department and checks the permission at department scope or at its club's scope. */
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
