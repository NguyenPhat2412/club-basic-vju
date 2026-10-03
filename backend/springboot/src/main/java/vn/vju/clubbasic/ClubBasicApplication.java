package vn.vju.clubbasic;

import jakarta.annotation.PostConstruct;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowCallbackHandler;
import org.springframework.http.HttpStatus;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.cors.CorsConfigurationSource;
import org.springframework.web.cors.UrlBasedCorsConfigurationSource;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.stereotype.Component;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.Instant;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@SpringBootApplication
public class ClubBasicApplication {
  public static void main(String[] args) {
    org.springframework.boot.SpringApplication.run(ClubBasicApplication.class, args);
  }

  enum Scope { GLOBAL, CLUB, DEPARTMENT }
  enum AccountStatus { ACTIVE, INACTIVE }
  enum MembershipStatus { ACTIVE, INACTIVE, LEFT, SUSPENDED }

  static final class UserAccount {
    final String id;
    final String email;
    String passwordHash;
    String fullName;
    String studentCode;
    String phone;
    AccountStatus status = AccountStatus.ACTIVE;
    final Instant createdAt;
    Instant updatedAt = Instant.now();
    UserAccount(String email, String passwordHash, String fullName, String studentCode, String phone) {
      this(UUID.randomUUID().toString(), email, passwordHash, fullName, studentCode, phone, Instant.now(), Instant.now(), AccountStatus.ACTIVE);
    }
    UserAccount(String id, String email, String passwordHash, String fullName, String studentCode, String phone, Instant createdAt, Instant updatedAt, AccountStatus status) {
      this.id = id; this.createdAt = createdAt; this.updatedAt = updatedAt; this.status = status;
      this.email = email; this.passwordHash = passwordHash; this.fullName = fullName;
      this.studentCode = studentCode; this.phone = phone;
    }
    Map<String, Object> view() { return Map.of("userId", id, "email", email, "fullName", fullName, "studentCode", studentCode == null ? "" : studentCode, "phone", phone == null ? "" : phone, "status", status, "createdAt", createdAt, "updatedAt", updatedAt); }
  }

  static final class Club {
    final String id;
    final String code;
    String name;
    String description;
    String field;
    String contactEmail;
    boolean active = true;
    final Instant createdAt;
    Instant updatedAt = Instant.now();
    Club(String code, String name, String description, String field, String contactEmail) { this(UUID.randomUUID().toString(), code, name, description, field, contactEmail, true, Instant.now(), Instant.now()); }
    Club(String id, String code, String name, String description, String field, String contactEmail, boolean active, Instant createdAt, Instant updatedAt) { this.id = id; this.code = code; this.name = name; this.description = description; this.field = field; this.contactEmail = contactEmail; this.active = active; this.createdAt = createdAt; this.updatedAt = updatedAt; }
    Map<String, Object> view() { return Map.of("clubId", id, "code", code, "name", name, "description", description == null ? "" : description, "field", field == null ? "" : field, "contactEmail", contactEmail == null ? "" : contactEmail, "status", active ? "active" : "inactive", "createdAt", createdAt, "updatedAt", updatedAt); }
  }

  static final class Department {
    final String id;
    final String clubId;
    final String name;
    String description;
    boolean active = true;
    final Instant createdAt;
    Department(String clubId, String name, String description) { this(UUID.randomUUID().toString(), clubId, name, description, true, Instant.now()); }
    Department(String id, String clubId, String name, String description, boolean active, Instant createdAt) { this.id = id; this.clubId = clubId; this.name = name; this.description = description; this.active = active; this.createdAt = createdAt; }
    Map<String, Object> view() { return Map.of("departmentId", id, "clubId", clubId, "name", name, "description", description == null ? "" : description, "status", active ? "active" : "inactive", "createdAt", createdAt); }
  }

