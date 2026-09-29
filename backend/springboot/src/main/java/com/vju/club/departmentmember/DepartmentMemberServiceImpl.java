package com.vju.club.departmentmember;

import com.vju.club.common.dto.PageResponse;
import com.vju.club.departmentmember.dto.AddDepartmentMemberRequest;
import com.vju.club.departmentmember.dto.DepartmentMemberResponse;
import com.vju.club.departmentmember.dto.MoveDepartmentMemberRequest;
import com.vju.club.entity.Department;
import com.vju.club.entity.DepartmentMember;
import com.vju.club.entity.Membership;
import com.vju.club.error.ApiException;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.security.PermissionAuthorizationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.UUID;

@Service
public class DepartmentMemberServiceImpl implements DepartmentMemberService {
    private final DepartmentMemberRepository departmentMemberRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final PermissionAuthorizationService authorizationService;

    public DepartmentMemberServiceImpl(DepartmentMemberRepository departmentMemberRepository,
                                       DepartmentRepository departmentRepository,
                                       MembershipRepository membershipRepository,
                                       PermissionAuthorizationService authorizationService) {
        this.departmentMemberRepository = departmentMemberRepository;
        this.departmentRepository = departmentRepository;
        this.membershipRepository = membershipRepository;
        this.authorizationService = authorizationService;
    }

    @Override
    @Transactional(readOnly = true)
    public PageResponse<DepartmentMemberResponse> list(Authentication authentication, UUID departmentId, int offset, int limit) {
        authorizationService.require(authentication, "department.member.view", null, departmentId);
        var items = departmentMemberRepository.findByDepartment_IdOrderByJoinedAtAsc(departmentId).stream()
                .skip(Math.max(0, offset)).limit(Math.max(1, Math.min(limit, 100)))
                .map(DepartmentMemberResponse::from).toList();
        return new PageResponse<>(items, departmentMemberRepository.countByDepartment_Id(departmentId),
                Math.max(0, offset), Math.max(1, Math.min(limit, 100)));
    }

    @Override
    @Transactional
    public DepartmentMemberResponse add(Authentication authentication, UUID departmentId, AddDepartmentMemberRequest request) {
        authorizationService.require(authentication, "department.member.add", null, departmentId);
        Department department = findDepartment(departmentId);
        Membership membership = findMembership(request.membershipId());
        if (membership.getStatus() != com.vju.club.entity.MembershipStatus.ACTIVE) {
            throw new ApiException(HttpStatus.CONFLICT, "MEMBERSHIP_NOT_ACTIVE", "Only active memberships can be assigned");
        }
        validateSameClub(department, membership);
        if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(departmentId, request.membershipId()).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBER_ALREADY_EXISTS", "Department member already exists");
        }
        DepartmentMember member = new DepartmentMember();
        member.setDepartment(department); member.setMembership(membership);
        member.setJoinedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return DepartmentMemberResponse.from(departmentMemberRepository.save(member));
    }

    @Override
    @Transactional
    public void remove(Authentication authentication, UUID departmentId, UUID membershipId) {
        authorizationService.require(authentication, "department.member.remove", null, departmentId);
        DepartmentMember member = findAssignment(departmentId, membershipId);
        departmentMemberRepository.delete(member);
    }

    @Override
    @Transactional
    public DepartmentMemberResponse move(Authentication authentication, UUID departmentId, UUID membershipId,
                                         MoveDepartmentMemberRequest request) {
        authorizationService.require(authentication, "department.member.remove", null, departmentId);
        authorizationService.require(authentication, "department.member.add", null, request.targetDepartmentId());
        DepartmentMember source = findAssignment(departmentId, membershipId);
        Department target = findDepartment(request.targetDepartmentId());
        validateSameClub(source.getDepartment(), target);
        if (departmentId.equals(target.getId())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "SAME_DEPARTMENT", "Target department must differ");
        }
        if (departmentMemberRepository.findByDepartment_IdAndMembership_Id(target.getId(), membershipId).isPresent()) {
            throw new ApiException(HttpStatus.CONFLICT, "DEPARTMENT_MEMBER_ALREADY_EXISTS", "Department member already exists");
        }
        departmentMemberRepository.delete(source);
        DepartmentMember moved = new DepartmentMember();
        moved.setDepartment(target); moved.setMembership(source.getMembership());
        moved.setJoinedAt(OffsetDateTime.now(ZoneOffset.UTC));
        return DepartmentMemberResponse.from(departmentMemberRepository.save(moved));
    }

    private DepartmentMember findAssignment(UUID departmentId, UUID membershipId) {
        return departmentMemberRepository.findByDepartment_IdAndMembership_Id(departmentId, membershipId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_MEMBER_NOT_FOUND", "Department member not found"));
    }
    private Department findDepartment(UUID id) {
        return departmentRepository.findById(id)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "DEPARTMENT_NOT_FOUND", "Department not found"));
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
