package com.vju.club.departmentmember;

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
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.UUID;

@Service
public class DepartmentMemberServiceImpl implements DepartmentMemberService {
    private final DepartmentMemberRepository departmentMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;
    private final Clock clock;

    public DepartmentMemberServiceImpl(DepartmentMemberRepository departmentMemberRepository,
                                       DepartmentRepository departmentRepository,
                                       MembershipRepository membershipRepository,
                                       PermissionAuthorizationService authorizationService,
                                       Clock clock) {
        this.departmentMemberRepository = departmentMemberRepository;
        this.departmentRepository = departmentRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
        this.clock = clock;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DepartmentMemberResponse> list(Authentication authentication, UUID departmentId, int offset, int limit) {
        authorize(authentication, "department.member.view", departmentId);
        var items = departmentMemberRepository
                .findPageByDepartment(departmentId, new OffsetLimitRequest(offset, limit)).stream()
                .map(DepartmentMemberResponse::from).toList();
        return new PageResponse<>(items, departmentMemberRepository.countByDepartment_Id(departmentId), offset, limit);
    }

    @Override
    @Transactional
    public DepartmentMemberResponse add(Authentication authentication, UUID departmentId, AddDepartmentMemberRequest request) {
        Department department = authorize(authentication, "department.member.add", departmentId);
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
        member.setJoinedAt(OffsetDateTime.now(clock));
        return DepartmentMemberResponse.from(departmentMemberRepository.saveAndFlush(member));
    }

    @Override
    @Transactional
    public void remove(Authentication authentication, UUID departmentId, UUID membershipId) {
        authorize(authentication, "department.member.remove", departmentId);
        departmentMemberRepository.delete(findAssignment(departmentId, membershipId));
    }

    @Override
    @Transactional
    public DepartmentMemberResponse move(Authentication authentication, UUID departmentId, UUID membershipId,
                                         MoveDepartmentMemberRequest request) {
        Department source = authorize(authentication, "department.member.remove", departmentId);
        Department target = authorize(authentication, "department.member.add", request.targetDepartmentId());
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
        return DepartmentMemberResponse.from(departmentMemberRepository.saveAndFlush(assignment));
    }

    /** Loads the department and checks the permission at department scope or at its club's scope. */
    private Department authorize(Authentication authentication, String permissionKey, UUID departmentId) {
        Department department = departmentRepository.findById(departmentId).orElseThrow(() ->
                authorizationService.missingResource(authentication, permissionKey,
                        new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found")));
        authorizationService.require(authentication, permissionKey, department.getClub().getId(), department.getId());
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
