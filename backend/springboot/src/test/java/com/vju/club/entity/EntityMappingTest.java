package com.vju.club.entity;

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
