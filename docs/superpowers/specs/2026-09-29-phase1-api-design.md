# Phase 1 End-to-End API Design

## Goal
Implement the complete phase-1 REST API for the VJU club management system and publish an OpenAPI contract for frontend consumers.

## Scope
Authentication, current profile, user administration, clubs, departments, memberships, department membership assignment, and permission management. All endpoints use `/api/v1`, JSON, UUID identifiers, UTC timestamps, JWT bearer access tokens, refresh-token rotation, RFC 7807 errors, and paginated list responses.

## Runtime architecture
Spring MVC controllers call module services. Services enforce validation, ownership/scope rules, and transactions through Spring Data repositories. Entities map the existing Flyway schema. `docs/api/openapi.yaml` is the frontend contract; Swagger UI is exposed from the backend and includes operation status metadata. Security uses stateless JWT access tokens and hashed persisted refresh tokens.

## API conventions
List responses are `{data: [...], meta: {page, size, totalElements, totalPages}}`; writes return resource JSON; deletes/status changes return the updated resource or 204 as documented. Errors are `application/problem+json` with `type`, `title`, `status`, `detail`, `instance`, and `code`. Permissions are checked with method security and scope-aware service checks. All mutations audit permission grants/revokes.

## Modules
Auth (`/auth`), users (`/users`), clubs (`/clubs`), departments (`/departments`), memberships (`/memberships`), department members (`/departments/{id}/members`), and permissions (`/permissions`, `/users/{id}/permissions`). Each module has DTOs, controller, service interface/implementation, repository queries, and tests. Existing catalog remains public and lists implementation status.

## Verification
Compile and run Maven tests; run migration tests and controller/service tests; validate `docs/api/openapi.yaml` syntax and route parity with catalog; run `docker compose config` and a PostgreSQL smoke test where Docker is available.
