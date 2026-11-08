package com.vju.club.integration;

import com.vju.club.bootstrap.DemoDataSeeder;
import com.vju.club.bootstrap.LocalVjuClubCatalogSeeder;
import com.vju.club.config.DemoDataProperties;
import com.vju.club.repository.ClubApplicationFormRepository;
import com.vju.club.repository.ClubRepository;
import com.vju.club.repository.DepartmentMemberRepository;
import com.vju.club.repository.DepartmentRepository;
import com.vju.club.repository.EventRepository;
import com.vju.club.repository.MembershipRepository;
import com.vju.club.repository.PermissionRepository;
import com.vju.club.repository.RoleRepository;
import com.vju.club.repository.UserPermissionRepository;
import com.vju.club.repository.UserRepository;
import com.vju.club.repository.UserRoleRepository;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;

import java.time.Clock;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;

class LocalVjuClubCatalogSeederTest extends ApiIntegrationTest {
    @Autowired UserRepository users;
    @Autowired ClubRepository clubs;
    @Autowired DepartmentRepository departments;
    @Autowired MembershipRepository memberships;
    @Autowired DepartmentMemberRepository departmentMembers;
    @Autowired RoleRepository roles;
    @Autowired UserRoleRepository userRoles;
    @Autowired PermissionRepository permissions;
    @Autowired UserPermissionRepository userPermissions;
    @Autowired ClubApplicationFormRepository forms;
    @Autowired EventRepository events;

    @Test
    void enrichesVjuaAndSeedsTwelveRealVjuClubsIdempotently() throws Exception {
        DemoDataProperties props = new DemoDataProperties();
        props.setEnabled(true);
        props.setPassword("Demo-Password-123");

        DemoDataSeeder demoSeeder = new DemoDataSeeder(props, users, clubs, departments, memberships,
                departmentMembers, roles, userRoles, permissions, userPermissions, passwords, Clock.systemUTC());
        demoSeeder.seed();

        LocalVjuClubCatalogSeeder catalogSeeder = new LocalVjuClubCatalogSeeder(
                props, clubs, departments, forms, events, Clock.systemUTC(), "http://localhost:3000");
        catalogSeeder.run();
        long clubsAfterFirstRun = count("SELECT count(*) FROM clubs");
        long eventsAfterFirstRun = count("SELECT count(*) FROM events");
        catalogSeeder.run();

        assertThat(count("SELECT count(*) FROM clubs")).isEqualTo(clubsAfterFirstRun);
        assertThat(count("SELECT count(*) FROM events")).isEqualTo(eventsAfterFirstRun);

        var vjua = clubs.findByCodeIgnoreCase("VJUA").orElseThrow();
        assertThat(vjua.getLogoUrl()).isEqualTo("http://localhost:3000/images/clubs/vjua/logo.png");
        assertThat(vjua.getCoverUrl()).isEqualTo("http://localhost:3000/images/clubs/vjua/cover.jpg");

        var sunPinkey = clubs.findByCodeIgnoreCase("SUNPINKEY").orElseThrow();
        assertThat(sunPinkey.getName()).contains("Sun Pinkey");
        assertThat(sunPinkey.getActivityField()).isEqualTo("Thể thao");

        var publicClubs = call(get("/api/v1/public/clubs").param("limit", "50"), null, null, 200);
        assertThat(publicClubs.path("total").asInt()).isGreaterThanOrEqualTo(12);

        var publicEvents = call(get("/api/v1/public/events").param("limit", "50"), null, null, 200);
        assertThat(publicEvents.path("total").asInt()).isGreaterThanOrEqualTo(12);
    }
}
