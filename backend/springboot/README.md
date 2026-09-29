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