  record Grant(String permission, Scope scope, String resourceId) {}
  record Membership(String id, String userId, String clubId, MembershipStatus status, Instant joinedAt) {}
  record DepartmentMember(String id, String departmentId, String membershipId, Instant joinedAt) {}
  record Session(String userId, Instant expiresAt) {}

  @Component
  static class Store {
    final Map<String, UserAccount> users = new ConcurrentHashMap<>();
    final Map<String, Club> clubs = new ConcurrentHashMap<>();
    final Map<String, Set<Grant>> grants = new ConcurrentHashMap<>();
    final Map<String, Session> sessions = new ConcurrentHashMap<>();
    final Map<String, Membership> memberships = new ConcurrentHashMap<>();
    final Map<String, Department> departments = new ConcurrentHashMap<>();
    final Map<String, DepartmentMember> departmentMembers = new ConcurrentHashMap<>();
    final PasswordEncoder encoder;
    final JdbcTemplate jdbc;
    Store(PasswordEncoder encoder, JdbcTemplate jdbc) { this.encoder = encoder; this.jdbc = jdbc; }
    @PostConstruct void seed() {
      load();
      UserAccount manager = users.values().stream().filter(user -> user.email.equalsIgnoreCase("manager@vju.ac.vn")).findFirst().orElse(null);
      if (manager == null) {
        manager = new UserAccount("manager@vju.ac.vn", encoder.encode("Vju@123456"), "VJU Manager", "VJU0001", "0900000000");
        users.put(manager.id, manager); saveUser(manager);
      }
      Set<Grant> managerGrants = new HashSet<>(Set.of(
          new Grant("user.view", Scope.GLOBAL, null),
          new Grant("club.view", Scope.GLOBAL, null), new Grant("club.create", Scope.GLOBAL, null), new Grant("club.update", Scope.GLOBAL, null),
          new Grant("club.active", Scope.GLOBAL, null), new Grant("club.inactive", Scope.GLOBAL, null), new Grant("member.view", Scope.GLOBAL, null),
          new Grant("member.add", Scope.GLOBAL, null), new Grant("member.update", Scope.GLOBAL, null), new Grant("member.remove", Scope.GLOBAL, null),
          new Grant("department.view", Scope.GLOBAL, null), new Grant("department.create", Scope.GLOBAL, null), new Grant("department.update", Scope.GLOBAL, null),
          new Grant("department.active", Scope.GLOBAL, null), new Grant("department.inactive", Scope.GLOBAL, null), new Grant("department.member.view", Scope.GLOBAL, null),
          new Grant("department.member.add", Scope.GLOBAL, null), new Grant("department.member.remove", Scope.GLOBAL, null),
          new Grant("permission.view", Scope.GLOBAL, null), new Grant("permission.assign", Scope.GLOBAL, null), new Grant("permission.revoke", Scope.GLOBAL, null)));
      String managerId = manager.id;
      Set<Grant> currentManagerGrants = grants.computeIfAbsent(managerId, ignored -> new HashSet<>());
      managerGrants.stream().filter(currentManagerGrants::add).forEach(grant -> saveGrant(managerId, grant));
      if (clubs.isEmpty()) seedDemoWorkspace(manager);
    }
    void seedDemoWorkspace(UserAccount manager) {
      Club club = new Club("VJUA", "VJU Association", "Cộng đồng sinh viên Trường Đại học Việt Nhật", "Cộng đồng sinh viên", "club@vju.ac.vn");
      clubs.put(club.id, club); saveClub(club);
      Membership membership = new Membership(UUID.randomUUID().toString(), manager.id, club.id, MembershipStatus.ACTIVE, Instant.now());
      memberships.put(membership.id(), membership); saveMembership(membership);
      for (String name : List.of("Ban Truyền thông", "Ban Hậu cần", "Ban Đối ngoại")) {
        Department department = new Department(club.id, name, "Phụ trách hoạt động " + name.toLowerCase(Locale.ROOT));
        departments.put(department.id, department); saveDepartment(department);
        if (name.equals("Ban Truyền thông")) {
          DepartmentMember departmentMember = new DepartmentMember(UUID.randomUUID().toString(), department.id, membership.id(), Instant.now());
          departmentMembers.put(departmentMember.id(), departmentMember); saveDepartmentMember(departmentMember);
        }
      }
    }
    void load() {
      jdbc.query("SELECT id,email,password_hash,full_name,student_code,phone,status,created_at,updated_at FROM users", (RowCallbackHandler) rs -> {
        UserAccount user = new UserAccount(rs.getString("id"), rs.getString("email"), rs.getString("password_hash"), rs.getString("full_name"), rs.getString("student_code"), rs.getString("phone"), instant(rs, "created_at"), instant(rs, "updated_at"), AccountStatus.valueOf(rs.getString("status")));
        users.put(user.id, user);
      });
      jdbc.query("SELECT id,code,name,description,field,contact_email,active,created_at,updated_at FROM clubs", (RowCallbackHandler) rs -> {
        Club club = new Club(rs.getString("id"), rs.getString("code"), rs.getString("name"), rs.getString("description"), rs.getString("field"), rs.getString("contact_email"), rs.getBoolean("active"), instant(rs, "created_at"), instant(rs, "updated_at"));
        clubs.put(club.id, club);
      });
      jdbc.query("SELECT id,user_id,club_id,status,joined_at FROM memberships", (RowCallbackHandler) rs -> memberships.put(rs.getString("id"), new Membership(rs.getString("id"), rs.getString("user_id"), rs.getString("club_id"), MembershipStatus.valueOf(rs.getString("status")), instant(rs, "joined_at"))));
      jdbc.query("SELECT id,club_id,name,description,active,created_at FROM departments", (RowCallbackHandler) rs -> {
        Department department = new Department(rs.getString("id"), rs.getString("club_id"), rs.getString("name"), rs.getString("description"), rs.getBoolean("active"), instant(rs, "created_at"));
        departments.put(department.id, department);
      });
      jdbc.query("SELECT id,department_id,membership_id,joined_at FROM department_members", (RowCallbackHandler) rs -> departmentMembers.put(rs.getString("id"), new DepartmentMember(rs.getString("id"), rs.getString("department_id"), rs.getString("membership_id"), instant(rs, "joined_at"))));
      jdbc.query("SELECT user_id,permission,scope,resource_id FROM permission_grants", (RowCallbackHandler) rs -> grants.computeIfAbsent(rs.getString("user_id"), ignored -> new HashSet<>()).add(new Grant(rs.getString("permission"), Scope.valueOf(rs.getString("scope")), rs.getString("resource_id").isEmpty() ? null : rs.getString("resource_id"))));
    }
    Instant instant(java.sql.ResultSet rs, String column) throws java.sql.SQLException { return rs.getTimestamp(column).toInstant(); }
    java.sql.Timestamp timestamp(Instant value) { return java.sql.Timestamp.from(value); }
    void saveUser(UserAccount user) { jdbc.update("INSERT INTO users (id,email,password_hash,full_name,student_code,phone,status,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET email=?,password_hash=?,full_name=?,student_code=?,phone=?,status=?,updated_at=?", user.id, user.email, user.passwordHash, user.fullName, user.studentCode, user.phone, user.status.name(), timestamp(user.createdAt), timestamp(user.updatedAt), user.email, user.passwordHash, user.fullName, user.studentCode, user.phone, user.status.name(), timestamp(user.updatedAt)); }
    void saveClub(Club club) { jdbc.update("INSERT INTO clubs (id,code,name,description,field,contact_email,active,created_at,updated_at) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET code=?,name=?,description=?,field=?,contact_email=?,active=?,updated_at=?", club.id, club.code, club.name, club.description, club.field, club.contactEmail, club.active, timestamp(club.createdAt), timestamp(club.updatedAt), club.code, club.name, club.description, club.field, club.contactEmail, club.active, timestamp(club.updatedAt)); }
    void saveMembership(Membership membership) { jdbc.update("INSERT INTO memberships (id,user_id,club_id,status,joined_at) VALUES (?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET status=?", membership.id(), membership.userId(), membership.clubId(), membership.status().name(), timestamp(membership.joinedAt()), membership.status().name()); }
    void saveDepartment(Department department) { jdbc.update("INSERT INTO departments (id,club_id,name,description,active,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT (id) DO UPDATE SET name=?,description=?,active=?", department.id, department.clubId, department.name, department.description, department.active, timestamp(department.createdAt), department.name, department.description, department.active); }
    void saveDepartmentMember(DepartmentMember member) { jdbc.update("INSERT INTO department_members (id,department_id,membership_id,joined_at) VALUES (?,?,?,?) ON CONFLICT (id) DO NOTHING", member.id(), member.departmentId(), member.membershipId(), timestamp(member.joinedAt())); }
    void saveGrant(String userId, Grant grant) { jdbc.update("INSERT INTO permission_grants (user_id,permission,scope,resource_id) VALUES (?,?,?,?) ON CONFLICT DO NOTHING", userId, grant.permission(), grant.scope().name(), grant.resourceId() == null ? "" : grant.resourceId()); }
    void deleteGrant(String userId, Grant grant) { jdbc.update("DELETE FROM permission_grants WHERE user_id=? AND permission=? AND scope=? AND resource_id=?", userId, grant.permission(), grant.scope().name(), grant.resourceId() == null ? "" : grant.resourceId()); }
  }

