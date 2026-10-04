# Club Platform Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Synchronize the generated Spring Boot project into `backend/springboot`, run PostgreSQL locally with Docker, apply a Flyway phase-1 schema, and expose a REST API catalog that distinguishes implemented and planned routes.

**Architecture:** `backend/springboot` becomes the only Maven backend with root package `com.vju.club`. PostgreSQL is owned by the repository root `docker-compose.yml`; the application connects through environment-backed local configuration and Flyway runs migrations from the classpath. A small REST catalog controller reads versioned YAML metadata and exposes it at `/api/v1/api-catalog`.

**Tech Stack:** Java 21, Spring Boot 4.1.1 (from `development.zip`), Maven Wrapper, Spring Web MVC, Spring Security, Spring JDBC, Flyway, PostgreSQL, Docker Compose, JUnit 5.

**Spec:** `docs/superpowers/specs/2026-09-29-club-platform-foundation-design.md`

## Global Constraints

- `backend/springboot` is the only backend in this phase.
- PostgreSQL runs locally through the repository root `docker-compose.yml` on `localhost:5432` with a named volume.
- Flyway migration files live under `backend/springboot/src/main/resources/db/migration/`.
- The first migration creates exactly the eight phase-1 tables and seeds permissions without creating users, clubs, or memberships.
- The API catalog marks only the catalog endpoint `IMPLEMENTED`; all business routes remain `PLANNED`.
- Passwords are represented only by `password_hash`; no plaintext password column is introduced.

## Review Focus

- Running `docker compose config` must accept the root compose file and expose PostgreSQL on a deterministic host port.
- Starting the application with the default local profile must resolve a PostgreSQL JDBC URL and run Flyway before serving the catalog.
- Re-running Flyway must be idempotent and must not duplicate seeded permissions.
- A catalog request must return the implemented catalog route and retain planned phase-1 routes without claiming they are callable.
- Scoped permission grants must not allow duplicate active global, club, or department assignments; the migration must enforce this with partial unique indexes.

---

### Task 1: Synchronize the Spring Boot module

**Files:**
- Create: `backend/springboot/pom.xml`
- Create: `backend/springboot/mvnw`, `backend/springboot/mvnw.cmd`, `backend/springboot/.mvn/wrapper/maven-wrapper.properties`
- Create: `backend/springboot/src/main/java/com/vju/club/ClubApplication.java`
- Create: `backend/springboot/src/test/java/com/vju/club/ClubApplicationTests.java`
- Delete: empty legacy tree `backend/springboot/src/main/com.vju.club/`
- Modify: `backend/springboot/README.md`

**Interfaces:**
- Produces the runnable Maven module and root package `com.vju.club` consumed by all later REST/configuration code.

- [ ] **Step 1: Copy the generated Maven wrapper and baseline build from `development.zip`**

Use the zip as the source for Maven wrapper files and Java 21/Spring Boot 4.1.1 coordinates. Keep only dependencies needed by this slice: Web MVC, Security, JDBC, Flyway, PostgreSQL, Jackson YAML, and test support. Remove generated Redis, Spring Cloud Config/Gateway, and repository REST dependencies because they are outside this phase's runtime behavior.

- [ ] **Step 2: Add `ClubApplication` and a context test**

Create `com.vju.club.ClubApplication` with `@SpringBootApplication`; add a JUnit context smoke test that can start with the test profile and does not require a pre-existing host database.

- [ ] **Step 3: Remove the noncompiled placeholder tree and document the synchronized module**

Delete the old `src/main/com.vju.club` empty classes so there is one canonical Maven source root. Update the backend README with build and run commands.

- [ ] **Step 4: Run the module test**

Run `./mvnw test` from `backend/springboot`. Expected: compilation succeeds and the context test passes.

- [ ] **Step 5: Commit**

```bash
git add backend/springboot
git commit -m "build: synchronize spring boot backend"
```

### Task 2: Add local PostgreSQL and Flyway schema

**Files:**
- Create: `docker-compose.yml`
- Create: `backend/springboot/src/main/resources/application.yml`
- Create: `backend/springboot/src/main/resources/application-local.yml`
- Create: `backend/springboot/src/main/resources/db/migration/V1__create_phase1_schema.sql`
- Create: `backend/springboot/src/test/resources/application-test.yml`
- Create: `docs/database/README.md`

**Interfaces:**
- Produces PostgreSQL service `postgres` and Flyway migration V1 consumed by the application startup and database checks.

- [ ] **Step 1: Define the root PostgreSQL Compose service**

Configure `postgres:16-alpine` with `POSTGRES_DB=club`, `POSTGRES_USER=club`, `POSTGRES_PASSWORD=club_local`, host mapping `5432:5432`, a named `club_postgres_data` volume, and a `pg_isready` health check. Do not add Redis to the root compose file.

- [ ] **Step 2: Add application datasource profiles**

Set `spring.application.name=club-backend`, Flyway locations to `classpath:db/migration`, and datasource values from `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` with local defaults `jdbc:postgresql://localhost:5432/club`, `club`, and `club_local`. The test profile disables external database startup only when a test does not exercise Flyway.

- [ ] **Step 3: Write `V1__create_phase1_schema.sql`**

