# Club backend

Spring Boot service for the VJU club management system.

## Local development

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Run the backend with the `local` profile (it supplies a development JWT secret and can bootstrap an admin via `BOOTSTRAP_ADMIN_EMAIL`/`BOOTSTRAP_ADMIN_PASSWORD`):

```bash
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Any other profile requires `JWT_SECRET` (at least 32 bytes); startup fails without it. Behind a reverse proxy, `server.forward-headers-strategy=native` makes the rate limiter see the real client IP (only private/loopback proxies are trusted).

The service applies Flyway migrations from `src/main/resources/db/migration` on startup. See the repository [database guide](../../docs/database/README.md) and [API catalog](../../docs/api/README.md) for the current inventory.

Run tests with (integration tests need the test database from the repository root):

```bash
docker compose -f ../../docker-compose.test.yml up -d
./mvnw test
```

Integration tests live in `src/test/java/com/vju/club/integration` and extend `ApiIntegrationTest`, which gives each run an isolated PostgreSQL schema plus an `admin` (all permissions) and a `member` (none).

## Error model

Every error is `application/problem+json` with a stable `code`. Framework errors keep their real status (`NOT_FOUND`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `VALIDATION_ERROR`); unique-constraint races become `409` with the same code as the service-level check (for example `EMAIL_ALREADY_EXISTS`, `STUDENT_CODE_ALREADY_EXISTS`, `CLUB_CODE_ALREADY_EXISTS`). Callers without a global grant get `403` for ids that do not exist, so ids cannot be probed.

## Current implementation status

The REST controllers and services under `src/main/java/com/vju/club` implement all 36 phase-1 routes. The public catalog is available at `GET /api/v1/api-catalog`, and the packaged OpenAPI YAML is available at `GET /api-docs/phase1.yaml`.

The database is PostgreSQL. Flyway records migration state in `flyway_schema_history` and creates the eight phase-1 tables documented in `../../docs/database/README.md`.
