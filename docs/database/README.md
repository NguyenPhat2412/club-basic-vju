# Database

The system database is PostgreSQL. Local development runs it from the repository root with Docker Compose:

```bash
docker compose up -d postgres
```

The Spring Boot backend connects to `jdbc:postgresql://localhost:5432/club` by default and runs Flyway migrations from `backend/springboot/src/main/resources/db/migration/`. Override `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` when connecting to another database.

## Current schema

Migration `V1__create_phase1_schema.sql` creates these phase-1 tables:

- `users`
- `clubs`
- `departments`
- `memberships`
- `department_members`
- `permissions`
- `user_permissions`
- `permission_audit_logs`

Flyway also records applied migrations in `flyway_schema_history`. The migration seeds the permission catalog only; it does not create sample users, clubs, or memberships.

Check the local database with:

```bash
docker compose exec postgres psql -U club -d club -c '\\dt'
docker compose exec postgres psql -U club -d club -c 'select permission_key from permissions order by permission_key;'
```

Stop the local service with `docker compose down`. Add `-v` only when you intentionally want to delete the local PostgreSQL volume and start from an empty database.
