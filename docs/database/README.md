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
| `V6__audit_log_and_membership_timestamps.sql` | General `audit_logs`, membership `created_at`/`updated_at`, the `audit.view` permission |
| `V7__club_applications.sql` | `club_applications`, pending-application uniqueness, application permissions, and `APPLICATION` audit resource support |
| `V8__notifications.sql` | `notifications`, user/time index, and automatic `updated_at` maintenance |
| `V9__created_by_updated_by.sql` | Adds `created_by` and `updated_by` audit columns across domain tables |
| `V10__documents.sql` | Club documents (`documents`, `document_versions`) and `document.*` permissions |
| `V11__admin_creates_accounts.sql` | Admin-provisioned account workflow (`user.create`, `user.reset_password`) |
| `V12__http_sessions.sql` | Spring Session JDBC tables (`spring_session`, `spring_session_attributes`) replacing refresh tokens |
| `V13__password_change_required.sql` | `users.requires_password_change` enforcement flag |
| `V14__events_tasks_chat_and_ai.sql` | Events, event registrations/attendances, tasks, chat channels/messages, and AI summaries |
| `V15__google_sign_in.sql` | Google OAuth account linking (`google_subject`) for VJU student emails |
| `V16__club_member_role_for_members.sql` | Automatic `granted_on_join` (`CLUB_MEMBER`) role synchronization with active memberships |
| `V17__user_delete_and_application_forms.sql` | Dynamic club application forms (`club_application_forms`), attachments (`club_application_files`), and `user.delete` |
| `V18__locked_status_and_club_positions.sql` | Account `LOCKED` status and club/department position `max_holders` rules |
| `V19__system_settings.sql` | Global `system_settings` (`max_pending_applications`, `reapply_cooldown_days`, `max_active_clubs`) |
| `V20__sprint2_membership_application_notification_hardening.sql` | Reviewer-only `club_applications.internal_note`, notification `reference_type` & idempotent `event_key` (`uq_notifications_user_event_key`), and `effective_user_permissions` suppression of `CLUB`/`DEPARTMENT` grants when membership is `SUSPENDED` |
| `V21__sprint3_sprint4_operations_completion.sql` | Sprint 3 & 4 operations completion: `events.completed_at`, `event_registrations.event_role`, `event_attendances` (`EXCUSED`, `edit_reason`, `@Version` optimistic locking), `tasks` (`parent_task_id` 1-level hierarchy, `overdue_notified_at`, `CANCELLED`), `users.anonymized_at` PII anonymization support, `system_settings.attendance_edit_window_hours` (`0..720`, default `48`), `ON DELETE RESTRICT` historical FKs, and permissions `event.attendance_edit` & `task.update` |
| `V22__club_media_storage.sql` | Club logo and cover binary storage metadata columns (`logo_storage_key`, `logo_content_type`, `logo_size_bytes`, `logo_updated_at`, `cover_storage_key`, `cover_content_type`, `cover_size_bytes`, `cover_updated_at`) on `clubs` |
| `V23__i18n_translations_cache.sql` | Persistent AI translation cache table `i18n_translations` (`source_hash`, `target_lang`, `source_text`, `translated_text`, unique constraint `uq_i18n_translations_hash_lang`) |
| `V24__more_system_settings.sql` | Expands `system_settings` with admin-tunable operational & upload limits (`allow_self_registration`, `attendance_opens_before_minutes`, `event_task_grace_days`, `chat_summaries_per_hour`, `chat_max_message_length`, `document_max_file_mb`, `club_image_max_mb`, `avatar_max_mb`) |

Tables: `users`, `clubs`, `departments`, `memberships`, `department_members`, `permissions`, `user_permissions`, `roles`, `role_permissions`, `user_roles`, `permission_audit_logs`, `audit_logs`, `spring_session`, `spring_session_attributes`, `club_applications`, `club_application_forms`, `club_application_files`, `notifications`, `documents`, `document_versions`, `events`, `event_registrations`, `event_attendances`, `tasks`, `chat_channels`, `chat_messages`, `ai_summaries`, `system_settings`, `i18n_translations`; view `effective_user_permissions` (active direct grants plus active role assignments, used by every authorization check). Flyway records applied migrations in `flyway_schema_history`. Migrations seed the permission catalog and system roles only; no sample users, clubs, or memberships are created.

### Integrity rules enforced by PostgreSQL

