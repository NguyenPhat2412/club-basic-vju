package com.vju.club.integration;

import com.vju.club.bootstrap.DemoDataSeeder;
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
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;
import java.util.Map;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.patch;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;

class DemoDataApiTest extends ApiIntegrationTest {
    @Test
    void demoStudentCanApplyAndDemoManagerCanReviewAndAssign() throws Exception {
        seeder(DEMO_PASSWORD, true).seed();
        UUID vjua = db.queryForObject("SELECT id FROM clubs WHERE code = 'VJUA'", UUID.class);
        String student = login("demo.student@vju.local");
        String manager = login("demo.a@vju.local");
        var application = call(post("/api/v1/clubs/" + vjua + "/applications"), student,
                Map.of("message", "Demo student application"), 201);
        call(get("/api/v1/clubs/" + vjua + "/applications"), manager, null, 200);
        var approved = call(post("/api/v1/clubs/" + vjua + "/applications/" + id(application) + "/approve"),
                manager, Map.of(), 200);
        assertThat(approved.path("membershipStatus").asText()).isEqualTo("ACTIVE");
        call(post("/api/v1/departments/" + department("Ban Truyền thông") + "/members"), manager,
                Map.of("membershipId", approved.path("membershipId").asText()), 201);
    }

    private static final String DEMO_PASSWORD = "Demo-Password-123";

    @Autowired UserRepository users;
    @Autowired ClubRepository clubs;
    @Autowired DepartmentRepository departments;
    @Autowired MembershipRepository memberships;
    @Autowired DepartmentMemberRepository departmentMembers;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired PermissionRepository permissions;
    @Autowired UserPermissionRepository userPermissions;

    private DemoDataSeeder seeder(String password, boolean enabled) {
        DemoDataProperties properties = new DemoDataProperties();
        properties.setPassword(password);
        properties.setEnabled(enabled);
        return new DemoDataSeeder(properties, users, clubs, departments, memberships, departmentMembers, roles,
                userRoles, permissions, userPermissions, passwords, Clock.systemUTC());
    }

    private String login(String email) throws Exception {
        return login(email, DEMO_PASSWORD);
    }

    private UUID department(String name) {
        return db.queryForObject("SELECT d.id FROM departments d JOIN clubs c ON c.id = d.club_id "
                + "WHERE c.code = 'VJUA' AND d.name = ?", UUID.class, name);
    }

    @Test
    void seedsOneClubFourDepartmentsAndThreeUsersOnce() {
        assertThat(seeder(DEMO_PASSWORD, true).seed()).isTrue();
        assertThat(seeder(DEMO_PASSWORD, true).seed()).as("second run is a no-op").isFalse();

        assertThat(count("SELECT count(*) FROM clubs WHERE code = 'VJUA'")).isEqualTo(1);
        assertThat(db.queryForList("SELECT d.name FROM departments d JOIN clubs c ON c.id = d.club_id "
                + "WHERE c.code = 'VJUA' ORDER BY d.name", String.class))
                .containsExactlyInAnyOrder("Ban Truyền thông", "Ban Chuyên môn", "Ban Hậu cần", "Ban Đối ngoại");
        assertThat(count("SELECT count(*) FROM users WHERE email LIKE 'demo.%@vju.local'")).isEqualTo(4);
        assertThat(count("SELECT count(*) FROM memberships m JOIN clubs c ON c.id = m.club_id "
                + "WHERE c.code = 'VJUA' AND m.status = 'ACTIVE'")).isEqualTo(3);
    }

    @Test
    void demoUsersHaveTheIntendedPermissions() throws Exception {
        seeder(DEMO_PASSWORD, true).seed();
        UUID vjua = db.queryForObject("SELECT id FROM clubs WHERE code = 'VJUA'", UUID.class);
        String a = login("demo.a@vju.local");
        String b = login("demo.b@vju.local");
        String c = login("demo.c@vju.local");

        call(patch("/api/v1/clubs/" + vjua), a, Map.of("description", "Cập nhật bởi chủ nhiệm"), 200);
        call(post("/api/v1/clubs/" + vjua + "/departments"), a, Map.of("name", "Ban Sự kiện"), 201);
        problem(patch("/api/v1/clubs/" + clubA), a, Map.of("description", "no"), 403, "PERMISSION_DENIED");

        call(patch("/api/v1/departments/" + department("Ban Truyền thông")), b, Map.of("description", "ok"), 200);
        call(get("/api/v1/departments/" + department("Ban Truyền thông") + "/members"), b, null, 200);
        problem(patch("/api/v1/departments/" + department("Ban Chuyên môn")), b, Map.of("description", "no"), 403,
                "PERMISSION_DENIED");

        call(get("/api/v1/clubs/" + vjua), c, null, 200);
        call(get("/api/v1/clubs/" + vjua + "/memberships"), c, null, 200);
        problem(patch("/api/v1/clubs/" + vjua), c, Map.of("description", "no"), 403, "PERMISSION_DENIED");
        var effective = call(get("/api/v1/users/me/effective-permissions"), c, null, 200);
        assertThat(effective.size()).isEqualTo(2);
        effective.forEach(p -> assertThat(p.path("source").asText()).isEqualTo("DIRECT"));
    }

    @Test
    void nothingIsSeededWithoutAPasswordOrWhenDisabled() {
        assertThat(seeder("", true).seed()).isFalse();
        assertThat(seeder(null, true).seed()).isFalse();
        assertThat(seeder(DEMO_PASSWORD, false).seed()).isFalse();
        assertThat(count("SELECT count(*) FROM clubs WHERE code = 'VJUA'")).isZero();
    }
}
