package com.vju.club.mapper;

import com.vju.club.modules.audit.entity.AuditLog;
import com.vju.club.modules.audit.mapper.AuditMapperImpl;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.club.enums.ClubStatus;
import com.vju.club.modules.club.mapper.ClubMapperImpl;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.clubapplication.mapper.ClubApplicationMapperImpl;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.departmentmember.mapper.DepartmentMemberMapperImpl;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.membership.mapper.MembershipMapperImpl;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.permission.mapper.PermissionMapperImpl;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.role.mapper.RoleMapperImpl;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.user.mapper.UserMapperImpl;
import org.junit.jupiter.api.Test;

import java.time.OffsetDateTime;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;

/** The MapStruct-generated mappers: nested ids, enum names, null-safety and custom conversions. */
class MapStructMappersTest {

    private static User user() {
        User user = new User();
        user.setId(UUID.randomUUID());
        user.setEmail("u@vju.local");
        user.setFullName("User");
        user.setStatus(UserStatus.ACTIVE);
        return user;
    }

    private static Club club() {
        Club club = new Club();
        club.setId(UUID.randomUUID());
        club.setCode("VJUA");
        club.setName("VJU Academic");
        club.setStatus(ClubStatus.ACTIVE);
        return club;
    }

    @Test
    void userAndClubMapFieldByFieldWithEnumNames() {
        User user = user();
        var userResponse = new UserMapperImpl().toResponse(user);
        assertThat(userResponse.id()).isEqualTo(user.getId());
        assertThat(userResponse.email()).isEqualTo("u@vju.local");
        assertThat(userResponse.status()).isEqualTo("ACTIVE");

        Club club = club();
        var clubResponse = new ClubMapperImpl().toResponse(club);
        assertThat(clubResponse.code()).isEqualTo("VJUA");
        assertThat(clubResponse.status()).isEqualTo("ACTIVE");
    }

    @Test
    void nullEntityMapsToNull() {
        assertThat(new UserMapperImpl().toResponse(null)).isNull();
        assertThat(new ClubMapperImpl().toResponse(null)).isNull();
    }

    @Test
    void membershipAndDepartmentMemberExposeNestedIds() {
        User user = user();
        Club club = club();
        Membership membership = new Membership();
        membership.setId(UUID.randomUUID());
        membership.setUser(user);
        membership.setClub(club);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(OffsetDateTime.now());
        Department department = new Department();
        department.setId(UUID.randomUUID());
        department.setName("Ban Truyền thông");
        department.setClub(club);
        DepartmentMember member = new DepartmentMember();
        member.setId(UUID.randomUUID());
        member.setDepartment(department);
        member.setMembership(membership);

        MembershipMapperImpl membershipMapper = new MembershipMapperImpl();
        var response = membershipMapper.toResponse(membership);
        assertThat(response.userId()).isEqualTo(user.getId());
        assertThat(response.clubId()).isEqualTo(club.getId());
        assertThat(response.status()).isEqualTo("ACTIVE");

        var mine = membershipMapper.toMyResponse(membership, List.of(membershipMapper.toDepartmentResponse(member)));
        assertThat(mine.clubCode()).isEqualTo("VJUA");
        assertThat(mine.departments()).singleElement()
                .satisfies(d -> assertThat(d.name()).isEqualTo("Ban Truyền thông"));

        var assignment = new DepartmentMemberMapperImpl().toResponse(member);
        assertThat(assignment.departmentId()).isEqualTo(department.getId());
        assertThat(assignment.membershipId()).isEqualTo(membership.getId());
        assertThat(assignment.userId()).isEqualTo(user.getId());
    }

    @Test
    void globalGrantHasNoClubOrDepartment() {
        Permission permission = new Permission();
        permission.setId(UUID.randomUUID());
        permission.setPermissionKey("user.view");
        UserPermission grant = new UserPermission();
        grant.setId(UUID.randomUUID());
        grant.setUser(user());
        grant.setPermission(permission);
        grant.setScope(PermissionScope.GLOBAL);

        var response = new PermissionMapperImpl().toUserPermissionResponse(grant);
        assertThat(response.permissionKey()).isEqualTo("user.view");
        assertThat(response.scope()).isEqualTo("GLOBAL");
        assertThat(response.clubId()).isNull();
        assertThat(response.departmentId()).isNull();
    }

    @Test
    void rolePermissionKeysAreSorted() {
        Role role = new Role();
        role.setId(UUID.randomUUID());
        role.setCode("EDITOR");
        role.setScope(PermissionScope.CLUB);
        var permissions = new LinkedHashSet<Permission>();
        for (String key : List.of("member.view", "club.view", "club.update")) {
            Permission permission = new Permission();
            permission.setPermissionKey(key);
            permissions.add(permission);
        }
        role.setPermissions(permissions);
        assertThat(new RoleMapperImpl().toResponse(role).permissionKeys())
                .containsExactly("club.update", "club.view", "member.view");
    }

    @Test
    void clubApplicationWithoutMembershipLeavesMembershipFieldsEmpty() {
        ClubApplication application = new ClubApplication();
        application.setId(UUID.randomUUID());
        application.setApplicant(user());
        application.setClub(club());
        application.setStatus(ClubApplicationStatus.values()[0]);

        var response = new ClubApplicationMapperImpl().toResponse(application);
        assertThat(response.applicantId()).isEqualTo(application.getApplicant().getId());
        assertThat(response.clubCode()).isEqualTo("VJUA");
        assertThat(response.reviewedBy()).isNull();
        assertThat(response.membershipId()).isNull();
        assertThat(response.membershipStatus()).isNull();
    }

    @Test
    void auditSnapshotsAreParsedFromJson() {
        AuditLog log = new AuditLog(UUID.randomUUID(), "CLUB_UPDATED", "CLUB", UUID.randomUUID(), null,
                "{\"name\":\"Old\"}", "{\"name\":\"New\",\"members\":3}");
        var response = new AuditMapperImpl().toResponse(log);
        assertThat(response.oldValue()).containsEntry("name", "Old");
        assertThat(response.newValue()).containsEntry("name", "New").containsEntry("members", 3);
        assertThat(new AuditMapperImpl().jsonToMap(null)).isNull();
    }
}
