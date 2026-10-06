# Phase 2: Club Applications and Membership Workflow

## Goal

Extend the existing Spring Boot/PostgreSQL backend with the complete student club-application workflow while preserving the Phase 1 permission, scope, error, pagination, audit, Flyway, and API conventions.

The supported flow is:

`active user -> discover active clubs -> submit application -> owner tracks/cancels -> club-scoped reviewer approves or rejects -> approved application creates an ACTIVE membership atomically -> existing membership and department APIs manage the member`.

The Next.js frontend, event management, notifications beyond a documented deferral, payments, reporting, and other post-Phase-2 domains remain outside this change.

## Existing boundaries and compatibility

- Backend routes remain under `/api/v1`; an equivalent Phase 1 route is extended instead of duplicated.
- `User`, `Club`, `Department`, `Membership`, `DepartmentMember`, `Permission`, `Role`, `AuditLog`, `PermissionAuthorizationService`, `GlobalExceptionHandler`, `PageResponse`, and the existing Flyway chain remain the source of truth.
- Authorization continues to be permission plus `GLOBAL`/`CLUB`/`DEPARTMENT` scope. Role names are never inspected by business code.
- Existing club list/detail routes retain scoped behavior for callers who hold `club.view`. An authenticated ACTIVE user without that permission receives only ACTIVE clubs through the same discovery routes; inactive clubs and administrative-only data are not exposed.
- Existing membership and department-member paths remain valid. New filtering is additive and uses the current offset/limit pagination convention.
- Existing error responses stay RFC 7807 with the established `code` field.

## Components

### `application` package

Add:

- `ClubApplication` entity and `ClubApplicationStatus` enum.
- `ClubApplicationRepository` with owner and club queries, pending-duplicate lookup, paginated filters, and a pessimistic-locking review lookup.
- `ClubApplicationService` for create, owner list/detail, cancel, reviewer list/detail, approve, and reject.
- `ClubApplicationController` using `/api/v1/clubs/{clubId}/applications`, `/api/v1/applications`, and `/api/v1/users/me/applications` without introducing an equivalent duplicate of existing Phase 1 routes.
- DTOs for create, review, response/summary, and optional filter parameters.

`ClubApplication` extends `TimestampedEntity` and contains UUID relationships to applicant `User`, `Club`, and nullable reviewer `User`; a bounded message; status; nullable `reviewedAt`, `reviewNote`, and `cancelledAt`; and an optimistic `version` column. The status is backend-owned and cannot be supplied by create requests.

### Membership extensions

Extend `MembershipRepository` and `MembershipService` rather than creating a second membership model:

- query current memberships by club with optional status, department, and text search filters;
- retain the existing `LEFT` final-state rule;
- keep membership status transitions explicit and audited;
- allow the application service to create the membership used by approval inside the same transaction and audit it as `MEMBERSHIP_CREATED`.

Existing `DepartmentMemberService` and its composite database constraints are reused. The Phase 2 tests verify same-club membership/department validation and the existing move behavior.

### Club discovery

Extend the existing club list query/controller with `category` mapped to `activityField`, optional status for permissioned callers, and the current `offset`/`limit` pagination. Public discovery for authenticated active users is restricted to ACTIVE clubs. Club responses remain DTOs and contain only the existing public club fields.

### Permissions

Flyway adds these catalog entries, using existing scope values:

- `application.view` (`CLUB`)
- `application.view_detail` (`CLUB`)
- `application.create` (`CLUB`, recorded as the delegated-management capability; self-submission uses ownership)
- `application.cancel` (`CLUB`, owner path is enforced by ownership)
- `application.review` (`CLUB`)
- `application.approve` (`CLUB`)
- `application.reject` (`CLUB`)

The application service checks ownership for self endpoints and exact club scope for management endpoints. `application.review` is a broad reviewer capability; `application.approve` and `application.reject` are finer-grained alternatives. A reviewer must hold the applicable permission for the application’s actual club, so a grant for Club A cannot act on Club B.

## API contract

All endpoints require an authenticated active user unless stated otherwise.

### Discovery

- `GET /api/v1/clubs?query=&category=&status=&offset=&limit=`: list clubs. Callers without `club.view` see ACTIVE clubs only; permissioned callers retain current scope filtering.
- `GET /api/v1/clubs/{clubId}`: return an ACTIVE discoverable club to an authenticated user without `club.view`, or apply the existing scoped permission check for permissioned access.

### Applicant endpoints

- `POST /api/v1/clubs/{clubId}/applications` with `{ "message": "..." }` creates `PENDING`.
- `GET /api/v1/users/me/applications?status=&clubId=&offset=&limit=` lists the caller’s applications.
- `GET /api/v1/users/me/applications/{applicationId}` returns only the caller’s application.
- `PATCH /api/v1/users/me/applications/{applicationId}/cancel` changes only `PENDING` to `CANCELLED`; it never hard-deletes.

The owner detail/cancel paths return the existing indistinguishable not-found/forbidden behavior where appropriate. A second pending application returns `409 APPLICATION_ALREADY_PENDING`; a current membership returns `409 ALREADY_CLUB_MEMBER`.

