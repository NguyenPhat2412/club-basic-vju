# Club Application Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implement the Phase 2 club-discovery, application, review, membership, department, history, audit, documentation, and test workflow on top of the existing Phase 1 backend.

**Architecture:** Add a focused `application` domain around a Flyway-backed `ClubApplication` aggregate. Extend existing Club and Membership services/repositories for discovery and history, reuse the existing permission/scope and audit services, and keep approve/reject plus membership creation in one transaction with database uniqueness and row locking.

**Tech Stack:** Java 21, Spring Boot 4.1.1 Web MVC/Security/Data JPA/Validation, PostgreSQL 16, Flyway, JUnit 5, Mockito, MockMvc, Testcontainers, YAML/OpenAPI.

**Spec:** `docs/superpowers/specs/2026-10-06-club-application-phase2-design.md`

## Global Constraints

- Keep all backend routes under `/api/v1` and extend equivalent Phase 1 routes instead of creating duplicates.
- Authorization must use permission plus `GLOBAL`/`CLUB`/`DEPARTMENT` scope; never branch on role names.
- Preserve UUID IDs, DTO responses, RFC 7807 errors, offset/limit pagination, Flyway migrations, append-only audit logging, and existing Phase 1 behavior unless discovery requires the documented ACTIVE-club fallback.
- Do not add events, tasks, attendance, payments, reporting, or new external dependencies. Basic persisted in-app notifications are part of the requested Phase 2 workflow.
- `LEFT` memberships remain final; current schema behavior permitting multiple department assignments is preserved.
- Every task writes the failing test first, runs the focused test to observe failure, implements the smallest change, reruns the focused test, and finishes with the relevant unit suite.

## Review Focus

- A concurrent duplicate create must yield one pending row and conflicts for the rest; test the partial unique index and error mapping in Task 1/3.
- A concurrent approve must produce at most one membership and one terminal application state; test the pessimistic lock/transaction in Task 4.
- A reviewer with a Club A grant must receive 403 for Club B even when the application ID is valid; test path-club matching and scope in Task 4/8.
- Owner endpoints must not expose or cancel another user’s application, including after terminal states; test ownership and indistinguishable lookup in Task 3/8.
- Approval rollback must leave the application PENDING when membership persistence fails; test transactional rollback in Task 4.

## File Map

- Create `backend/springboot/src/main/java/com/vju/club/application/**` for the aggregate, DTOs, repository, service, and controller.
- Create `backend/springboot/src/main/java/com/vju/club/membership/dto/MyMembershipResponse.java` and extend membership repository/service/controller for filters and self history.
- Modify `backend/springboot/src/main/java/com/vju/club/club/**` and `backend/springboot/src/main/java/com/vju/club/repository/ClubRepository.java` for discovery filters and ACTIVE fallback.
- Modify `backend/springboot/src/main/java/com/vju/club/entity/AuditAction.java`, `backend/springboot/src/main/java/com/vju/club/audit/**`, and `backend/springboot/src/main/resources/db/migration/V7__club_applications.sql` for audit and schema.
- Modify `backend/springboot/src/main/resources/api/catalog.yml`, `backend/springboot/src/main/resources/api/phase1-openapi.yaml`, `docs/api/catalog.yml`, `docs/api/openapi.yaml`, and `README.md` for the public contract.
- Create focused unit tests under `src/test/java/com/vju/club/application/**`; extend `ClubServiceTest`, `MembershipServiceTest`, `EntityMappingTest`, and `MigrationScriptTest`.
- Create integration/acceptance tests under `src/test/java/com/vju/club/integration/ClubApplicationApiTest.java` and `PhaseTwoAcceptanceTest.java`.

### Task 1: Schema, aggregate, and permission/audit catalog