| Rule | How |
|---|---|
| Email, student code, club code and department name (per club) are unique ignoring case | Unique indexes on `lower(...)`: `uq_users_email_ci`, `uq_users_student_code_ci`, `uq_clubs_code_ci`, `uq_departments_club_name_ci` |
| A department member belongs to the department's club | `department_members.club_id` with composite FKs `fk_department_members_department_club` → `departments(id, club_id)` and `fk_department_members_membership_club` → `memberships(id, club_id)` |
| `left_at` is set exactly when a membership is `LEFT` | `ck_memberships_left_at` |
| A user has at most one current membership per club; `LEFT` rows are history | partial unique index `uq_memberships_user_club_current` |
| A user has at most one pending application per club | partial unique index `uq_club_applications_pending`; `club_applications` also checks status/reviewer/cancellation consistency |
| Application message, review note, and internal note stay within API bounds | `VARCHAR(2000)` (`message`) and `VARCHAR(1000)` (`review_note`, `internal_note`) columns |
| Suspended club members temporarily lose club and department privileges | `effective_user_permissions` view excludes `CLUB` and `DEPARTMENT` role/direct grants in any club where the user has a `SUSPENDED` membership |
| Notifications are user-owned, deduplicated per event, and indexed by recency | `notifications.user_id` FK with `idx_notifications_user_created` and partial unique index `uq_notifications_user_event_key (user_id, event_key)` |
| Grant scope matches its target, and an active grant is never duplicated | `ck_user_permissions_scope`, partial unique indexes `uq_user_permissions_active_*` |
| `revoked_by` only exists on revoked grants | `ck_user_permissions_revoked_by`, `ck_user_roles_revoked_by` |
| Grants and role assignments are made at the item's scope or broader | triggers `trg_user_permissions_grant_scope`, `trg_user_roles_grant_scope` (`ck_*_grant_scope`) |
| A role only bundles permissions no broader than its scope | trigger `trg_role_permissions_scope` (`ck_role_permissions_scope`) |
| An active role assignment is never duplicated | partial unique indexes `uq_user_roles_active_*` |
| Each audit row is about exactly one permission or one role | `ck_permission_audit_subject` |
| `audit_logs` is append-only and its values are valid JSON | trigger `trg_audit_logs_append_only` (`ck_audit_logs_append_only`), `ck_audit_logs_old_value_json`, `ck_audit_logs_new_value_json` |
| `permission_key` is `module.action` | `ck_permissions_key_matches_module_action` |
| Audit history is immutable | `permission_audit_logs` FKs are `ON DELETE RESTRICT`; clubs and departments are deactivated, never deleted |
| User deletion preserves club operational history | Historical FKs on `club_applications`, `event_registrations`, `event_attendances`, `tasks`, `documents`, `chat_messages`, and `ai_summaries` use `ON DELETE RESTRICT`; accounts with operational/audit history are anonymized in-place (`users.anonymized_at`, `USER_ANONYMIZED`) rather than hard-deleted |
| Subtasks stay 1-level and within club bounds | `tasks.parent_task_id` self-FK (`ON DELETE RESTRICT`) indexed by `idx_tasks_parent`, enforced to 1 level (`parent.parentTaskId == null`) and `deadline <= parent.deadline` |
| Post-completion attendance edits are conflict-safe | `event_attendances.version` optimistic lock + `edit_reason` + configurable `system_settings.attendance_edit_window_hours` (`0..720`) |
| Club media metadata stays synchronized with object storage | `clubs` tracks `logo_storage_key`, `logo_content_type`, `logo_size_bytes`, `logo_updated_at`, `cover_storage_key`, `cover_content_type`, `cover_size_bytes`, and `cover_updated_at` (`V22`) |
| AI translation cache entries are deduplicated per hash and target language | `i18n_translations` enforces `uq_i18n_translations_hash_lang (source_hash, target_lang)` and indexes `idx_i18n_translations_lang` (`V23`) |
| `updated_at` follows every update | `set_updated_at()` trigger on `users`, `clubs`, `departments` (keeps a value the statement sets itself) |
| Notifications are user-owned and indexed by recency | `notifications.user_id` foreign key with `idx_notifications_user_created` |

Every foreign-key column is indexed, and list queries are backed by `idx_memberships_club_joined` and `idx_department_members_department_joined`. Repository lookups use `lower(...)` so they hit the case-insensitive indexes.

V3 checks existing data first and aborts with a readable message if values collide by case or a department member crosses clubs; merge or fix those rows, then restart. Memberships whose `left_at` contradicts their status are corrected automatically (status wins).

### Maintenance

Spring Session JDBC automatically cleans up expired HTTP sessions in `spring_session`, and `TaskOverdueScheduler` runs periodically (`markOverdueTasks()`) to flag overdue tasks and send idempotent `TASK_OVERDUE` notifications (`overdue_notified_at`) without overwriting `TODO`/`IN_PROGRESS` task statuses.

Check the local database with:

```bash
docker compose exec postgres psql -U club -d club -c '\\dt'
docker compose exec postgres psql -U club -d club -c 'select permission_key from permissions order by permission_key;'
```

Stop the local service with `docker compose down`. Add `-v` only when you intentionally want to delete the local PostgreSQL volume and start from an empty database.
