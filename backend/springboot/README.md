# Club backend

Spring Boot service for the VJU club management system.

## Local development

Start PostgreSQL from the repository root:

```bash
docker compose up -d postgres
```

Run the backend:

```bash
./mvnw spring-boot:run
```

The service applies Flyway migrations from `src/main/resources/db/migration` on startup. See the repository [database guide](../../docs/database/README.md) and [API catalog](../../docs/api/README.md) for the current inventory.

Run tests with:

```bash
./mvnw test
```

## Current implementation status

The REST controllers and services under `src/main/java/com/vju/club` implement all 36 phase-1 routes. The public catalog is available at `GET /api/v1/api-catalog`, and the packaged OpenAPI YAML is available at `GET /api-docs/phase1.yaml`.

The database is PostgreSQL. Flyway records migration state in `flyway_schema_history` and creates the eight phase-1 tables documented in `../../docs/database/README.md`.