**Files:**
- Create: `backend/springboot/src/main/resources/db/migration/V7__club_applications.sql`
- Create: `backend/springboot/src/main/java/com/vju/club/entity/ClubApplication.java`
- Create: `backend/springboot/src/main/java/com/vju/club/entity/ClubApplicationStatus.java`
- Create: `backend/springboot/src/main/java/com/vju/club/repository/ClubApplicationRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/entity/AuditAction.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/entity/EntityMappingTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/database/MigrationScriptTest.java`

**Interfaces:**
- Produces `ClubApplication extends TimestampedEntity`, `ClubApplicationStatus`, and repository signatures for pending lookup, owner/club lookup, and locked review lookup.
- Consumes existing `User`, `Club`, `Membership`, `TimestampedEntity`, `PermissionScope`, and `AuditAction` conventions.

- [ ] **Step 1: Write failing mapping/schema tests** asserting `club_applications`, status values, required FKs, partial unique pending index, seven permission keys, and `APPLICATION` audit resource support.
- [ ] **Step 2: Run `./mvnw -Dtest=EntityMappingTest,MigrationScriptTest test` and verify failure on missing table/entity/catalog.**
- [ ] **Step 3: Implement V7 and the entity/repository.** Add bounded columns, optimistic version, FK indexes, partial pending uniqueness, permission seeds at `CLUB` scope, and the audit check-constraint extension without changing V1–V6.
- [ ] **Step 4: Run the focused tests and verify PASS.**
- [ ] **Step 5: Commit `feat: add club application schema and aggregate`.**

### Task 2: Club discovery filters and ACTIVE fallback

**Files:**
- Modify: `backend/springboot/src/main/java/com/vju/club/repository/ClubRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/club/ClubController.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/club/ClubService.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/club/ClubServiceTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/integration/ClubApiTest.java`

**Interfaces:**
- Produces `ClubService.list(Actor,String,String,ClubStatus,int,int)` and ACTIVE-only fallback behavior for callers without `club.view`.
- Consumes `PermissionAuthorizationService` and existing club repository query conventions.

- [ ] **Step 1: Add failing unit/integration cases for category/status filters, no-permission ACTIVE discovery, inactive hiding, and scoped permission preservation.**
- [ ] **Step 2: Run the focused unit test and verify the new cases fail while existing scoped cases remain diagnostic.**
- [ ] **Step 3: Add repository queries with category/status predicates, update controller params, and implement the fallback without exposing inactive clubs.**
- [ ] **Step 4: Run `./mvnw -Dtest=ClubServiceTest test` and verify PASS; record Docker as required for the integration class.**
- [ ] **Step 5: Commit `feat: extend club discovery for phase two`.**