  @Configuration
  static class SecurityConfig {
    @Bean PasswordEncoder passwordEncoder() { return new BCryptPasswordEncoder(); }
    @Bean CorsConfigurationSource corsConfigurationSource() {
      CorsConfiguration configuration = new CorsConfiguration();
      configuration.setAllowedOrigins(List.of("http://localhost:3000", "http://127.0.0.1:3000"));
      configuration.setAllowedMethods(List.of("GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"));
      configuration.setAllowedHeaders(List.of("Authorization", "Content-Type"));
      configuration.setAllowCredentials(true);
      UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
      source.registerCorsConfiguration("/**", configuration);
      return source;
    }
    @Bean SecurityFilterChain securityFilterChain(HttpSecurity http) throws Exception {
      return http.csrf(csrf -> csrf.disable()).cors(cors -> {}).authorizeHttpRequests(auth -> auth.anyRequest().permitAll()).build();
    }
  }

  @Component
  static class Auth {
    final Store store; final PasswordEncoder encoder;
    Auth(Store store, PasswordEncoder encoder) { this.store = store; this.encoder = encoder; }
    UserAccount current(HttpServletRequest request) {
      String header = request.getHeader("Authorization");
      if (header == null || !header.startsWith("Bearer ")) throw error(HttpStatus.UNAUTHORIZED, "Missing bearer token");
      Session session = store.sessions.get(header.substring(7));
      if (session == null || session.expiresAt().isBefore(Instant.now())) throw error(HttpStatus.UNAUTHORIZED, "Token is invalid or expired");
      UserAccount user = store.users.get(session.userId());
      if (user == null || user.status != AccountStatus.ACTIVE) throw error(HttpStatus.FORBIDDEN, "Account is inactive");
      return user;
    }
    String issue(UserAccount user) { String token = UUID.randomUUID().toString(); store.sessions.put(token, new Session(user.id, Instant.now().plusSeconds(3600))); return token; }
    UserAccount register(RegisterRequest input) {
      if (store.users.values().stream().anyMatch(user -> user.email.equalsIgnoreCase(input.email()))) throw error(HttpStatus.CONFLICT, "Email is already registered");
      UserAccount user = new UserAccount(input.email().toLowerCase(Locale.ROOT), encoder.encode(input.password()), input.fullName(), input.studentCode(), input.phone());
      store.users.put(user.id, user); store.saveUser(user); Set<Grant> defaultGrants = new HashSet<>(Set.of(new Grant("club.view", Scope.GLOBAL, null), new Grant("member.view", Scope.GLOBAL, null))); store.grants.put(user.id, defaultGrants); defaultGrants.forEach(grant -> store.saveGrant(user.id, grant)); return user;
    }
    static ResponseStatusException error(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
  }

