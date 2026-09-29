# Club Platform Foundation Design

## Context and current state

The repository contains a placeholder `backend/springboot` tree with empty Java classes and no Maven build, datasource configuration, database migration, or runnable Docker service. The supplied `development.zip` is a generated Spring Boot 4.1.1 project. It contains a Maven build with Spring Web MVC, Spring Security, Flyway, PostgreSQL, SpringDoc, Testcontainers, Docker Compose support, and a `compose.yaml` containing PostgreSQL and Redis, but it has no domain migrations or API implementation.

The generated project is source material for synchronizing the repository. Its `HELP.md` is tool-generated documentation, not an additional product requirement. The product requirements are the user's phase-1 club-management brief and the requested Flyway/PostgreSQL/Docker/REST structure.

## Goals

1. Make `backend/springboot` a runnable Spring Boot service using the generated project configuration as its build baseline.
2. Run PostgreSQL locally through the repository's root `docker-compose.yml` with stable, explicit development credentials and a persistent volume.
3. Configure the application to connect to that database and run Flyway automatically on startup.
4. Add a first migration that records the phase-1 identity, club, department, membership, permission, and permission-audit data model.
5. Add a `Rest` package as the single location for HTTP controllers and a small catalog endpoint that exposes the API inventory and implementation status.
6. Maintain a human-readable API catalog under `docs/api/` that identifies the owning backend (`backend/springboot`) and distinguishes `IMPLEMENTED` from `PLANNED` endpoints.
7. Make the local setup verifiable with Maven tests and a documented Docker/Flyway smoke check.

## Non-goals

- Implementing the complete authentication, authorization, club, department, membership, and permission business logic in this synchronization change.
- Adding Redis runtime behavior; the generated Redis service and dependency remain out of the first database migration scope.
- Introducing a second backend or a production deployment configuration.
- Treating empty placeholder classes as working endpoints.

## Architecture

`backend/springboot` is the only backend in this phase. Java sources will live under the standard Maven path `src/main/java/com/vju/club`, with `com.vju.club` as the root package. HTTP adapters live under `com.vju.club.rest` (directory `Rest` is represented by the package path using the repository's existing naming convention only where compatibility requires it); services and persistence will be added under separate packages as they become implemented.

The root `docker-compose.yml` owns local infrastructure. It exposes PostgreSQL on `localhost:5432`, stores data in a named volume, and uses environment-variable overrides with safe development defaults. The application uses `application.yml` plus an optional `application-local.yml`, with datasource settings supplied by environment variables. Flyway runs against the same datasource before the application serves requests.

The API catalog is static source-of-truth metadata in `docs/api/catalog.yml` and is also exposed by a read-only `GET /api/v1/api-catalog` endpoint. The endpoint is intentionally a catalog/status endpoint; it does not claim that `PLANNED` entries are callable.

## Database model (migration V1)

Flyway migration `V1__create_phase1_schema.sql` creates these PostgreSQL tables:

- `users`: UUID id, unique email, password hash, full name, student code, phone, avatar URL, account status, created/updated timestamps.
- `clubs`: UUID id, unique club code, name, logo URL, cover URL, description, activity field, contact email, status, created/updated timestamps.
- `departments`: UUID id, club foreign key, name, description, status, created/updated timestamps; unique name per club.
- `memberships`: UUID id, user and club foreign keys, membership status, joined/left timestamps; unique user per club.
- `department_members`: UUID id, department and membership foreign keys, joined timestamp; unique membership per department.
- `permissions`: UUID id, unique permission key, module, action, scope, description, active flag, created timestamp.
- `user_permissions`: UUID id, user and permission foreign keys, optional club/department scope, granted-by user, granted timestamp, revoked timestamp; uniqueness prevents duplicate active grants for the same scoped subject.
- `permission_audit_logs`: UUID id, actor, target user, permission, action (`GRANT`/`REVOKE`), optional scope references, reason, created timestamp.

Foreign keys use restrictive behavior for principal records and cascading behavior only for join rows. Status and action fields use PostgreSQL `CHECK` constraints. Indexes cover lookup by email/code, club membership, department membership, permission key, and audit target/time.

The migration also seeds the phase-1 permission catalog from the supplied brief. Seed data is idempotent with `ON CONFLICT` and does not create users, clubs, or memberships.

## REST catalog and initial implementation

`com.vju.club.rest.ApiCatalogController` serves the catalog endpoint. It returns a stable JSON array with `method`, `path`, `module`, `backend`, `status`, `authRequired`, and `permission` fields. The initial catalog marks only the catalog endpoint as `IMPLEMENTED`; phase-1 authentication, profile, club, department, membership, department-member, and permission-management routes are listed as `PLANNED` until their controllers and service tests exist.

The catalog includes the endpoint families below:

- Authentication: register, login, logout, refresh token, current account.
- User/profile: current profile, update profile, account list/detail, activate/deactivate.
- Club: list/detail/create/update/activate/deactivate.
- Department: list/detail/create/update/activate/deactivate.
- Membership: list/detail/add/update status/remove.
- Department member: list/add/move/remove.
- Permission management: list, grant, revoke.

All listed routes belong to `backend/springboot`; no frontend or separate backend is assigned ownership.

## Configuration and local flow

1. `docker compose up -d postgres` starts PostgreSQL with a named volume and health check.
2. The application starts with `SPRING_PROFILES_ACTIVE=local` (or equivalent local defaults), resolves datasource settings, and Flyway applies migrations from `classpath:db/migration`.
3. `mvn test` runs context and migration-focused tests without depending on an already-running local database; Testcontainers is used where Docker is available.
4. The API catalog endpoint can be queried after startup, and PostgreSQL's `flyway_schema_history` plus the created phase-1 tables verify that the database is being recorded by the system.

## Error and security boundaries

The synchronization exposes only catalog metadata and does not bypass authentication. Business endpoints remain planned and must later use Spring Security and permission checks from the phase-1 brief. Passwords are represented only by a `password_hash` column; no plaintext password field is introduced. Scope columns and audit log tables are present so later implementations can enforce club/department boundaries and record grants/revocations.

## Verification criteria

- The Maven project compiles and its context test passes.
- `docker compose config` validates the local PostgreSQL service.
- With PostgreSQL running, application startup completes Flyway migration V1 exactly once and is repeatable on restart.
- The catalog endpoint returns JSON and labels the implemented endpoint correctly while retaining planned phase-1 entries.
- PostgreSQL contains `flyway_schema_history`, all eight phase-1 tables, constraints, indexes, and seeded permissions.
- Documentation states clearly that the pre-existing empty controller/entity classes were scaffolding and are not implemented APIs.
