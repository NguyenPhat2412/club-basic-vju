package com.vju.club.integration;

import com.vju.club.modules.club.entity.Club;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.session.jdbc.JdbcIndexedSessionRepository;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.web.context.WebApplicationContext;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@ActiveProfiles("test")
public class PostgresApiTest {
    private static final String SCHEMA = "test_api_" + UUID.randomUUID().toString().replace("-", "");
    @DynamicPropertySource
    static void databaseSchema(DynamicPropertyRegistry properties) {
        TestDatabase.register(properties);
        properties.add("spring.flyway.schemas", () -> SCHEMA);
        properties.add("spring.flyway.default-schema", () -> SCHEMA);
        properties.add("spring.jpa.properties.hibernate.default_schema", () -> SCHEMA);
        properties.add("spring.datasource.hikari.connection-init-sql", () -> "SET search_path TO " + SCHEMA);
    }
    @Autowired WebApplicationContext context;
    @Autowired JdbcTemplate db;
    @Autowired PasswordEncoder passwords;
    @Autowired JdbcIndexedSessionRepository sessions;
    private MockMvc mvc;
    private final ObjectMapper json = new ObjectMapper();
    private UUID admin, member, a, b, da, da2, dban;
    private String adminToken, memberToken;
    private static final String PASSWORD = "Password123!";

    @BeforeEach
    void setup() {
        mvc = TestSessions.mockMvc(context);
        db.execute("TRUNCATE users, clubs, spring_session CASCADE");
        db.update("UPDATE permissions SET active=true");
        admin = user("admin@test.local"); member = user("member@test.local");
        for (UUID permission : db.queryForList("SELECT id FROM permissions", UUID.class)) {
            db.update("INSERT INTO user_permissions(user_id,permission_id,scope,granted_by) VALUES (?,?,'GLOBAL',?)", admin, permission, admin);
        }
        a = club("A"); b = club("B"); da = department(a,"A1"); da2 = department(a,"A2"); dban = department(b,"B1");
        adminToken = token(admin); memberToken = token(member);
    }
    private UUID user(String email) {
        UUID id = UUID.randomUUID();
        db.update("INSERT INTO users(id,email,password_hash,full_name) VALUES (?,?,?,?)",id,email,passwords.encode(PASSWORD),email);
        return id;
    }
    private UUID club(String code) {
        UUID id=UUID.randomUUID(); db.update("INSERT INTO clubs(id,code,name) VALUES (?,?,?)",id,code,"Club "+code); return id;
    }
    private UUID department(UUID clubId,String name) {
        UUID id=UUID.randomUUID(); db.update("INSERT INTO departments(id,club_id,name) VALUES (?,?,?)",id,clubId,name); return id;
    }
    private String token(UUID id) { return TestSessions.signedIn(sessions, id); }
    private String login(String email, String password) throws Exception {
        var request = post("/api/v1/auth/login").contentType("application/json")
                .content(json.writeValueAsString(Map.of("email", email, "password", password)));
        TestSessions.attach(request, null);
        var response = mvc.perform(request).andReturn().getResponse();
        assertThat(response.getStatus()).as(response.getContentAsString()).isEqualTo(200);
        return TestSessions.fromResponse(response);
    }
    private UUID permission(String key) { return db.queryForObject("SELECT id FROM permissions WHERE permission_key=?",UUID.class,key); }
    private void grant(UUID user,String key,String scope,UUID club,UUID dept) {
        db.update("INSERT INTO user_permissions(user_id,permission_id,scope,club_id,department_id,granted_by) VALUES (?,?,?,?,?,?)",user,permission(key),scope,club,dept,admin);
    }
    private Map<String,Object> assignment(String key,String scope,UUID club,UUID dept) {
        Map<String,Object> body=new LinkedHashMap<>(); body.put("permissionId",permission(key)); body.put("scope",scope);
        if(club!=null)body.put("clubId",club); if(dept!=null)body.put("departmentId",dept); return body;
    }
    private JsonNode call(MockHttpServletRequestBuilder req,String session,Object body,int status) throws Exception {
        TestSessions.attach(req, session);
        if(body!=null)req.contentType("application/json").content(json.writeValueAsString(body));
        var result = mvc.perform(req).andReturn();
        var response = result.getResponse();
        assertThat(response.getStatus()).as("%s %s: %s", req.buildRequest(context.getServletContext()).getMethod(),
                req.buildRequest(context.getServletContext()).getRequestURI(), response.getContentAsString()).isEqualTo(status);
        String content=response.getContentAsString();
        return content.isEmpty()?json.nullNode():json.readTree(content);
    }
    private UUID id(JsonNode response) { return UUID.fromString(response.path("id").asText()); }

