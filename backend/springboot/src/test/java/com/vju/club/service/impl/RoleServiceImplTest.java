package com.vju.club.service.impl;

import com.vju.club.common.PermissionConstants;
import com.vju.club.dto.request.AssignRoleRequest;
import com.vju.club.dto.response.UserRoleResponse;
import com.vju.club.entity.Club;
import com.vju.club.entity.Department;
import com.vju.club.entity.DepartmentMember;
import com.vju.club.entity.Membership;
import com.vju.club.entity.Role;
import com.vju.club.entity.User;
import com.vju.club.entity.UserRole;
import com.vju.club.enums.MembershipStatus;
import com.vju.club.enums.PermissionScope;
import com.vju.club.mapper.RoleMapper;
import com.vju.club.mapper.RoleMapperImpl;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.PermissionAuditLogRepository;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import com.vju.club.security.Actor;
import com.vju.club.security.GrantGuard;
import com.vju.club.security.PermissionAuthorizationService;
import com.vju.club.service.AuditService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.mockito.ArgumentCaptor;
import org.springframework.test.util.ReflectionTestUtils;

import java.time.Clock;
import java.time.Instant;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class RoleServiceImplTest {
    private static final Instant FIXED_INSTANT = Instant.parse("2026-11-22T08:30:00Z");
    private static final OffsetDateTime FIXED_NOW = OffsetDateTime.ofInstant(FIXED_INSTANT, ZoneOffset.UTC);

    private RoleRepository roleRepository;
    private UserRoleRepository userRoleRepository;
    private PermissionRepository permissionRepository;
    private PermissionAuditLogRepository auditLogRepository;
    private UserRepository userRepository;
    private ClubRepository clubRepository;
    private DepartmentRepository departmentRepository;
    private MembershipRepository membershipRepository;
    private DepartmentMemberRepository departmentMemberRepository;
    private PermissionAuthorizationService authorizationService;
    private AuditService auditService;
    private GrantGuard grantGuard;
    private RoleServiceImpl service;

    private UUID adminId;
    private UUID targetId;
    private UUID clubId;
    private UUID deptId;
    private Actor adminActor;
    private User adminUser;
    private User targetUser;
    private Club club;
    private Department department;

    @BeforeEach
    void setUp() {
        roleRepository = mock(RoleRepository.class);
        userRoleRepository = mock(UserRoleRepository.class);
        permissionRepository = mock(PermissionRepository.class);
        auditLogRepository = mock(PermissionAuditLogRepository.class);
        userRepository = mock(UserRepository.class);
        clubRepository = mock(ClubRepository.class);
        departmentRepository = mock(DepartmentRepository.class);
        membershipRepository = mock(MembershipRepository.class);
        departmentMemberRepository = mock(DepartmentMemberRepository.class);
        authorizationService = mock(PermissionAuthorizationService.class);
        auditService = mock(AuditService.class);
        grantGuard = mock(GrantGuard.class);
        RoleMapper roleMapper = new RoleMapperImpl();

        service = new RoleServiceImpl(
                roleRepository,
                userRoleRepository,
                permissionRepository,
                auditLogRepository,
                userRepository,
                clubRepository,
                departmentRepository,
                membershipRepository,
                departmentMemberRepository,
                authorizationService,
                Clock.fixed(FIXED_INSTANT, ZoneOffset.UTC),
                auditService,
                roleMapper,
                grantGuard
        );

        adminId = UUID.randomUUID();
        targetId = UUID.randomUUID();
        clubId = UUID.randomUUID();
        deptId = UUID.randomUUID();
        adminActor = new Actor(adminId);

        adminUser = new User();
        ReflectionTestUtils.setField(adminUser, "id", adminId);
        adminUser.setEmail("admin@vju.ac.vn");

        targetUser = new User();
        ReflectionTestUtils.setField(targetUser, "id", targetId);
        targetUser.setEmail("officer@vju.ac.vn");

        club = new Club();
        ReflectionTestUtils.setField(club, "id", clubId);
        club.setCode("DOANVJU");
        club.setName("Đoàn Thanh niên Trường Đại học Việt Nhật");

        department = new Department();
        ReflectionTestUtils.setField(department, "id", deptId);
        department.setClub(club);
        department.setName("Ban Điều phối CLB");

        when(userRepository.findById(adminId)).thenReturn(Optional.of(adminUser));
        when(userRepository.findById(targetId)).thenReturn(Optional.of(targetUser));
        when(clubRepository.findById(clubId)).thenReturn(Optional.of(club));
        when(departmentRepository.findById(deptId)).thenReturn(Optional.of(department));
        when(authorizationService.hasAnyPermission(adminActor, PermissionConstants.PERMISSION_ASSIGN)).thenReturn(true);
        when(authorizationService.hasGlobalPermission(adminActor, PermissionConstants.PERMISSION_ASSIGN)).thenReturn(true);
        when(authorizationService.hasPermission(any(), any(), any(), any())).thenReturn(true);
        when(userRoleRepository.saveAndFlush(any(UserRole.class))).thenAnswer(inv -> {
            UserRole ur = inv.getArgument(0);
            if (ur.getId() == null) {
                ReflectionTestUtils.setField(ur, "id", UUID.randomUUID());
            }
            return ur;
        });
    }

    private Role stubRole(String code, String name, PermissionScope scope) {
        UUID roleId = UUID.randomUUID();
        Role role = new Role();
        ReflectionTestUtils.setField(role, "id", roleId);
        role.setCode(code);
        role.setName(name);
        role.setScope(scope);
        role.setActive(true);
        when(roleRepository.findWithPermissions(roleId)).thenReturn(Optional.of(role));
        return role;
    }

    @Test
    void assignClubRoleCreatesActiveMembershipWhenNoneExists() {
        Role president = stubRole("CLUB_PRESIDENT", "Chủ nhiệm CLB", PermissionScope.CLUB);
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(targetId, clubId, MembershipStatus.LEFT))
                .thenReturn(Optional.empty());
        when(membershipRepository.saveAndFlush(any(Membership.class))).thenAnswer(inv -> {
            Membership m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", UUID.randomUUID());
            return m;
        });

        UserRoleResponse response = service.assign(
                adminActor,
                targetId,
                new AssignRoleRequest(president.getId(), PermissionScope.CLUB, clubId, null, "Bổ nhiệm")
        );

        assertThat(response.roleCode()).isEqualTo("CLUB_PRESIDENT");
        assertThat(response.clubId()).isEqualTo(clubId);

        ArgumentCaptor<Membership> membershipCaptor = ArgumentCaptor.forClass(Membership.class);
        verify(membershipRepository).saveAndFlush(membershipCaptor.capture());
        Membership savedMembership = membershipCaptor.getValue();
        assertThat(savedMembership.getUser()).isSameAs(targetUser);
        assertThat(savedMembership.getClub()).isSameAs(club);
        assertThat(savedMembership.getStatus()).isEqualTo(MembershipStatus.ACTIVE);
        assertThat(savedMembership.getJoinedAt()).isEqualTo(FIXED_NOW);
        assertThat(savedMembership.getLeftAt()).isNull();

        verify(departmentMemberRepository, never()).saveAndFlush(any());
    }

    @Test
    void assignDepartmentRoleCreatesActiveMembershipAndDepartmentMember() {
        Role head = stubRole("DEPARTMENT_HEAD", "Trưởng ban", PermissionScope.DEPARTMENT);
        UUID newMembershipId = UUID.randomUUID();
        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(targetId, clubId, MembershipStatus.LEFT))
                .thenReturn(Optional.empty());
        when(membershipRepository.saveAndFlush(any(Membership.class))).thenAnswer(inv -> {
            Membership m = inv.getArgument(0);
            ReflectionTestUtils.setField(m, "id", newMembershipId);
            return m;
        });
        when(departmentMemberRepository.findByDepartment_IdAndMembership_Id(deptId, newMembershipId))
                .thenReturn(Optional.empty());
        when(departmentMemberRepository.saveAndFlush(any(DepartmentMember.class))).thenAnswer(inv -> inv.getArgument(0));

        UserRoleResponse response = service.assign(
                adminActor,
                targetId,
                new AssignRoleRequest(head.getId(), PermissionScope.DEPARTMENT, null, deptId, "Bổ nhiệm trưởng ban")
        );

        assertThat(response.roleCode()).isEqualTo("DEPARTMENT_HEAD");
        assertThat(response.departmentId()).isEqualTo(deptId);

        verify(membershipRepository).saveAndFlush(any(Membership.class));

        ArgumentCaptor<DepartmentMember> dmCaptor = ArgumentCaptor.forClass(DepartmentMember.class);
        verify(departmentMemberRepository).saveAndFlush(dmCaptor.capture());
        DepartmentMember savedDm = dmCaptor.getValue();
        assertThat(savedDm.getDepartment()).isSameAs(department);
        assertThat(savedDm.getMembership().getId()).isEqualTo(newMembershipId);
        assertThat(savedDm.getClubId()).isEqualTo(clubId);
        assertThat(savedDm.getJoinedAt()).isEqualTo(FIXED_NOW);
    }

    @Test
    void assignClubRoleDoesNotDuplicateExistingActiveMembership() {
        Role vice = stubRole("CLUB_VICE_PRESIDENT", "Phó chủ nhiệm CLB", PermissionScope.CLUB);
        Membership existing = new Membership();
        ReflectionTestUtils.setField(existing, "id", UUID.randomUUID());
        existing.setUser(targetUser);
        existing.setClub(club);
        existing.setStatus(MembershipStatus.ACTIVE);
        existing.setJoinedAt(FIXED_NOW.minusDays(5));

        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(targetId, clubId, MembershipStatus.LEFT))
                .thenReturn(Optional.of(existing));

        service.assign(
                adminActor,
                targetId,
                new AssignRoleRequest(vice.getId(), PermissionScope.CLUB, clubId, null, null)
        );

        verify(membershipRepository, never()).saveAndFlush(any(Membership.class));
        verify(departmentMemberRepository, never()).saveAndFlush(any(DepartmentMember.class));
    }

    @Test
    void assignDepartmentRoleDoesNotDuplicateExistingMembershipOrDepartmentMember() {
        Role head = stubRole("DEPARTMENT_HEAD", "Trưởng ban", PermissionScope.DEPARTMENT);
        UUID existingMembershipId = UUID.randomUUID();
        Membership existing = new Membership();
        ReflectionTestUtils.setField(existing, "id", existingMembershipId);
        existing.setUser(targetUser);
        existing.setClub(club);
        existing.setStatus(MembershipStatus.ACTIVE);

        DepartmentMember existingDm = new DepartmentMember();
        existingDm.setDepartment(department);
        existingDm.setMembership(existing);
        existingDm.setClubId(clubId);

        when(membershipRepository.findFirstByUser_IdAndClub_IdAndStatusNot(targetId, clubId, MembershipStatus.LEFT))
                .thenReturn(Optional.of(existing));
        when(departmentMemberRepository.findByDepartment_IdAndMembership_Id(deptId, existingMembershipId))
                .thenReturn(Optional.of(existingDm));

        service.assign(
                adminActor,
                targetId,
                new AssignRoleRequest(head.getId(), PermissionScope.DEPARTMENT, null, deptId, null)
        );

        verify(membershipRepository, never()).saveAndFlush(any(Membership.class));
        verify(departmentMemberRepository, never()).saveAndFlush(any(DepartmentMember.class));
    }

    @Test
    void assignGlobalSystemRoleDoesNotCreateClubMembership() {
        Role sysAdmin = stubRole("SYSTEM_ADMIN", "Quản trị hệ thống", PermissionScope.GLOBAL);

        UserRoleResponse response = service.assign(
                adminActor,
                targetId,
                new AssignRoleRequest(sysAdmin.getId(), PermissionScope.GLOBAL, null, null, null)
        );

        assertThat(response.roleCode()).isEqualTo("SYSTEM_ADMIN");
        verify(membershipRepository, never()).findFirstByUser_IdAndClub_IdAndStatusNot(any(), any(), any());
        verify(membershipRepository, never()).saveAndFlush(any(Membership.class));
        verify(departmentMemberRepository, never()).saveAndFlush(any(DepartmentMember.class));
    }
}
