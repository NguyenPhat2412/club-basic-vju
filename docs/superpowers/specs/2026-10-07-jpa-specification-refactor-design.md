# JPA Specification Refactoring Design

## Overview

Refactor the Spring Boot backend (`club-basic-vju/backend/springboot`) across 5 modules (`club`, `user`, `membership`, `clubapplication`, `audit`) to decouple query and filtering concerns from Spring Data JPA Repositories by introducing Spring Data JPA `Specification` (Criteria API) factories.

## Goals & Objectives

1. **Architecture & Clean DDD:**
   - Restore Repositories to their pure role as collection-like abstractions for CRUD and identifier-based lookups (`findById`, `existsBy...`).
   - Move dynamic search, multi-criteria filtering, and pagination count logic into a dedicated `specification` package per module.
2. **Eliminate Code Smells & Hardcoded SQL/JPQL:**
   - Remove string concatenation constants (`SEARCH`, `FILTER`, `VISIBLE_TO_USER`) from Repository interfaces.
   - Eliminate SQL hacks like `(:category = '' OR ...)` or `(:status IS NULL OR ...)`. Criteria API will dynamically compose predicates only when criteria are provided.
   - Eliminate duplicated query methods (`search` + `countSearch`). `JpaSpecificationExecutor.findAll(spec, pageable)` automatically handles count queries.
3. **Decouple Security/Authorization from Query Layer:**
   - In `ClubRepository`, native SQL currently joins `effective_user_permissions`. After refactoring, permission resolution happens in the service layer (`PermissionAuthorizationService` / `UserPermissionRepository.findEffective`), which supplies domain identifier constraints (`ClubSpecifications.idIn(...)`) to the query.
4. **Reusability & Composability:**
   - Filter criteria become composable `Specification<T>` building blocks combinable with `.and()` and `.or()`.
5. **Testability & Zero Regression:**
   - 100% backward compatibility with all API contracts and existing test suites (353+ tests passing).

## Module Architecture & Structure

Each target module introduces a `specification` package alongside existing packages:

```text
com.vju.club.modules.<module>/
├── annotation/
├── common/
├── config/
│   ├── request/
│   └── response/
├── controller/
├── entity/
├── mapper/
├── repository/
│   └── <Module>Repository.java   <-- extends JpaSpecificationExecutor<Entity>
├── specification/
│   └── <Module>Specifications.java <-- NEW specification factory
└── service/
    ├── <Module>Service.java
    └── impl/
        └── I<Module>Service.java <-- uses <Module>Specifications & findAll(spec, pageable)
```

## Detailed Module Specifications

### 1. `club` Module
- **Specification:** `ClubSpecifications`
  - `hasKeyword(String search)`: `(lower(name) LIKE :pattern OR lower(code) LIKE :pattern)`.
  - `hasCategory(String category)`: `lower(activityField) = lower(:category)`.
  - `hasStatus(ClubStatus status)`: `status = :status`.
  - `isDiscoverable()`: `status = ACTIVE`.
  - `idIn(Collection<UUID> ids)`: `id IN (:ids)`.
- **Repository:** `ClubRepository`
  - Extends `JpaRepository<Club, UUID>`, `JpaSpecificationExecutor<Club>`.
  - Retains: `existsByCodeIgnoreCase`, `findByIdAndStatus`.
  - Removes: `search`, `countSearch`, `searchDiscoverable`, `countDiscoverable`, `searchVisibleTo`, `countVisibleTo`, `VISIBLE_TO_USER`.
- **Service:** `IClubService.list(actor, search, category, status, offset, limit)`
  - If `hasGlobalPermission`: builds spec with keyword, category, status.
  - Else if `hasAnyPermission`: fetches effective permissions, collects club IDs where user has `club.view` at `CLUB` scope. If empty, returns empty page. Else adds `idIn(permittedClubIds)`.
  - Else: builds spec with keyword, category, and `isDiscoverable()`.
  - Sort by `name ASC, id ASC`.

### 2. `user` Module
- **Specification:** `UserSpecifications`
  - `hasKeyword(String search)`: `lower(email) LIKE :pattern OR lower(fullName) LIKE :pattern OR lower(coalesce(studentCode, '')) LIKE :pattern`.
- **Repository:** `UserRepository`
  - Extends `JpaRepository<User, UUID>`, `JpaSpecificationExecutor<User>`.
  - Removes: `SEARCH`, `search(pattern, pageable)`, `countSearch(pattern)`.
- **Service:** `IUserService.search(...)`
  - Uses `UserSpecifications.hasKeyword(query)`.
  - Uses `userRepository.findAll(spec, page)`.

### 3. `membership` Module
- **Specification:** `MembershipSpecifications`
  - `hasClubId(UUID clubId)`: `root.get("club").get("id") = clubId`.
  - `hasStatus(MembershipStatus status)`: `root.get("status") = status`.
  - `inDepartment(UUID departmentId)`: Subquery on `DepartmentMember` matching `membership.id` and `department.id = departmentId`.
  - `userKeyword(String search)`: Join `user` with `email`, `fullName`, `studentCode` LIKE pattern.
- **Repository:** `MembershipRepository`
  - Extends `JpaRepository<Membership, UUID>`, `JpaSpecificationExecutor<Membership>`.
  - Updates list methods to use specifications.
- **Service:** `IMembershipService.list(...)`
  - Composes specifications and queries with pagination.

### 4. `clubapplication` Module
- **Specification:** `ClubApplicationSpecifications`
  - `forApplicant(UUID applicantId)`: `applicant.id = applicantId`.
  - `forClub(UUID clubId)`: `club.id = clubId`.
  - `hasStatus(ClubApplicationStatus status)`: `status = status`.
  - `createdBetween(OffsetDateTime from, OffsetDateTime to)`: `createdAt >= from AND createdAt < to`.
  - `applicantKeyword(String search)`: Join `applicant` matching `email`, `fullName`, `studentCode`.
- **Repository:** `ClubApplicationRepository`
  - Extends `JpaRepository<ClubApplication, UUID>`, `JpaSpecificationExecutor<ClubApplication>`.
- **Service:** `IClubApplicationService.list(...)`
  - Uses composable specifications for applicant and club application views.

### 5. `audit` Module
- **Specification:** `AuditLogSpecifications`
  - `hasResourceType(String resourceType)`
  - `hasResourceId(UUID resourceId)`
  - `hasActorUserId(UUID actorUserId)`
  - `hasClubId(UUID clubId)`
  - `hasAction(String action)`
- **Repository:** `AuditLogRepository`
  - Extends `JpaRepository<AuditLog, UUID>`, `JpaSpecificationExecutor<AuditLog>`.
  - Removes: `FILTER`, `search`, `countSearch`.
- **Service:** `AuditQueryService.search(...)`
  - Composes specifications and calls `auditLogRepository.findAll(spec, pageable)`.

## Testing & Verification
- Unit test adjustments: Mock `repository.findAll(any(Specification.class), any(Pageable.class))` where repositories were previously mocked with `search(...)`.
- Update `ClubRepositoryQueryTest` to `ClubSpecificationsTest`.
- Run all integration tests: `ClubApiTest`, `PhaseTwoAcceptanceTest`, `SprintOneAcceptanceTest`, `AuditLogApiTest`, `PostgresApiTest`.
- Verify full test suite passes with 0 failures.