    @Test
    void registrationLoginLogoutAndInvalidSession() throws Exception {
        var reg=Map.of("email"," New@Test.Local ".trim(),"password",PASSWORD,"fullName","New User");
        JsonNode created=call(post("/api/v1/users"), adminToken,reg,201);
        assertThat(created.has("passwordHash")).isFalse();
        String stored=db.queryForObject("SELECT password_hash FROM users WHERE id=?",String.class,id(created));
        assertThat(passwords.matches(PASSWORD,stored)).isTrue();
        assertThat(call(post("/api/v1/users"), adminToken,reg,409).path("code").asText()).isEqualTo("EMAIL_ALREADY_EXISTS");
        call(post("/api/v1/users"), adminToken,Map.of("email","bad","password","short","fullName"," "),400);
        call(post("/api/v1/auth/login"),null,Map.of("email","new@test.local","password","wrong"),401);
        String session=login("new@test.local",PASSWORD);
        call(get("/api/v1/auth/me"),session,null,200);
        assertThat(db.queryForObject("SELECT count(*) FROM spring_session WHERE principal_name=?",Integer.class,
                id(created).toString())).isEqualTo(1);
        call(post("/api/v1/auth/logout"),session,null,204);
        call(get("/api/v1/auth/me"),session,null,401);
        assertThat(db.queryForObject("SELECT count(*) FROM spring_session WHERE principal_name=?",Integer.class,
                id(created).toString())).isZero();
        assertThat(call(get("/api/v1/auth/me"),"invalid",null,401).path("code").asText()).isEqualTo("UNAUTHORIZED");
        call(get("/api/v1/auth/me"),null,null,401);
    }
    @Test
    void profileAdministrationValidationAndInactiveAccess() throws Exception {
        call(get("/api/v1/users/me"),memberToken,null,200);
        var updated=call(patch("/api/v1/users/me"),memberToken,Map.of("fullName","Updated","phone","123"),200);
        assertThat(updated.path("fullName").asText()).isEqualTo("Updated");
        call(patch("/api/v1/users/me"),memberToken,Map.of("fullName"," "),400);
        call(patch("/api/v1/users/me"),memberToken,Map.of("status","INACTIVE"),400);
        call(get("/api/v1/users"),memberToken,null,403);
        call(get("/api/v1/users/"+member),adminToken,null,200);
        var list=call(get("/api/v1/users").param("query","Updated").param("orderBy","fullName"),adminToken,null,200);
        assertThat(list.path("total").asInt()).isEqualTo(1);
        call(get("/api/v1/users").param("orderBy","email desc; delete from users"),adminToken,null,400);
        call(get("/api/v1/users/not-uuid"),adminToken,null,400);
        call(get("/api/v1/users/"+UUID.randomUUID()),adminToken,null,404);
        call(patch("/api/v1/users/"+member+"/status"),adminToken,Map.of("status","INACTIVE"),200);
        call(get("/api/v1/auth/me"),memberToken,null,401);
        call(post("/api/v1/auth/login"),null,Map.of("email","member@test.local","password",PASSWORD),403);
    }
    @Test
    void clubScopedAccessAndImmediateRevocation() throws Exception {
        var discoverable=call(get("/api/v1/clubs"),memberToken,null,200);
        assertThat(discoverable.path("total").asInt()).isEqualTo(2);
        call(patch("/api/v1/clubs/"+a),memberToken,Map.of("name","Forbidden"),403);
        grant(member,"club.view","CLUB",a,null);
        var list=call(get("/api/v1/clubs"),memberToken,null,200);
        assertThat(list.path("total").asInt()).isEqualTo(1);
        assertThat(list.at("/items/0/id").asText()).isEqualTo(a.toString());
        call(get("/api/v1/clubs/"+a),memberToken,null,200);
        call(get("/api/v1/clubs/"+b),memberToken,null,403);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","CLUB",a,null),201);
        var updated=call(patch("/api/v1/clubs/"+a),memberToken,Map.of("name","New A"),200);
        assertThat(updated.path("code").asText()).isEqualTo("A");
        call(patch("/api/v1/clubs/"+b),memberToken,Map.of("name","Forbidden"),403);
        call(delete("/api/v1/users/"+member+"/permissions/"+permission("club.update")),adminToken,null,204);
        call(patch("/api/v1/clubs/"+a),memberToken,Map.of("name","Forbidden"),403);
        var created=call(post("/api/v1/clubs"),adminToken,Map.of("code","C","name","Club C"),201);
        call(post("/api/v1/clubs"),adminToken,Map.of("code","C","name","Duplicate"),409);
        call(patch("/api/v1/clubs/"+id(created)+"/status"),adminToken,Map.of("status","INACTIVE"),200);
    }
    @Test
    void departmentsMembershipsAndCrossClubAssignment() throws Exception {
        var dep=call(post("/api/v1/clubs/"+a+"/departments"),adminToken,Map.of("name","Media"),201);
        UUID media=id(dep);
        call(get("/api/v1/clubs/"+a+"/departments"),adminToken,null,200);
        call(get("/api/v1/departments/"+media),adminToken,null,200);
        call(patch("/api/v1/departments/"+media),adminToken,Map.of("description","Updated"),200);
        call(patch("/api/v1/departments/"+media+"/status"),adminToken,Map.of("status","INACTIVE"),200);
        call(patch("/api/v1/departments/"+media+"/status"),adminToken,Map.of("status","ACTIVE"),200);
        var membership=call(post("/api/v1/clubs/"+a+"/memberships"),adminToken,Map.of("userId",member),201);
        UUID mid=id(membership);
        call(post("/api/v1/clubs/"+a+"/memberships"),adminToken,Map.of("userId",member),409);
        call(get("/api/v1/clubs/"+a+"/memberships"),adminToken,null,200);
        call(get("/api/v1/memberships/"+mid),adminToken,null,200);
        call(post("/api/v1/departments/"+media+"/members"),adminToken,Map.of("membershipId",mid),201);
        call(post("/api/v1/departments/"+media+"/members"),adminToken,Map.of("membershipId",mid),409);
        call(post("/api/v1/departments/"+dban+"/members"),adminToken,Map.of("membershipId",mid),400);
        call(get("/api/v1/departments/"+media+"/members"),adminToken,null,200);
        grant(member,"department.member.view","DEPARTMENT",null,media);
        call(get("/api/v1/departments/"+media+"/members"),memberToken,null,200);
        call(get("/api/v1/departments/"+da+"/members"),memberToken,null,403);
        call(delete("/api/v1/departments/"+media+"/members/"+mid),adminToken,null,204);
        call(patch("/api/v1/memberships/"+mid),adminToken,Map.of("status","SUSPENDED"),200);
        call(post("/api/v1/departments/"+media+"/members"),adminToken,Map.of("membershipId",mid),409);
        call(delete("/api/v1/memberships/"+mid),adminToken,null,204);
        assertThat(db.queryForObject("SELECT status FROM memberships WHERE id=?",String.class,mid)).isEqualTo("LEFT");
        assertThat(db.queryForObject("SELECT left_at IS NOT NULL FROM memberships WHERE id=?",Boolean.class,mid)).isTrue();
    }
    @Test
    void grantScopeValidationAuditAndPreciseRevoke() throws Exception {
        call(get("/api/v1/permissions"),memberToken,null,403);
        call(get("/api/v1/permissions"),adminToken,null,200);
        call(post("/api/v1/users/"+member+"/permissions"),memberToken,assignment("permission.assign","GLOBAL",null,null),403);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","CLUB",null,null),400);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("user.view","CLUB",a,null),400);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","CLUB",a,null),201);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","CLUB",b,null),201);
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","CLUB",a,null),409);
        call(get("/api/v1/users/"+member+"/permissions"),adminToken,null,200);
        String path="/api/v1/users/"+member+"/permissions/"+permission("club.update");
        call(delete(path),adminToken,null,400);
        call(delete(path).param("scope","CLUB").param("clubId",a.toString()),adminToken,null,204);
        call(patch("/api/v1/clubs/"+a),memberToken,Map.of("name","denied"),403);
        call(patch("/api/v1/clubs/"+b),memberToken,Map.of("name","allowed"),200);
        assertThat(db.queryForObject("SELECT count(*) FROM permission_audit_logs WHERE target_user_id=?",Integer.class,member)).isEqualTo(3);
        db.update("UPDATE permissions SET active=false WHERE permission_key='club.update'");
        call(patch("/api/v1/clubs/"+b),memberToken,Map.of("name","denied"),403);
    }

    @Test
    void departmentPermissionUsesDepartmentIdAndStatusSpecificAction() throws Exception {
        grant(member,"department.update","DEPARTMENT",null,da);
        call(patch("/api/v1/departments/"+da),memberToken,Map.of("name","Edited"),200);
        call(patch("/api/v1/departments/"+da2),memberToken,Map.of("name","Denied"),403);
        grant(member,"department.activate","DEPARTMENT",null,da);
        call(patch("/api/v1/departments/"+da+"/status"),memberToken,Map.of("status","INACTIVE"),403);
        grant(member,"department.inactive","DEPARTMENT",null,da);
        call(patch("/api/v1/departments/"+da+"/status"),memberToken,Map.of("status","INACTIVE"),200);
        call(patch("/api/v1/departments/"+da+"/status"),memberToken,Map.of("status","ACTIVE"),200);
    }

    @Test
    void statusPermissionsDistinguishActivationAndDeactivation() throws Exception {
        grant(member,"club.active","CLUB",a,null);
        call(patch("/api/v1/clubs/"+a+"/status"),memberToken,Map.of("status","INACTIVE"),403);
        grant(member,"club.inactive","CLUB",a,null);
        call(patch("/api/v1/clubs/"+a+"/status"),memberToken,Map.of("status","INACTIVE"),200);
        grant(member,"user.active","GLOBAL",null,null);
        call(patch("/api/v1/users/"+admin+"/status"),memberToken,Map.of("status","INACTIVE"),403);
    }

    @Test
    void emptyFilteredClubListAndGlobalCountAreAccurate() throws Exception {
        grant(member,"club.view","CLUB",a,null);
        assertThat(call(get("/api/v1/clubs").param("query","missing"),memberToken,null,200).path("total").asLong()).isZero();
        assertThat(call(get("/api/v1/clubs").param("query","Club A"),adminToken,null,200).path("total").asLong()).isEqualTo(1);
        call(patch("/api/v1/clubs/"+a),adminToken,Map.of("name"," "),400);
        call(patch("/api/v1/departments/"+da),adminToken,Map.of("name"," "),400);
    }

    @Test
    void ownPermissionsAndGlobalGrantAreUsableWithoutPermissionView() throws Exception {
        assertThat(call(get("/api/v1/users/me/permissions"),memberToken,null,200).size()).isZero();
        call(post("/api/v1/users/"+member+"/permissions"),adminToken,assignment("club.update","GLOBAL",null,null),201);
        assertThat(call(get("/api/v1/users/me/permissions"),memberToken,null,200).get(0).path("permissionKey").asText()).isEqualTo("club.update");
        call(patch("/api/v1/clubs/"+a),memberToken,Map.of("name","A edit"),200);
        call(patch("/api/v1/clubs/"+b),memberToken,Map.of("name","B edit"),200);
        call(get("/api/v1/users/"+admin+"/permissions"),memberToken,null,403);
    }

    @Test
    void changingPasswordVerifiesOldPasswordAndEndsOtherSessions() throws Exception {
        String other=login("member@test.local",PASSWORD);
        call(post("/api/v1/auth/change-password"),memberToken,Map.of("currentPassword","wrong","newPassword","NewPassword123!"),400);
        call(post("/api/v1/auth/change-password"),memberToken,Map.of("currentPassword",PASSWORD,"newPassword","short"),400);
        call(post("/api/v1/auth/change-password"),memberToken,Map.of("currentPassword",PASSWORD,"newPassword","NewPassword123!"),204);
        call(post("/api/v1/auth/login"),null,Map.of("email","member@test.local","password",PASSWORD),401);
        call(post("/api/v1/auth/login"),null,Map.of("email","member@test.local","password","NewPassword123!"),200);
        call(get("/api/v1/auth/me"),other,null,401);
        call(get("/api/v1/auth/me"),memberToken,null,200);
    }

    @Test
    void movingDepartmentMemberIsAtomicAndRequiresBothPermissions() throws Exception {
        UUID mid=id(call(post("/api/v1/clubs/"+a+"/memberships"),adminToken,Map.of("userId",member),201));
        call(post("/api/v1/departments/"+da+"/members"),adminToken,Map.of("membershipId",mid),201);
        grant(member,"department.member.remove","DEPARTMENT",null,da);
        String path="/api/v1/departments/"+da+"/members/"+mid;
        call(patch(path),memberToken,Map.of("targetDepartmentId",da2),403);
        call(patch(path),adminToken,Map.of("targetDepartmentId",dban),400);
        assertThat(db.queryForObject("SELECT count(*) FROM department_members WHERE department_id=? AND membership_id=?",Integer.class,da,mid)).isEqualTo(1);
        grant(member,"department.member.add","DEPARTMENT",null,da2);
        call(patch(path),memberToken,Map.of("targetDepartmentId",da2),200);
        assertThat(db.queryForObject("SELECT department_id FROM department_members WHERE membership_id=?",UUID.class,mid)).isEqualTo(da2);
    }

    @Test
    void corsAllowsFrontendAndRejectsOtherOrigins() throws Exception {
        mvc.perform(options("/api/v1/users/me").header("Origin","http://localhost:3000")
                .header("Access-Control-Request-Method","PATCH").header("Access-Control-Request-Headers","Authorization,Content-Type"))
                .andExpect(status().isOk()).andExpect(header().string("Access-Control-Allow-Origin","http://localhost:3000"));
        mvc.perform(options("/api/v1/users/me").header("Origin","http://untrusted.local")
                .header("Access-Control-Request-Method","PATCH")).andExpect(status().isForbidden());
    }

    @Test
    void swaggerAndGeneratedOpenApiArePublic() throws Exception {
        call(get("/v3/api-docs"), null, null, 200);
        call(get("/swagger-ui.html"), null, null, 302);
        mvc.perform(get("/api-docs/phase1.yaml"))
                .andExpect(status().isOk())
                .andExpect(content().contentTypeCompatibleWith("application/yaml"))
                .andExpect(content().string(org.hamcrest.Matchers.containsString("openapi: 3.1.0")));
    }
}
