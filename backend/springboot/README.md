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

The old controller/entity files in the repository were empty scaffolding and were not working APIs. The current REST package is `src/main/java/com/vju/club/rest`; only `GET /api/v1/api-catalog` is implemented. Phase-1 business routes are documented as planned in `../../docs/api/catalog.yml`.

The database is PostgreSQL. Flyway records migration state in `flyway_schema_history` and creates the eight phase-1 tables documented in `../../docs/database/README.md`.
