package com.vju.club.bootstrap;

import com.vju.club.config.DemoDataProperties;
import com.vju.club.modules.club.entity.Club;
import com.vju.club.modules.department.entity.Department;
import com.vju.club.modules.departmentmember.entity.DepartmentMember;
import com.vju.club.modules.membership.entity.Membership;
import com.vju.club.modules.membership.enums.MembershipStatus;
import com.vju.club.modules.permission.enums.PermissionScope;
import com.vju.club.modules.role.entity.Role;
import com.vju.club.modules.user.entity.User;
import com.vju.club.modules.permission.entity.UserPermission;
import com.vju.club.modules.role.entity.UserRole;
import com.vju.club.modules.user.enums.UserStatus;
import com.vju.club.modules.club.repository.ClubRepository;
import com.vju.club.modules.departmentmember.repository.DepartmentMemberRepository;
import com.vju.club.modules.department.repository.DepartmentRepository;
import com.vju.club.modules.membership.repository.MembershipRepository;
import com.vju.club.modules.permission.repository.PermissionRepository;
import com.vju.club.modules.role.repository.RoleRepository;
import com.vju.club.modules.permission.repository.UserPermissionRepository;
import com.vju.club.modules.user.repository.UserRepository;
import com.vju.club.modules.role.repository.UserRoleRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.transaction.annotation.Transactional;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class DemoDataSeeder {
    static final String CLUB_CODE = "VJUA";
    static final List<String> DEPARTMENTS = List.of("Ban Truyền thông", "Ban Chuyên môn", "Ban Hậu cần", "Ban Đối ngoại");
    static final String USER_A = "demo.a@vju.local";
    static final String USER_B = "demo.b@vju.local";
    static final String USER_C = "demo.c@vju.local";
    static final String STUDENT = "demo.student@vju.local";

    private static final Logger log = LoggerFactory.getLogger(DemoDataSeeder.class);

    private final DemoDataProperties properties;
    private final UserRepository userRepository;
    private final ClubRepository clubRepository;
    private final DepartmentRepository departmentRepository;
    private final MembershipRepository membershipRepository;
    private final DepartmentMemberRepository departmentMemberRepository;
    private final RoleRepository roleRepository;
    private final UserRoleRepository userRoleRepository;
    private final PermissionRepository permissionRepository;
    private final UserPermissionRepository userPermissionRepository;
    private final PasswordEncoder passwordEncoder;
    private final Clock clock;

    public DemoDataSeeder(DemoDataProperties properties, UserRepository userRepository, ClubRepository clubRepository,
                          DepartmentRepository departmentRepository, MembershipRepository membershipRepository,
                          DepartmentMemberRepository departmentMemberRepository, RoleRepository roleRepository,
                          UserRoleRepository userRoleRepository, PermissionRepository permissionRepository,
                          UserPermissionRepository userPermissionRepository, PasswordEncoder passwordEncoder,
                          Clock clock) {
        this.properties = properties;
        this.userRepository = userRepository;
        this.clubRepository = clubRepository;
        this.departmentRepository = departmentRepository;
        this.membershipRepository = membershipRepository;
        this.departmentMemberRepository = departmentMemberRepository;
        this.roleRepository = roleRepository;
        this.userRoleRepository = userRoleRepository;
        this.permissionRepository = permissionRepository;
        this.userPermissionRepository = userPermissionRepository;
        this.passwordEncoder = passwordEncoder;
        this.clock = clock;
    }

    @Transactional
    public boolean seed() {
        if (!properties.isEnabled()) return false;
        if (properties.getPassword() == null || properties.getPassword().isBlank()) {
            log.info("Demo data skipped: set DEMO_USER_PASSWORD to seed club {}", CLUB_CODE);
            return false;
        }
        if (clubRepository.existsByCodeIgnoreCase(CLUB_CODE)) {
            return false;
        }

        User a = user(USER_A, "Nguyễn Văn A", "VJU-DEMO-A");
        User b = user(USER_B, "Trần Thị B", "VJU-DEMO-B");
        User c = user(USER_C, "Lê Văn C", "VJU-DEMO-C");
        user(STUDENT, "Sinh viên đăng ký CLB", "VJU-DEMO-STUDENT");

        Club club = new Club();
        club.setCode(CLUB_CODE);
        club.setName("CLB Học thuật VJU");
        club.setDescription("Câu lạc bộ học thuật của Trường Đại học Việt Nhật (dữ liệu demo)");
        club.setActivityField("Học thuật");
        club.setContactEmail("vjua@vju.local");
        club = clubRepository.save(club);

        Map<String, Department> departments = new LinkedHashMap<>();
        for (String name : DEPARTMENTS) {
            Department department = new Department();
            department.setClub(club);
            department.setName(name);
            departments.put(name, departmentRepository.save(department));
        }

        Membership ma = membership(a, club);
        Membership mb = membership(b, club);
        Membership mc = membership(c, club);
        assign(departments.get("Ban Chuyên môn"), ma);
        assign(departments.get("Ban Truyền thông"), mb);
        assign(departments.get("Ban Truyền thông"), mc);

        assignRole(a, "CLUB_PRESIDENT", PermissionScope.CLUB, club, null, a);
        assignRole(b, "DEPARTMENT_HEAD", PermissionScope.DEPARTMENT, null, departments.get("Ban Truyền thông"), a);
        grant(c, "club.view", club, a);
        grant(c, "member.view", club, a);

        log.info("Seeded demo club {} with {} departments and users {}, {}, {}, {}",
                CLUB_CODE, departments.size(), USER_A, USER_B, USER_C, STUDENT);
        return true;
    }

    private User user(String email, String fullName, String studentCode) {
        return userRepository.findByEmailIgnoreCase(email).orElseGet(() -> {
            User user = new User();
            user.setEmail(email);
            user.setFullName(fullName);
            user.setStudentCode(studentCode);
            user.setPasswordHash(passwordEncoder.encode(properties.getPassword()));
            user.setStatus(UserStatus.ACTIVE);
            return userRepository.save(user);
        });
    }

    private Membership membership(User user, Club club) {
        Membership membership = new Membership();
        membership.setUser(user);
        membership.setClub(club);
        membership.setStatus(MembershipStatus.ACTIVE);
        membership.setJoinedAt(OffsetDateTime.now(clock));
        return membershipRepository.save(membership);
    }

    private void assign(Department department, Membership membership) {
        DepartmentMember member = new DepartmentMember();
        member.setDepartment(department);
        member.setMembership(membership);
        member.setClubId(department.getClub().getId());
        member.setJoinedAt(OffsetDateTime.now(clock));
        departmentMemberRepository.save(member);
    }

    private void assignRole(User user, String roleCode, PermissionScope scope, Club club, Department department,
                            User grantedBy) {
        Role role = roleRepository.findByCode(roleCode)
                .orElseThrow(() -> new IllegalStateException("Role " + roleCode + " is missing; check migrations"));
        UserRole assignment = new UserRole();
        assignment.setUser(user);
        assignment.setRole(role);
        assignment.setScope(scope);
        assignment.setClub(club);
        assignment.setDepartment(department);
        assignment.setGrantedBy(grantedBy);
        assignment.setGrantedAt(OffsetDateTime.now(clock));
        userRoleRepository.save(assignment);
    }

    private void grant(User user, String permissionKey, Club club, User grantedBy) {
        UserPermission grant = new UserPermission();
        grant.setUser(user);
        grant.setPermission(permissionRepository.findByPermissionKeyIn(List.of(permissionKey)).getFirst());
        grant.setScope(PermissionScope.CLUB);
        grant.setClub(club);
        grant.setGrantedBy(grantedBy);
        grant.setGrantedAt(OffsetDateTime.now(clock));
        userPermissionRepository.save(grant);
    }
}