Create `users`, `clubs`, `departments`, `memberships`, `department_members`, `permissions`, `user_permissions`, and `permission_audit_logs` with UUID keys, timestamps, foreign keys, status/action `CHECK` constraints, lookup indexes, scoped permission columns, and partial unique indexes for active global/club/department grants. Enable `pgcrypto` for `gen_random_uuid()` and seed the phase-1 permission keys with `ON CONFLICT DO NOTHING`.

- [ ] **Step 4: Add database setup documentation**

Document `docker compose up -d postgres`, `./mvnw spring-boot:run`, `docker compose down`, the local environment overrides, the expected Flyway history table, and SQL commands that list the eight created tables and seeded permissions.

- [ ] **Step 5: Validate the migration and Compose file**

Run `docker compose config` and `./mvnw test`. If Docker is available, run `docker compose up -d postgres`, start the app, query `flyway_schema_history` and the table list, then restart the app to verify no duplicate seed rows.

- [ ] **Step 6: Commit**

```bash
git add docker-compose.yml backend/springboot/src/main/resources docs/database/README.md
git commit -m "feat: add postgres and phase one flyway schema"
```

### Task 3: Add the REST API catalog

**Files:**
- Create: `backend/springboot/src/main/java/com/vju/club/rest/ApiCatalogEntry.java`
- Create: `backend/springboot/src/main/java/com/vju/club/rest/ApiCatalogService.java`
- Create: `backend/springboot/src/main/java/com/vju/club/rest/ApiCatalogController.java`
- Create: `backend/springboot/src/main/java/com/vju/club/config/SecurityConfig.java`
- Create: `backend/springboot/src/main/resources/api/catalog.yml`
- Create: `backend/springboot/src/test/java/com/vju/club/rest/ApiCatalogControllerTest.java`
- Modify: `backend/springboot/pom.xml`

**Interfaces:**
- `ApiCatalogEntry` is a Java record with `String method`, `String path`, `String module`, `String backend`, `String status`, `boolean authRequired`, and nullable `String permission`.
- `ApiCatalogService#entries()` returns an immutable `List<ApiCatalogEntry>` loaded from `classpath:api/catalog.yml`.
- `ApiCatalogController#getCatalog()` handles `GET /api/v1/api-catalog` and returns the catalog list as JSON.

- [ ] **Step 1: Add the failing catalog test**

Write a standalone MockMvc test for `GET /api/v1/api-catalog` that asserts HTTP 200, the catalog route is `IMPLEMENTED`, at least one authentication route is `PLANNED`, and every entry has backend `backend/springboot`.

- [ ] **Step 2: Run the focused test and verify it fails**

Run `./mvnw -Dtest=ApiCatalogControllerTest test`. Expected: failure because the REST catalog classes and resource do not exist.

- [ ] **Step 3: Implement YAML-backed catalog loading**

Add Jackson YAML support, load `api/catalog.yml` once in `ApiCatalogService`, fail startup with a clear exception when the resource is missing or malformed, and return an immutable list.

- [ ] **Step 4: Implement the controller and security boundary**

Expose the catalog endpoint without authentication. Configure CSRF appropriately for this read-only endpoint and require authentication for other requests until business endpoints are implemented.

- [ ] **Step 5: Add catalog metadata**

List the implemented catalog endpoint and the planned authentication, profile, club, department, membership, department-member, and permission-management routes with method, path, module, backend, auth, and permission values.

- [ ] **Step 6: Run the focused test and the full test suite**

Run `./mvnw -Dtest=ApiCatalogControllerTest test` and then `./mvnw test`. Expected: PASS for both.

- [ ] **Step 7: Commit**

```bash
git add backend/springboot/pom.xml backend/springboot/src/main/java/com/vju/club/rest backend/springboot/src/main/java/com/vju/club/config/SecurityConfig.java backend/springboot/src/main/resources/api backend/springboot/src/test/java/com/vju/club/rest
git commit -m "feat: expose rest api catalog"
```

### Task 4: Publish the API and system database inventory

**Files:**
- Create: `docs/api/catalog.yml`
- Modify: `docs/api/README.md`
- Modify: `README.md`
- Modify: `backend/springboot/README.md`

**Interfaces:**
- `docs/api/catalog.yml` mirrors the runtime catalog resource and identifies `backend/springboot` as the owner of every phase-1 route.

- [ ] **Step 1: Add the repository API inventory**

Copy the runtime catalog to `docs/api/catalog.yml`, document the status meaning (`IMPLEMENTED` means a real controller exists; `PLANNED` means no callable route exists yet), and state that all current entries are owned by `backend/springboot`.

- [ ] **Step 2: Document the database inventory**

Update the root and backend READMEs to state that the system records data in PostgreSQL through Flyway and list the eight phase-1 tables plus `flyway_schema_history`. Explicitly state that the old empty classes were scaffolding, not implemented APIs.

- [ ] **Step 3: Verify documentation and synchronization**

Run `git diff --check`, compare `docs/api/catalog.yml` with the runtime resource, run the Maven suite, and run `docker compose config`. Expected: no whitespace errors, matching catalogs, passing tests, and valid Compose configuration.

- [ ] **Step 4: Commit**

```bash
git add README.md backend/springboot/README.md docs/api docs/database
git commit -m "docs: publish api and database inventory"
```
