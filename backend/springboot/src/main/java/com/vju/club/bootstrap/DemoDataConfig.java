package com.vju.club.bootstrap;

import com.vju.club.config.DemoDataProperties;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.Clock;

/** Demo data exists only in the local profile, never in production. */
@Configuration
@Profile("local")
@EnableConfigurationProperties(DemoDataProperties.class)
public class DemoDataConfig {

    @Bean
    DemoDataSeeder demoDataSeeder(DemoDataProperties properties, UserRepository users, ClubRepository clubs,
                                  DepartmentRepository departments, MembershipRepository memberships,
                                  DepartmentMemberRepository departmentMembers, RoleRepository roles,
                                  UserRoleRepository userRoles, PermissionRepository permissions,
                                  UserPermissionRepository userPermissions, PasswordEncoder passwordEncoder, Clock clock) {
        return new DemoDataSeeder(properties, users, clubs, departments, memberships, departmentMembers, roles,
                userRoles, permissions, userPermissions, passwordEncoder, clock);
    }
}