  @Component
  static class Permissions {
    final Store store; Permissions(Store store) { this.store = store; }
    void require(UserAccount user, String permission, Scope scope, String resourceId) {
      if (!allows(user, permission, scope, resourceId)) throw Auth.error(HttpStatus.FORBIDDEN, "Permission required: " + permission);
    }
    boolean allows(UserAccount user, String permission, Scope scope, String resourceId) { return store.grants.getOrDefault(user.id, Set.of()).stream().anyMatch(grant -> grant.permission().equals(permission) && (grant.scope() == Scope.GLOBAL || (grant.scope() == scope && Objects.equals(grant.resourceId(), resourceId)))); }
    void grant(UserAccount actor, String targetId, String permission, Scope scope, String resourceId) { require(actor, "permission.assign", scope, resourceId); if (actor.id.equals(targetId)) throw Auth.error(HttpStatus.FORBIDDEN, "Cannot grant permission to yourself"); Grant grant = new Grant(permission, scope, resourceId); store.grants.computeIfAbsent(targetId, ignored -> new HashSet<>()).add(grant); store.saveGrant(targetId, grant); }
    void revoke(UserAccount actor, String targetId, String permission, Scope scope, String resourceId) { require(actor, "permission.revoke", scope, resourceId); Grant grant = new Grant(permission, scope, resourceId); store.grants.getOrDefault(targetId, new HashSet<>()).remove(grant); store.deleteGrant(targetId, grant); }
  }