### Reviewer endpoints

- `GET /api/v1/clubs/{clubId}/applications?status=&search=&createdFrom=&createdTo=&offset=&limit=` requires `application.view` at the club scope.
- `GET /api/v1/clubs/{clubId}/applications/{applicationId}` requires `application.view` or `application.view_detail` at that club and verifies the application belongs to the path club.
- `POST /api/v1/clubs/{clubId}/applications/{applicationId}/approve` requires `application.approve` or `application.review` at that club and accepts an optional `{ "reviewNote": "..." }`.
- `POST /api/v1/clubs/{clubId}/applications/{applicationId}/reject` requires `application.reject` or `application.review` at that club and accepts the same review note.

Review operations reject a non-pending application with `409 APPLICATION_ALREADY_REVIEWED`, reject a path/application club mismatch with the established not-found/forbidden convention, and record reviewer, timestamp, note, and audit metadata.

### Membership/history endpoints

- Existing `GET /api/v1/clubs/{clubId}/memberships` gains optional `search` and `departmentId` filters while retaining `status`, `offset`, and `limit`.
- Existing membership status/detail endpoints remain the canonical management API.
- `GET /api/v1/users/me/memberships?status=&offset=&limit=` exposes the caller’s own membership history without a global permission.

The response DTOs include club identity, application status/timestamps where applicable, membership status/join/left timestamps, and department IDs through existing response conventions. No new aggregate history table is introduced.

## State and transaction rules

Create:

1. Load the caller and require ACTIVE status.
2. Load an ACTIVE club.
3. Reject an existing current membership and a pending application.
4. Persist a `PENDING` application with null review fields.
5. Write `CLUB_APPLICATION_CREATED` in the same transaction.

Cancel:

1. Load by application ID and applicant ID.
2. Require `PENDING`.
3. Set `CANCELLED` and `cancelledAt`.
4. Audit `CLUB_APPLICATION_CANCELLED`.

Approve:

1. Acquire a row lock for the application and verify the path club.
2. Require `PENDING` and the exact club-scoped permission.
3. Verify the applicant has no current membership that would conflict with the existing membership invariant.
4. Create an `ACTIVE` membership with `joinedAt=now`.
5. Set application `APPROVED`, reviewer, review timestamp, and note.
6. Write `MEMBERSHIP_CREATED` and `CLUB_APPLICATION_APPROVED` audit rows.
7. Commit both or roll back both.

Reject follows the same lock/status/reviewer flow without creating membership and writes `CLUB_APPLICATION_REJECTED`.

The database partial unique index on pending applications and the existing partial current-membership index provide race protection. The service tests also exercise concurrent duplicate creation and concurrent approval outcomes where the current test infrastructure permits it.

## Audit

Extend `AuditAction` and the migration’s allowed resource types with `APPLICATION` and these actions:

- `CLUB_APPLICATION_CREATED`
- `CLUB_APPLICATION_CANCELLED`
- `CLUB_APPLICATION_APPROVED`
- `CLUB_APPLICATION_REJECTED`
- `MEMBERSHIP_CREATED`

Audit values include application/user/club IDs, status transitions, reviewer ID, review note where relevant, and membership ID for approval. Existing append-only storage and `AuditService` are reused.

## Validation and errors

- Create message: `@Size(max=2000)`.
- Review note: `@Size(max=1000)`.
- `status`, `reviewedBy`, `reviewedAt`, and `cancelledAt` are never accepted on create.
- Reuse existing codes where available; add `CLUB_APPLICATION_NOT_FOUND`, `APPLICATION_ALREADY_PENDING`, `APPLICATION_ALREADY_REVIEWED`, `APPLICATION_CANNOT_BE_CANCELLED`, `APPLICATION_CLUB_MISMATCH`, `ALREADY_CLUB_MEMBER`, `DUPLICATE_MEMBERSHIP`, `MEMBERSHIP_CLUB_MISMATCH`, and `INVALID_MEMBERSHIP_STATUS_TRANSITION` only where no equivalent exists.

## Deferred and explicit assumptions

- No notification module exists in the repository, so approval/rejection notifications are documented as deferred rather than introducing email, push, WebSocket, or a new persistence subsystem.
- Rejected or cancelled users may submit a new application after no pending application remains.
- The existing schema permits a membership in multiple departments; Phase 2 preserves that behavior and does not invent a single-department rule.
- `LEFT` memberships remain history and cannot be reopened; rejoining uses the existing create-membership/history convention.
- Role presets remain permission bundles; no code checks President/Head/Admin role names.
- The full integration suite requires Docker/Testcontainers. Unit tests remain runnable without Docker; CI or a Docker-enabled environment must run the complete acceptance suite.

## Verification target

Phase 2 is complete only when compilation succeeds, Flyway migrates a clean database and a Phase 1 schema, all existing tests and new unit/integration/acceptance tests pass, scope/ownership/concurrency cases are covered, API catalog/OpenAPI/README agree with the implementation, and the final review finds no unaddressed critical or important issue.
