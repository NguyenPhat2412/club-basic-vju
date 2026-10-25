# Backend Modular Architecture Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Refactor the backend in `club-basic-vju/backend/springboot` into a clean Modular Architecture under `com.vju.club.modules.<module>`, with Service interfaces and `impl/I<Feature>Service` implementations, modular entities, repositories, mappers, and `config/request`, `config/response` DTOs, keeping all 353 tests passing.

**Architecture:** Each business domain is extracted into a self-contained module under `com.vju.club.modules.<feature>`. Each module contains `annotation`, `common`, `config.request`, `config.response`, `controller`, `entity`, `mapper`, `repository`, and `service` (interface) + `service.impl` (`I<Feature>Service`). Shared infrastructure stays in `com.vju.club.{common, config, error, security, bootstrap, rest}`.

**Tech Stack:** Java 21, Spring Boot 4.1.1, Spring Data JPA, PostgreSQL, Flyway, Testcontainers, JUnit 5.

## Global Constraints

- Root package remains `com.vju.club`. Main application class remains `com.vju.club.ClubApplication`.
- Business modules reside in `com.vju.club.modules.<module_name>`.
- Service interface is named `<Feature>Service` in `com.vju.club.modules.<feature>.service`.
- Service implementation is named `I<Feature>Service` with `@Service` in `com.vju.club.modules.<feature>.service.impl`.
- DTO Requests are in `com.vju.club.modules.<feature>.config.request`.
- DTO Responses are in `com.vju.club.modules.<feature>.config.response`.
- Base entities reside in `com.vju.club.common.entity`.
- All 353 existing unit, integration, and security tests must pass without any behavioral regression.

---

### Task 1: Clean Stray Directories and Prepare Shared Common Entities

**Files:**
- Delete: `club-basic-vju/backend/springboot/src/main/com.vju.club/`
- Create: `club-basic-vju/backend/springboot/src/main/java/com/vju/club/common/entity/BaseEntity.java`
- Create: `club-basic-vju/backend/springboot/src/main/java/com/vju/club/common/entity/CreatedEntity.java`
- Create: `club-basic-vju/backend/springboot/src/main/java/com/vju/club/common/entity/TimestampedEntity.java`

- [ ] **Step 1:** Remove stray directory `backend/springboot/src/main/com.vju.club`.
- [ ] **Step 2:** Relocate base entities (`BaseEntity`, `CreatedEntity`, `TimestampedEntity`) to `com.vju.club.common.entity`. Keep compatibility aliases in `com.vju.club.entity` if needed during migration.
- [ ] **Step 3:** Verify compilation with `./mvnw test-compile`.

---

### Task 2: Refactor Module `club`

**Files:**
- Create: `com.vju.club.modules.club.entity.Club` & `ClubStatus`
- Create: `com.vju.club.modules.club.repository.ClubRepository`
- Create: `com.vju.club.modules.club.config.request.{ClubRequest, ClubPatchRequest, ClubStatusRequest}`
- Create: `com.vju.club.modules.club.config.response.ClubResponse`
- Create: `com.vju.club.modules.club.mapper.ClubMapper`
- Create: `com.vju.club.modules.club.service.ClubService` (Interface)
- Create: `com.vju.club.modules.club.service.impl.IClubService` (Implementation with `@Service`)
- Create: `com.vju.club.modules.club.controller.ClubController`

- [ ] **Step 1:** Extract `ClubService` interface with all public methods.
- [ ] **Step 2:** Implement `IClubService implements ClubService` in `impl` package.
- [ ] **Step 3:** Move DTOs to `config.request` and `config.response`.
- [ ] **Step 4:** Move Entity and Repository into `modules.club`. Add `ClubMapper`.
- [ ] **Step 5:** Move `ClubController` into `modules.club.controller`.
- [ ] **Step 6:** Run `ClubServiceTest` and `ClubApiTest` to verify functionality.

---

### Task 3: Refactor Modules `user` and `role`

**Files:**
- `com.vju.club.modules.user.*`
- `com.vju.club.modules.role.*`

- [ ] **Step 1:** Create `UserService` interface + `IUserService` implementation in `modules.user.service.impl`. Move user DTOs to `config.request` / `config.response`, entity and repository to `modules.user`.
- [ ] **Step 2:** Create `RoleService` interface + `IRoleService` implementation in `modules.role.service.impl`. Move role DTOs, entity, repository, and controller.
- [ ] **Step 3:** Verify user & role tests with `./mvnw test -Dtest="UserApiTest,RoleApiTest"`.

---

### Task 4: Refactor Modules `department` and `departmentmember`

**Files:**
- `com.vju.club.modules.department.*`
- `com.vju.club.modules.departmentmember.*`

- [ ] **Step 1:** Create `DepartmentService` interface + `IDepartmentService` implementation.
- [ ] **Step 2:** Create `DepartmentMemberService` interface + `IDepartmentMemberService` implementation.
- [ ] **Step 3:** Move DTOs, Entities, Repositories, and Controllers to their respective module packages.
- [ ] **Step 4:** Verify department tests with `./mvnw test -Dtest="DepartmentServiceTest,DepartmentMemberServiceTest,DepartmentApiTest,DepartmentMemberApiTest"`.

---

### Task 5: Refactor Modules `membership` and `clubapplication`

**Files:**
- `com.vju.club.modules.membership.*`
- `com.vju.club.modules.clubapplication.*`

- [ ] **Step 1:** Create `MembershipService` interface + `IMembershipService` implementation.
- [ ] **Step 2:** Create `ClubApplicationService` interface + `IClubApplicationService` implementation in `modules.clubapplication`.
- [ ] **Step 3:** Move DTOs to `config.request`/`config.response`, entities, repositories, and controllers.
- [ ] **Step 4:** Verify membership and application tests with `./mvnw test -Dtest="MembershipServiceTest,ClubApplicationServiceTest,MembershipApiTest,ClubApplicationApiTest"`.

---

### Task 6: Refactor Modules `auth`, `audit`, `permission`, and `notification`

**Files:**
- `com.vju.club.modules.auth.*`
- `com.vju.club.modules.audit.*`
- `com.vju.club.modules.permission.*`
- `com.vju.club.modules.notification.*`

- [ ] **Step 1:** Create `AuthService` interface + `IAuthService` implementation.
- [ ] **Step 2:** Create `AuditService` interface + `IAuditService` implementation.
- [ ] **Step 3:** Create `PermissionService` interface + `IPermissionService` implementation.
- [ ] **Step 4:** Create `NotificationService` interface + `INotificationService` implementation.
- [ ] **Step 5:** Move DTOs, entities, repositories, controllers to respective modules.

---

### Task 7: Update Shared Configurations, Security, and Old Legacy Folders

**Files:**
- Update references in `com.vju.club.security.*`
- Update references in `com.vju.club.bootstrap.*`
- Update references in `com.vju.club.rest.*`
- Remove empty old packages (`com.vju.club.entity`, `com.vju.club.repository`, `com.vju.club.club`, etc.)

- [ ] **Step 1:** Update all remaining imports in `security`, `bootstrap`, `config`, and `rest`.
- [ ] **Step 2:** Remove empty deprecated package directories.
- [ ] **Step 3:** Verify `test-compile`.

---

### Task 8: Update All Test Packages and Verify 100% Pass

**Files:**
- All files in `src/test/java/com/vju/club/**`

- [ ] **Step 1:** Update imports in all 42 test classes.
- [ ] **Step 2:** Execute full test suite: `./mvnw clean test`.
- [ ] **Step 3:** Confirm all 353 tests pass with 0 failures, 0 errors.