### Task 3: Applicant create/list/detail/cancel workflow

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/application/dto/CreateClubApplicationRequest.java`
- Create: `backend/springboot/src/main/java/com/vju/club/application/dto/ReviewClubApplicationRequest.java`
- Create: `backend/springboot/src/main/java/com/vju/club/application/dto/ClubApplicationResponse.java`
- Create: `backend/springboot/src/main/java/com/vju/club/application/dto/ClubApplicationSummaryResponse.java`
- Create: `backend/springboot/src/main/java/com/vju/club/application/ClubApplicationService.java`
- Create: `backend/springboot/src/main/java/com/vju/club/application/ClubApplicationController.java`
- Create: `backend/springboot/src/test/java/com/vju/club/application/ClubApplicationServiceTest.java`

**Interfaces:**
- Produces service methods `create(Actor, UUID, CreateClubApplicationRequest)`, `listMine(...)`, `getMine(...)`, and `cancel(Actor, UUID)` plus owner and reviewer DTOs.
- Consumes Task 1 repository/entity and existing `AuditService`, `PermissionAuthorizationService`, `MembershipRepository`, `UserRepository`, and `ClubRepository`.

- [ ] **Step 1: Write failing unit tests for ACTIVE checks, inactive club, active/current membership conflict, duplicate pending, backend-owned fields, owner list/detail, cancel success, and terminal cancel errors.**
- [ ] **Step 2: Run `./mvnw -Dtest=ClubApplicationServiceTest test` and verify the tests fail for missing service/controller behavior.**
- [ ] **Step 3: Implement DTO validation, repository queries, service transactions, owner checks, error codes, and `/api/v1/users/me/applications` plus create/cancel routes.**
- [ ] **Step 4: Run the application unit test class and verify PASS.**
- [ ] **Step 5: Commit `feat: add applicant club application workflow`.**

### Task 4: Reviewer list/detail and atomic approve/reject

**Files:**
- Modify: `backend/springboot/src/main/java/com/vju/club/application/ClubApplicationService.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/application/ClubApplicationController.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/application/dto/**`
- Modify: `backend/springboot/src/test/java/com/vju/club/application/ClubApplicationServiceTest.java`

**Interfaces:**
- Produces reviewer methods `listForClub`, `getForClub`, `approve`, and `reject`; reviewer authorization accepts action-specific permission or `application.review` at the application’s club.
- Consumes the locked repository query and membership/audit repositories; outputs `ClubApplicationResponse` with reviewer and membership identifiers where applicable.

- [ ] **Step 1: Write failing unit tests for Club A vs Club B scope, missing path/application club match, unauthorized review, approve/reject terminal conflicts, approve membership creation, reject no membership, and forced membership failure rollback.**
- [ ] **Step 2: Run the focused test class and verify the new review cases fail.**
- [ ] **Step 3: Implement locked transactional review; create ACTIVE membership, populate review fields, write `MEMBERSHIP_CREATED` plus application audit, and rely on rollback for failure.**
- [ ] **Step 4: Add concurrency-focused service test using the existing latch pattern where mocks can prove one winner; run the full application unit class and verify PASS.**
- [ ] **Step 5: Commit `feat: add scoped application review and approval`.**

### Task 5: Membership filters, transition validation, and personal history

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/membership/dto/MyMembershipResponse.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/repository/MembershipRepository.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/membership/MembershipService.java`
- Modify: `backend/springboot/src/main/java/com/vju/club/membership/MembershipController.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/membership/MembershipServiceTest.java`

**Interfaces:**
- Produces filtered `list(Actor,UUID,MembershipStatus,UUID,String,int,int)` and `listMine(Actor,...)` using existing page conventions.
- Consumes existing `Membership`, `DepartmentMember`, `Club`, and permission checks; does not create a second membership entity.

- [ ] **Step 1: Write failing unit tests for search/department filters, self-only history, LEFT finality, status transition error code, and audit of membership changes.**
- [ ] **Step 2: Run the membership unit test and verify failures.**
- [ ] **Step 3: Add JPQL page/count queries, controller params, self-history route, and explicit transition validation while retaining existing paths.**
- [ ] **Step 4: Run `./mvnw -Dtest=MembershipServiceTest test` and verify PASS.**
- [ ] **Step 5: Commit `feat: extend membership management and history`.**

### Task 6: Department assignment regression coverage

**Files:**
- Modify: `backend/springboot/src/test/java/com/vju/club/departmentmember/DepartmentMemberServiceTest.java` (create if absent)
- Modify: `backend/springboot/src/test/java/com/vju/club/integration/DepartmentMemberApiTest.java`
- Modify only if needed: `backend/springboot/src/main/java/com/vju/club/departmentmember/**`

**Interfaces:**
- Consumes existing `DepartmentMemberService` and Task 5 membership behavior.
- Produces proof that no Phase 2 change weakens `department.member.*` scope, same-club checks, active-membership checks, duplicate protection, or move behavior.

- [ ] **Step 1: Write failing or gap-filling tests for Department A/B permission scope, cross-club assignment, duplicate add, and assignment after approval.**
- [ ] **Step 2: Run the focused unit/integration tests and inspect whether failures are test gaps or regressions.**
- [ ] **Step 3: Make only targeted service changes if a Phase 2 invariant is missing; do not refactor unrelated Phase 1 code.**
- [ ] **Step 4: Run department-member unit tests and verify PASS.**
- [ ] **Step 5: Commit `test: cover phase two department assignment security`.**

### Task 7: API catalog, OpenAPI, README, and demo documentation

**Files:**
- Modify: `backend/springboot/src/main/resources/api/catalog.yml`
- Modify: `backend/springboot/src/main/resources/api/phase1-openapi.yaml`
- Modify: `docs/api/catalog.yml`
- Modify: `docs/api/openapi.yaml`
- Modify: `README.md`
- Modify: `backend/springboot/src/test/java/com/vju/club/contract/ContractDocumentsTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/rest/ApiCatalogControllerTest.java`

**Interfaces:**
- Produces matching runtime/resource/docs API catalogs for all Phase 2 endpoints, permissions, scopes, responses, and error codes.
- Consumes the final controller paths and DTO schemas from Tasks 2–5.

- [ ] **Step 1: Add failing contract assertions for Phase 2 route parity, permissions, and OpenAPI schemas.**
- [ ] **Step 2: Run contract tests and verify missing entries fail.**
- [ ] **Step 3: Update both catalog copies, OpenAPI operation/security/error definitions, README workflow/configuration, and the in-app notification contract.**
- [ ] **Step 4: Run contract tests and verify PASS.**
- [ ] **Step 5: Commit `docs: document phase two application APIs`.**

### Task 8: Integration and PhaseTwoAcceptanceTest

**Files:**
- Create: `backend/springboot/src/test/java/com/vju/club/integration/ClubApplicationApiTest.java`
- Create: `backend/springboot/src/test/java/com/vju/club/integration/PhaseTwoAcceptanceTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/integration/ApiIntegrationTest.java`
- Modify: `backend/springboot/src/test/java/com/vju/club/integration/PermissionApiTest.java` only if permission-count/catalog fixtures require it.

**Interfaces:**
- Consumes all completed Phase 2 routes, V7 migration, and the existing Testcontainers/PostgreSQL fixture helpers.
- Produces executable proof for create → pending → duplicate rejection → scoped review → approval/membership → department assignment → audit, plus reject/cancel/403/409 and cross-club cases.

- [ ] **Step 1: Write integration tests for the ten required security/state cases and the approval rollback/concurrency cases.**
- [ ] **Step 2: Run with `./mvnw -Dtest=ClubApplicationApiTest,PhaseTwoAcceptanceTest test`; expected result is a clear Docker/Testcontainers prerequisite failure in this environment until Docker is available.**
- [ ] **Step 3: Fix implementation/fixture issues revealed by a Docker-enabled run; do not weaken assertions to make tests green.**
- [ ] **Step 4: Run the focused integration suite in the available environment and record PASS or the exact external Docker blocker.**
- [ ] **Step 5: Commit `test: add phase two acceptance workflow`.**

### Task 9: Full verification and review

**Files:**
- No planned source additions; only test/documentation fixes justified by verification.

**Interfaces:**
- Consumes every previous task’s committed interface.
- Produces the final evidence set: compile success, unit suite, integration/acceptance result, migration checks, catalog parity, security review, and clean diff summary.

- [ ] **Step 1: Run `./mvnw test` and capture the complete result; if Docker is unavailable, separately run the 93-test non-integration suite and preserve the Docker error.**
- [ ] **Step 2: Run `./mvnw -DskipTests package`, `git diff --check`, and the OpenAPI/catalog contract tests.**
- [ ] **Step 3: Inspect migration ordering, transaction annotations, repository indexes/queries, authorization call sites, and N+1 risks; run focused regression tests for any issue found.**
- [ ] **Step 4: Run the final code review against the spec and plan; fix any critical/important issue with a failing regression test first.**
- [ ] **Step 5: Commit only verification-driven fixes and prepare the Phase 2 report with files, migrations, endpoints, permissions, tests, limitations, assumptions, and business questions.**