  record RegisterRequest(@Email @NotBlank String email, @NotBlank String password, @NotBlank String fullName, String studentCode, String phone) {}
  record LoginRequest(@Email @NotBlank String email, @NotBlank String password) {}
  record ProfileRequest(@NotBlank String fullName, String phone) {}
  record ClubRequest(@NotBlank String code, @NotBlank String name, String description, String field, @Email String contactEmail) {}
  record ClubUpdateRequest(@NotBlank String name, String description, String field, @Email String contactEmail) {}
  record DepartmentRequest(@NotBlank String name, String description) {}
  record MemberRequest(@NotBlank String userId) {}
  record PermissionRequest(@NotBlank String permission, Scope scope, String resourceId) {}

  @RestController @RequestMapping("/api/auth")
  static class AuthController {
    final Store store; final Auth auth;
    AuthController(Store store, Auth auth) { this.store = store; this.auth = auth; }
    @PostMapping("/register") Map<String, Object> register(@Valid @RequestBody RegisterRequest request) { UserAccount user = auth.register(request); return Map.of("user", user.view(), "accessToken", auth.issue(user)); }
    @PostMapping("/login") Map<String, Object> login(@Valid @RequestBody LoginRequest request) { UserAccount user = store.users.values().stream().filter(candidate -> candidate.email.equalsIgnoreCase(request.email())).findFirst().orElseThrow(() -> Auth.error(HttpStatus.UNAUTHORIZED, "Invalid email or password")); if (user.status != AccountStatus.ACTIVE || !auth.encoder.matches(request.password(), user.passwordHash)) throw Auth.error(HttpStatus.UNAUTHORIZED, "Invalid email or password"); return Map.of("user", user.view(), "accessToken", auth.issue(user)); }
    @PostMapping("/logout") Map<String, String> logout(HttpServletRequest request) { String header = request.getHeader("Authorization"); if (header != null) store.sessions.remove(header.substring(7)); return Map.of("message", "Logged out"); }
    @GetMapping("/me") Map<String, Object> me(HttpServletRequest request) { return auth.current(request).view(); }
    @PatchMapping("/me") Map<String, Object> update(@Valid @RequestBody ProfileRequest input, HttpServletRequest request) { UserAccount user = auth.current(request); user.fullName = input.fullName(); user.phone = input.phone(); user.updatedAt = Instant.now(); store.saveUser(user); return user.view(); }
  }

