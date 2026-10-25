# JPA Specification Refactoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Decouple query and filtering logic from Spring Data JPA repositories across 5 modules (`club`, `user`, `membership`, `clubapplication`, `audit`) by introducing Spring Data JPA `Specification` factories and having repositories extend `JpaSpecificationExecutor`.

**Architecture:** Each module receives a `specification` package containing a `<Module>Specifications` class with static methods returning `Specification<T>`. Services compose these specifications dynamically and execute queries via `repository.findAll(spec, pageable)`. Business and authorization rules are separated from raw repository queries.

**Tech Stack:** Java 21, Spring Boot 3.x, Spring Data JPA, Hibernate, PostgreSQL, JUnit 5, AssertJ, Mockito.

## Global Constraints

- Preserve 100% backward compatibility with all API endpoints and response payloads.
- Maintain existing sorting conventions and pagination behavior.
- Retain all 353+ test passes with 0 failures or errors.

---

### Task 1: Refactor `club` Module to Spring Data JPA Specification

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/modules/club/specification/ClubSpecifications.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/club/repository/ClubRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/club/service/impl/IClubService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/repository/ClubRepositoryQueryTest.java` -> Rename or replace with `ClubSpecificationsTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/club/ClubServiceTest.java`

- [x] **Step 1: Create `ClubSpecifications`**
Implement `ClubSpecifications` with methods: `hasKeyword(String search)`, `hasCategory(String category)`, `hasStatus(ClubStatus status)`, `isDiscoverable()`, `idIn(Collection<UUID> ids)`.

- [x] **Step 2: Update `ClubRepository`**
Add `JpaSpecificationExecutor<Club>` to `ClubRepository` interface. Remove `search`, `countSearch`, `searchDiscoverable`, `countDiscoverable`, `searchVisibleTo`, `countVisibleTo`, and `VISIBLE_TO_USER`.

- [x] **Step 3: Update `IClubService`**
In `IClubService.list(...)`, compose `Specification<Club>` using `ClubSpecifications`. For users with scoped `club.view` permissions, extract permitted club IDs via `userPermissionRepository.findEffective(actor.id())` and filter with `ClubSpecifications.idIn(...)`. Execute via `clubRepository.findAll(spec, page)`.

- [x] **Step 4: Update Tests**
Replace `ClubRepositoryQueryTest` with `ClubSpecificationsTest`. Update `ClubServiceTest` to mock `clubRepository.findAll(any(Specification.class), any(Pageable.class))` returning `PageImpl`.

- [x] **Step 5: Verify Task 1**
Run `./mvnw test -Dtest=Club*` and ensure all club-related tests pass.

- [x] **Step 6: Commit Task 1**
Commit changes: `refactor(club): migrate query and filtering logic to ClubSpecifications`.

---

### Task 2: Refactor `user` Module to Spring Data JPA Specification

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/modules/user/specification/UserSpecifications.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/user/repository/UserRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/user/service/impl/IUserService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/user/UserServiceTest.java` (if applicable)

- [x] **Step 1: Create `UserSpecifications`**
Implement `hasKeyword(String query)` matching lower-case `email`, `fullName`, or `coalesce(studentCode, '')`.

- [x] **Step 2: Update `UserRepository`**
Extend `JpaSpecificationExecutor<User>`. Remove `SEARCH`, `search(pattern, pageable)`, `countSearch(pattern)`.

- [x] **Step 3: Update `IUserService`**
In `IUserService.search(...)`, use `UserSpecifications.hasKeyword(query)` and call `userRepository.findAll(spec, page)`.

- [x] **Step 4: Verify Task 2**
Run `./mvnw test -Dtest=User*` to verify user tests pass.

- [x] **Step 5: Commit Task 2**
Commit changes: `refactor(user): migrate search query to UserSpecifications`.

---

### Task 3: Refactor `membership` Module to Spring Data JPA Specification

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/modules/membership/specification/MembershipSpecifications.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/membership/repository/MembershipRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/membership/service/impl/IMembershipService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/membership/MembershipServiceTest.java`

- [x] **Step 1: Create `MembershipSpecifications`**
Implement `hasClubId(UUID clubId)`, `hasStatus(MembershipStatus status)`, `inDepartment(UUID departmentId)`, `userKeyword(String search)`.

- [x] **Step 2: Update `MembershipRepository`**
Extend `JpaSpecificationExecutor<Membership>`.

- [x] **Step 3: Update `IMembershipService`**
In `IMembershipService.list(...)`, compose specifications dynamically and call `membershipRepository.findAll(spec, pageable)`.

- [x] **Step 4: Verify Task 3**
Run `./mvnw test -Dtest=Membership*` to verify membership tests pass.

- [x] **Step 5: Commit Task 3**
Commit changes: `refactor(membership): migrate query logic to MembershipSpecifications`.

---

### Task 4: Refactor `clubapplication` Module to Spring Data JPA Specification

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/modules/clubapplication/specification/ClubApplicationSpecifications.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/clubapplication/repository/ClubApplicationRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/clubapplication/service/impl/IClubApplicationService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/application/ClubApplicationServiceTest.java`

- [x] **Step 1: Create `ClubApplicationSpecifications`**
Implement `forApplicant(UUID applicantId)`, `forClub(UUID clubId)`, `hasStatus(ClubApplicationStatus status)`, `createdBetween(OffsetDateTime from, OffsetDateTime to)`, `applicantKeyword(String search)`.

- [x] **Step 2: Update `ClubApplicationRepository`**
Extend `JpaSpecificationExecutor<ClubApplication>`.

- [x] **Step 3: Update `IClubApplicationService`**
In `IClubApplicationService`, use `ClubApplicationSpecifications` in `listMine` and `listForClub`.

- [x] **Step 4: Verify Task 4**
Run `./mvnw test -Dtest=ClubApplication*` to verify application tests pass.

- [x] **Step 5: Commit Task 4**
Commit changes: `refactor(clubapplication): migrate query logic to ClubApplicationSpecifications`.

---

### Task 5: Refactor `audit` Module to Spring Data JPA Specification

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/modules/audit/specification/AuditLogSpecifications.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/audit/repository/AuditLogRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/modules/audit/service/AuditQueryService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/integration/AuditLogApiTest.java`

- [x] **Step 1: Create `AuditLogSpecifications`**
Implement `hasResourceType(String resourceType)`, `hasResourceId(UUID resourceId)`, `hasActorUserId(UUID actorUserId)`, `hasClubId(UUID clubId)`, `hasAction(String action)`.

- [x] **Step 2: Update `AuditLogRepository`**
Extend `JpaSpecificationExecutor<AuditLog>`. Remove `FILTER`, `search`, `countSearch`.

- [x] **Step 3: Update `AuditQueryService`**
Use `AuditLogSpecifications` in `search(...)` and call `auditLogRepository.findAll(spec, pageable)`.

- [x] **Step 4: Verify Task 5**
Run `./mvnw test -Dtest=Audit*` to verify audit tests pass.

- [x] **Step 5: Commit Task 5**
Commit changes: `refactor(audit): migrate query logic to AuditLogSpecifications`.

---

### Task 6: Full Verification and Regression Test Suite

**Files:**
- Run: `./mvnw clean test` across entire project

- [x] **Step 1: Run Full Clean Test Suite**
Verify all 353+ tests pass without errors or failures (364 tests passed, 0 failures).

- [x] **Step 2: Audit and Final Review**
Confirm all 5 target goals are met with zero regressions.
