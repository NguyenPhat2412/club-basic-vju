# Database

The system database is PostgreSQL. Local development runs it from the repository root with Docker Compose:

```bash
docker compose up -d postgres
```

The Spring Boot backend connects to `jdbc:postgresql://localhost:5432/club` by default and runs Flyway migrations from `backend/springboot/src/main/resources/db/migration/`. Override `DB_URL`, `DB_USERNAME`, and `DB_PASSWORD` when connecting to another database.

## Current schema

| Migration | Purpose |
|---|---|
| `V1__create_phase1_schema.sql` | Phase-1 tables and the 25-permission catalog seed |
| `V2__create_refresh_tokens.sql` | `refresh_tokens` (SHA-256 hashes only) |
| `V3__harden_constraints_and_indexes.sql` | Moves application rules into the database and adds indexes |
| `V4__membership_history.sql` | Keeps membership history: at most one current (non-`LEFT`) membership per user and club |
| `V5__roles.sql` | Roles (`roles`, `role_permissions`, `user_roles`), the `effective_user_permissions` view, 5 system roles and the `role.*` permissions |

Tables: `users`, `clubs`, `departments`, `memberships`, `department_members`, `permissions`, `user_permissions`, `roles`, `role_permissions`, `user_roles`, `permission_audit_logs`, `refresh_tokens`; view `effective_user_permissions` (active direct grants plus active role assignments, used by every authorization check). Flyway records applied migrations in `flyway_schema_history`. Migrations seed the permission catalog only; no sample users, clubs, or memberships are created.

### Integrity rules enforced by PostgreSQL

| Rule | How |
|---|---|
| Email, student code, club code and department name (per club) are unique ignoring case | Unique indexes on `lower(...)`: `uq_users_email_ci`, `uq_users_student_code_ci`, `uq_clubs_code_ci`, `uq_departments_club_name_ci` |
| A department member belongs to the department's club | `department_members.club_id` with composite FKs `fk_department_members_department_club` → `departments(id, club_id)` and `fk_department_members_membership_club` → `memberships(id, club_id)` |
| `left_at` is set exactly when a membership is `LEFT` | `ck_memberships_left_at` |
| A user has at most one current membership per club; `LEFT` rows are history | partial unique index `uq_memberships_user_club_current` |
| Grant scope matches its target, and an active grant is never duplicated | `ck_user_permissions_scope`, partial unique indexes `uq_user_permissions_active_*` |
| `revoked_by` only exists on revoked grants | `ck_user_permissions_revoked_by`, `ck_user_roles_revoked_by` |
| Grants and role assignments are made at the item's scope or broader | triggers `trg_user_permissions_grant_scope`, `trg_user_roles_grant_scope` (`ck_*_grant_scope`) |
| A role only bundles permissions no broader than its scope | trigger `trg_role_permissions_scope` (`ck_role_permissions_scope`) |
| An active role assignment is never duplicated | partial unique indexes `uq_user_roles_active_*` |
| Each audit row is about exactly one permission or one role | `ck_permission_audit_subject` |
| `permission_key` is `module.action` | `ck_permissions_key_matches_module_action` |
| Audit history is immutable | `permission_audit_logs` FKs are `ON DELETE RESTRICT`; clubs and departments are deactivated, never deleted |
| `updated_at` follows every update | `set_updated_at()` trigger on `users`, `clubs`, `departments` (keeps a value the statement sets itself) |

Every foreign-key column is indexed, and list queries are backed by `idx_memberships_club_joined` and `idx_department_members_department_joined`. Repository lookups use `lower(...)` so they hit the case-insensitive indexes.

V3 checks existing data first and aborts with a readable message if values collide by case or a department member crosses clubs; merge or fix those rows, then restart. Memberships whose `left_at` contradicts their status are corrected automatically (status wins).

### Maintenance

`RefreshTokenCleanupJob` deletes refresh tokens that expired or were revoked more than `REFRESH_TOKEN_CLEANUP_RETENTION` (default `7d`) ago, on `REFRESH_TOKEN_CLEANUP_CRON` (default daily at 03:30).

Check the local database with:

```bash
docker compose exec postgres psql -U club -d club -c '\\dt'
docker compose exec postgres psql -U club -d club -c 'select permission_key from permissions order by permission_key;'
```

Stop the local service with `docker compose down`. Add `-v` only when you intentionally want to delete the local PostgreSQL volume and start from an empty database.
