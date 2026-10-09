package com.vju.club.departmentmember;

import com.vju.club.modules.departmentmember.mapper.DepartmentMemberMapperImpl;
import com.vju.club.modules.audit.enums.AuditAction;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.departmentmember.service.DepartmentMemberService;
import com.vju.club.modules.user.entity.User;

import com.vju.club.modules.departmentmember.service.impl.DepartmentMemberServiceImpl;

import com.vju.club.modules.audit.service.AuditService;
import com.vju.club.modules.departmentmember.dto.request.AddDepartmentMemberRequest;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.department.enums.DepartmentStatus;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.PermissionAuthorizationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static com.vju.club.support.PermissionChecks.withPermissionChecks;
import static com.vju.club.support.ApiErrors.FORBIDDEN;
import static com.vju.club.support.ApiErrors.assertApiError;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class DepartmentMemberServiceTest {

    @Mock DepartmentMemberRepository departmentMemberRepository;
    @Mock DepartmentRepository departmentRepository;
    @Mock MembershipRepository membershipRepository;
    @Mock PermissionAuthorizationService authorization;
    @Mock AuditService auditService;

    private final Actor actor = new Actor(UUID.randomUUID());
    private DepartmentMemberService service;
    private Club clubA;
    private Club clubB;
    private Department departmentA;

    @BeforeEach
    void setUp() {
        service = withPermissionChecks(new DepartmentMemberServiceImpl(departmentMemberRepository, departmentRepository,
                membershipRepository, authorization, Clock.fixed(Instant.parse("2026-10-06T00:00:00Z"), ZoneOffset.UTC),
                auditService, new DepartmentMemberMapperImpl()), authorization);
        clubA = club(UUID.randomUUID());
        clubB = club(UUID.randomUUID());
        departmentA = department(clubA);
        when(departmentRepository.findById(departmentA.getId())).thenReturn(Optional.of(departmentA));
    }

    private static Club club(UUID id) {
        Club club = new Club();
        club.setId(id);
        return club;
    }

    private static Department department(Club club) {
        Department department = new Department();
        department.setId(UUID.randomUUID());
        department.setClub(club);
        department.setStatus(DepartmentStatus.ACTIVE);
        return department;
    }

    @Test
    void addRejectsMembershipFromAnotherClub() {
        Membership membership = new Membership();
        membership.setId(UUID.randomUUID());
        membership.setClub(clubB);
        membership.setStatus(MembershipStatus.ACTIVE);
        when(membershipRepository.findById(membership.getId())).thenReturn(Optional.of(membership));

        assertApiError(() -> service.add(actor, departmentA.getId(), new AddDepartmentMemberRequest(membership.getId())),
                HttpStatus.BAD_REQUEST, "CROSS_CLUB_ASSIGNMENT");
        verify(departmentMemberRepository, never()).saveAndFlush(any());
    }

    @Test
    void departmentScopePermissionIsCheckedBeforeAssignment() {
        UUID membershipId = UUID.randomUUID();
        doThrow(FORBIDDEN).when(authorization).require(actor, "department.member.add", clubA.getId(), departmentA.getId());

        assertApiError(() -> service.add(actor, departmentA.getId(), new AddDepartmentMemberRequest(membershipId)),
                HttpStatus.FORBIDDEN, "PERMISSION_DENIED");
        verify(membershipRepository, never()).findById(any());
    }

    @Test
    void activeSameClubMembershipCanBeAssignedAndAudited() {
        Membership membership = new Membership();
        membership.setId(UUID.randomUUID());
        com.vju.club.modules.user.entity.User memberUser = new com.vju.club.modules.user.entity.User();
        memberUser.setId(UUID.randomUUID());
        membership.setUser(memberUser);
        membership.setClub(clubA);
        membership.setStatus(MembershipStatus.ACTIVE);
        when(membershipRepository.findById(membership.getId())).thenReturn(Optional.of(membership));
        when(departmentMemberRepository.findByDepartment_IdAndMembership_Id(departmentA.getId(), membership.getId()))
                .thenReturn(Optional.empty());
        when(departmentMemberRepository.saveAndFlush(any())).thenAnswer(invocation -> {
            var saved = invocation.getArgument(0, com.vju.club.modules.departmentmember.entity.DepartmentMember.class);
            saved.setId(UUID.randomUUID());
            return saved;
        });

        var response = service.add(actor, departmentA.getId(), new AddDepartmentMemberRequest(membership.getId()));

        assertThat(response.departmentId()).isEqualTo(departmentA.getId());
        verify(authorization).require(actor, "department.member.add", clubA.getId(), departmentA.getId());
        verify(auditService).record(eq(actor.id()), eq(com.vju.club.modules.audit.enums.AuditAction.DEPARTMENT_MEMBER_ADDED),
                any(), eq(clubA.getId()), eq(null), any());
    }
}