  @RestController @RequestMapping("/api/users")
  static class UserController {
    final Store store; final Auth auth; final Permissions permissions;
    UserController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping List<Map<String, Object>> list(HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "user.view", Scope.GLOBAL, null); return store.users.values().stream().map(user -> { Map<String, Object> summary = new HashMap<>(); summary.put("userId", user.id); summary.put("email", user.email); summary.put("fullName", user.fullName); summary.put("status", user.status); return summary; }).toList(); }
  }

  @RestController @RequestMapping("/api/memberships")
  static class MembershipController {
    final Store store; final Auth auth; final Permissions permissions;
    MembershipController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping("/me") List<Map<String, Object>> mine(HttpServletRequest request) {
      UserAccount user = auth.current(request);
      if (!permissions.allows(user, "club.view", Scope.GLOBAL, null) && !permissions.allows(user, "member.view", Scope.GLOBAL, null)) throw Auth.error(HttpStatus.FORBIDDEN, "Permission required: club.view or member.view");
      return store.memberships.values().stream().filter(membership -> membership.userId().equals(user.id)).map(membership -> {
        Map<String, Object> item = new HashMap<>();
        item.put("membershipId", membership.id()); item.put("club", store.clubs.get(membership.clubId()).view()); item.put("status", membership.status());
        List<Map<String, Object>> ownDepartments = store.departmentMembers.values().stream().filter(link -> link.membershipId().equals(membership.id())).map(link -> store.departments.get(link.departmentId()).view()).toList();
        item.put("departments", ownDepartments); return item;
      }).toList();
    }
  }

  @RestController
  static class RootController {
    @GetMapping("/") Map<String, Object> status() {
      return Map.of(
          "service", "VJU Clubs API",
          "status", "UP",
          "version", "0.1.0",
          "frontend", "http://localhost:3000",
          "api", Map.of("login", "/api/auth/login", "permissionCatalog", "/api/permissions/catalog"));
    }
  }

