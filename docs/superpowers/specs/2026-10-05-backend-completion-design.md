# Backend completion design

## Goal

Make `backend/springboot` the production-shaped backend for the VJU Clubs system. The service must expose the documented phase-one API, persist all business state in PostgreSQL through JPA and Flyway, enforce authentication and scoped permissions centrally, and prove the main workflows with automated tests.

## Architecture

- Keep the `com.vju.club` package structure on `main` as the source of truth.
- Keep controllers thin; put business rules and transaction boundaries in services.
- Use PostgreSQL constraints and Flyway migrations as the final integrity boundary.
- Use JWT access tokens plus hashed, rotating refresh tokens for stateless API authentication.
- Resolve direct grants and role grants through the effective-permissions view and enforce scope through `PermissionAuthorizationService`.
- Emit RFC 7807 errors with stable codes and keep the OpenAPI/catalog documents synchronized with routes.

## Completion gates

1. Contract tests pass and every catalog operation has a controller, permission annotation/requirement, typed response, and error documentation.
2. Unit tests pass for authentication, permissions, services, security filters, entities, configuration, migrations, and error handling.
3. PostgreSQL integration tests pass for authentication, refresh/logout, scoped authorization, CRUD flows, concurrency/constraint races, audit logs, rate limits, and role permissions.
4. Runtime startup applies Flyway migrations without demo credentials unless explicitly enabled by the local profile and environment.
5. The final working tree contains no unexplained build or test failures and preserves unrelated user files.

## Validation sequence

Run the contract suite, then `./mvnw test` with Docker/Testcontainers available. If the container runtime is unavailable, start the repository test PostgreSQL service and rerun the same suite against `TEST_DB_URL` before declaring the backend complete.
