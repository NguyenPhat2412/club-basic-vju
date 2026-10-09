package com.vju.club.entity;

import com.vju.club.modules.audit.entity.PermissionAuditLog;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.clubapplication.entity.ClubApplication;
import com.vju.club.modules.clubapplication.enums.ClubApplicationStatus;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.permission.entity.Permission;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.user.enums.UserStatus;

import com.vju.club.modules.audit.enums.AuditAction;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import org.junit.jupiter.api.Test;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class EntityMappingTest {

    @Test
    void phaseOneEntitiesMapEveryMigrationTable() {
        Map<Class<?>, String> expectedTables = Map.of(
                User.class, "users",
                Club.class, "clubs",
                Department.class, "departments",
                Membership.class, "memberships",
                DepartmentMember.class, "department_members",
                Permission.class, "permissions",
                UserPermission.class, "user_permissions",
                PermissionAuditLog.class, "permission_audit_logs"
        );

        expectedTables.forEach((entityType, tableName) -> {
            assertThat(entityType).hasAnnotation(Entity.class);
            assertThat(entityType.getAnnotation(Table.class).name()).isEqualTo(tableName);
        });
    }

    @Test
    void phaseTwoApplicationMapsItsMigrationTableAndStatusValues() {
        assertThat(ClubApplication.class).hasAnnotation(Entity.class);
        assertThat(ClubApplication.class.getAnnotation(Table.class).name()).isEqualTo("club_applications");
        assertThat(ClubApplicationStatus.values())
                .extracting(Enum::name)
                .containsExactly("PENDING", "APPROVED", "REJECTED", "CANCELLED");
        assertThat(AuditAction.ResourceType.values())
                .extracting(Enum::name)
                .contains("APPLICATION");
    }

    @Test
    void permissionScopeEnumsMatchDatabaseCheckConstraintValues() {
        assertThat(PermissionScope.values())
                .extracting(Enum::name)
                .containsExactly("GLOBAL", "CLUB", "DEPARTMENT");
        assertThat(UserStatus.values())
                .extracting(Enum::name)
                .containsExactly("ACTIVE", "INACTIVE");
        assertThat(MembershipStatus.values())
                .extracting(Enum::name)
                .containsExactly("ACTIVE", "INACTIVE", "LEFT", "SUSPENDED");
    }
}