  @RestController @RequestMapping("/api/clubs")
  static class ClubController {
    final Store store; final Auth auth; final Permissions permissions;
    ClubController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping List<Map<String, Object>> list(HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "club.view", Scope.GLOBAL, null); return store.clubs.values().stream().map(Club::view).toList(); }
    @PostMapping Map<String, Object> create(@Valid @RequestBody ClubRequest input, HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "club.create", Scope.GLOBAL, null); if (store.clubs.values().stream().anyMatch(club -> club.code.equalsIgnoreCase(input.code()))) throw Auth.error(HttpStatus.CONFLICT, "Club code already exists"); Club club = new Club(input.code(), input.name(), input.description(), input.field(), input.contactEmail()); store.clubs.put(club.id, club); store.saveClub(club); return club.view(); }
    @GetMapping("/{clubId}") Map<String, Object> get(@PathVariable String clubId, HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "club.view", Scope.CLUB, clubId); return club(clubId).view(); }
    @PatchMapping("/{clubId}") Map<String, Object> update(@PathVariable String clubId, @Valid @RequestBody ClubUpdateRequest input, HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "club.update", Scope.CLUB, clubId); Club club = club(clubId); club.name = input.name(); club.description = input.description(); club.field = input.field(); club.contactEmail = input.contactEmail(); club.updatedAt = Instant.now(); store.saveClub(club); return club.view(); }
    @PostMapping("/{clubId}/members") Map<String, Object> addMember(@PathVariable String clubId, @Valid @RequestBody MemberRequest input, HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "member.add", Scope.CLUB, clubId); if (!store.users.containsKey(input.userId())) throw Auth.error(HttpStatus.NOT_FOUND, "User not found"); if (store.memberships.values().stream().anyMatch(member -> member.clubId().equals(clubId) && member.userId().equals(input.userId()) && member.status() == MembershipStatus.ACTIVE)) throw Auth.error(HttpStatus.CONFLICT, "User is already a member"); Membership membership = new Membership(UUID.randomUUID().toString(), input.userId(), clubId, MembershipStatus.ACTIVE, Instant.now()); store.memberships.put(membership.id(), membership); store.saveMembership(membership); return membershipView(membership); }
    @GetMapping("/{clubId}/members") List<Map<String, Object>> members(@PathVariable String clubId, HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "member.view", Scope.CLUB, clubId); return store.memberships.values().stream().filter(member -> member.clubId().equals(clubId)).map(this::membershipView).toList(); }
    Club club(String id) { Club club = store.clubs.get(id); if (club == null) throw Auth.error(HttpStatus.NOT_FOUND, "Club not found"); return club; }
    Map<String, Object> membershipView(Membership member) { return Map.of("membershipId", member.id(), "userId", member.userId(), "clubId", member.clubId(), "status", member.status(), "joinedAt", member.joinedAt()); }
  }

  @RestController @RequestMapping("/api/clubs/{clubId}/departments")
  static class DepartmentController {
    final Store store; final Auth auth; final Permissions permissions;
    DepartmentController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping List<Map<String, Object>> list(@PathVariable String clubId, HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "department.view", Scope.CLUB, clubId); requireClub(clubId); return store.departments.values().stream().filter(department -> department.clubId.equals(clubId)).map(Department::view).toList(); }
    @PostMapping Map<String, Object> create(@PathVariable String clubId, @Valid @RequestBody DepartmentRequest input, HttpServletRequest request) { UserAccount user = auth.current(request); permissions.require(user, "department.create", Scope.CLUB, clubId); requireClub(clubId); Department department = new Department(clubId, input.name(), input.description()); store.departments.put(department.id, department); store.saveDepartment(department); return department.view(); }
    @PostMapping("/{departmentId}/members") Map<String, Object> addMember(@PathVariable String clubId, @PathVariable String departmentId, @Valid @RequestBody MemberRequest input, HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "department.member.add", Scope.DEPARTMENT, departmentId); Department department = department(departmentId, clubId); Membership membership = store.memberships.values().stream().filter(candidate -> candidate.clubId().equals(clubId) && candidate.userId().equals(input.userId()) && candidate.status() == MembershipStatus.ACTIVE).findFirst().orElseThrow(() -> Auth.error(HttpStatus.NOT_FOUND, "Active club membership not found")); if (store.departmentMembers.values().stream().anyMatch(member -> member.departmentId().equals(department.id) && member.membershipId().equals(membership.id()))) throw Auth.error(HttpStatus.CONFLICT, "Member is already in this department"); DepartmentMember member = new DepartmentMember(UUID.randomUUID().toString(), department.id, membership.id(), Instant.now()); store.departmentMembers.put(member.id(), member); store.saveDepartmentMember(member); return departmentMemberView(member, membership); }
    @GetMapping("/{departmentId}/members") List<Map<String, Object>> members(@PathVariable String clubId, @PathVariable String departmentId, HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "department.member.view", Scope.DEPARTMENT, departmentId); department(departmentId, clubId); return store.departmentMembers.values().stream().filter(member -> member.departmentId().equals(departmentId)).map(member -> departmentMemberView(member, store.memberships.get(member.membershipId()))).toList(); }
    Department department(String departmentId, String clubId) { Department department = store.departments.get(departmentId); if (department == null || !department.clubId.equals(clubId)) throw Auth.error(HttpStatus.NOT_FOUND, "Department not found"); return department; }
    void requireClub(String clubId) { if (!store.clubs.containsKey(clubId)) throw Auth.error(HttpStatus.NOT_FOUND, "Club not found"); }
    Map<String, Object> departmentMemberView(DepartmentMember member, Membership membership) { return Map.of("departmentMemberId", member.id(), "departmentId", member.departmentId(), "membershipId", member.membershipId(), "userId", membership.userId(), "joinedAt", member.joinedAt()); }
  }

  @RestController @RequestMapping("/api/permissions")
  static class PermissionController {
    final Store store; final Auth auth; final Permissions permissions;
    PermissionController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping("/catalog") List<String> catalog() { return List.of("user.view", "user.update", "user.active", "user.inactive", "club.view", "club.create", "club.update", "club.active", "club.inactive", "member.view", "member.view_detail", "member.add", "member.update", "member.remove", "department.view", "department.create", "department.update", "department.active", "department.inactive", "department.member.view", "department.member.add", "department.member.remove", "permission.view", "permission.assign", "permission.revoke"); }
    @GetMapping("/me") List<Grant> myPermissions(HttpServletRequest request) { UserAccount actor = auth.current(request); return new ArrayList<>(store.grants.getOrDefault(actor.id, Set.of())); }
    @GetMapping("/users/{userId}") List<Grant> userPermissions(@PathVariable String userId, HttpServletRequest request) { UserAccount actor = auth.current(request); permissions.require(actor, "permission.view", Scope.GLOBAL, null); return new ArrayList<>(store.grants.getOrDefault(userId, Set.of())); }
    @PostMapping("/users/{userId}") Map<String, String> grant(@PathVariable String userId, @Valid @RequestBody PermissionRequest request, HttpServletRequest http) { UserAccount actor = auth.current(http); if (!store.users.containsKey(userId)) throw Auth.error(HttpStatus.NOT_FOUND, "User not found"); permissions.grant(actor, userId, request.permission(), request.scope() == null ? Scope.GLOBAL : request.scope(), request.resourceId()); return Map.of("message", "Permission granted"); }
    @DeleteMapping("/users/{userId}") Map<String, String> revoke(@PathVariable String userId, @Valid @RequestBody PermissionRequest request, HttpServletRequest http) { UserAccount actor = auth.current(http); permissions.revoke(actor, userId, request.permission(), request.scope() == null ? Scope.GLOBAL : request.scope(), request.resourceId()); return Map.of("message", "Permission revoked"); }
  }

  @RestController @RequestMapping("/api/activity")
  static class ActivityController {
    final Store store; final Auth auth; final Permissions permissions;
    ActivityController(Store store, Auth auth, Permissions permissions) { this.store = store; this.auth = auth; this.permissions = permissions; }
    @GetMapping List<Map<String, Object>> list(HttpServletRequest request) {
      UserAccount user = auth.current(request);
      if (!permissions.allows(user, "club.view", Scope.GLOBAL, null)) throw Auth.error(HttpStatus.FORBIDDEN, "Permission required: club.view");
      List<Map<String, Object>> events = new ArrayList<>();
      store.clubs.values().forEach(club -> events.add(Map.of("type", "club.created", "title", "Câu lạc bộ được tạo", "subject", club.name, "at", club.createdAt)));
      store.departments.values().forEach(department -> events.add(Map.of("type", "department.created", "title", "Ban được tạo", "subject", department.name, "at", department.createdAt)));
      store.memberships.values().forEach(member -> events.add(Map.of("type", "member.joined", "title", "Thành viên tham gia câu lạc bộ", "subject", member.userId(), "at", member.joinedAt())));
      return events.stream().sorted((left, right) -> ((Instant) right.get("at")).compareTo((Instant) left.get("at"))).limit(20).toList();
    }
  }
}
