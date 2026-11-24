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
| `V23__i18n_translations_cache.sql` | Persistent AI translation cache table `i18n_translations` (`source_hash`, `target_locale`, `source_text`, `translated_text`, unique constraint `uq_i18n_source_locale`) |
| `V24__more_system_settings.sql` | Expands `system_settings` with admin-tunable operational & upload limits (`allow_self_registration`, `attendance_opens_before_minutes`, `event_task_grace_days`, `chat_summaries_per_hour`, `chat_max_message_length`, `document_max_file_mb`, `club_image_max_mb`, `avatar_max_mb`) |
| `V25__realtime_chat_and_document_vault.sql` | Realtime group chat cursor index (`idx_chat_messages_channel_cursor`), message replies (`reply_to_id`), vault attachments (`document_id`), per-user read state table `chat_channel_reads`, and 3-tier centralized Document Vault (`documents.scope` `SYSTEM`/`CLUB`/`DEPARTMENT`, `department_id`, `visibility` with `ck_documents_scope_target`) |
| `V26__club_permissions_and_document_module.sql` | Club-scoped RBAC delegation (`permission.view/assign/revoke`, `role.view` widened to `CLUB`) and department-scoped operational grants for `CLUB_PRESIDENT`, `CLUB_VICE_PRESIDENT`, and `DEPARTMENT_HEAD` |
| `V27__club_custom_overview_config.sql` | Custom club overview configuration column `clubs.overview_config` (`ck_clubs_overview_config_object` JSON object check) seeded with archetype configs across all 12 VJU clubs |
| `V28__chat_media_and_quick_replies.sql` | Rich media chat attachments table `chat_message_attachments` (`IMAGE`/`VIDEO`/`FILE`, `checksum_sha256`, HTTP Range streaming support) and per-club quick replies table `chat_quick_replies` (`uq_chat_quick_replies_club_shortcut`) |
| `V29__chat_pinned_messages.sql` | Messenger-style pinned messages per channel (`chat_messages.pinned`, `pinned_at`, `pinned_by`, partial index `idx_chat_messages_channel_pinned`) |
| `V30__chat_message_delivery_status.sql` | Realtime chat delivery receipt tracking (`delivered_at`, `seen_at` & cursor indexes) |
| `V31__chat_message_reactions.sql` | Emoji reactions table `chat_message_reactions` (`UNIQUE(message_id, user_id, emoji)`) |
| `V32__index_chat_message_reactions_user_id.sql` | Indexes `chat_message_reactions.user_id` FK |
| `V33__password_reset_otp_and_mail_settings.sql` | `password_reset_otps` table and SMTP / OTP policy columns on `system_settings` |
| `V34__chat_message_edit.sql` | Soft edit/delete moderation metadata on `chat_messages` (`edited_at`, `deleted_at`, `deleted_by`) |
| `V35__youth_union_club_and_officer_membership_sync.sql` | Seeds `DOANVJU` (Youth Union as unit #13) and ensures officer role assignments maintain `ACTIVE` memberships |
| `V36__application_interview_scheduling.sql` | Interview scheduling columns on `club_applications` (`interview_at`, `interview_location`, `interview_note`, `interview_notified_at`) |
| `V37__event_submissions_and_internal_scope.sql` | Internal club-only events (`allow_ctv = false`), `events.requires_submission`, and `event_submissions` table |
| `V38__club_facebook_integration.sql` | `club_facebook_pages` (AES-256-GCM encrypted Page Access Token) and `club_facebook_posts` synced feed cache |
| `V39__anti_inflation_limits_and_quotas.sql` | Anti-inflation club resource quotas & broadcast/Facebook sync cooldowns on `system_settings` |
| `V40__club_facebook_permissions.sql` | Adds `club.facebook.view` and `club.facebook.manage` (`CLUB` scope) to RBAC catalog (total 63 permissions) |
| `V41__system_integration_settings_and_delegation.sql` | Live encrypted runtime integration overrides (Facebook OAuth, AI Gateway, Google SSO) on `system_settings`; lowers `permission.view/assign/revoke` & `role.view` to `DEPARTMENT` scope for subordinate delegation |
| `V42__index_club_facebook_pages_connected_by.sql` | Indexes `club_facebook_pages.connected_by` FK (`idx_club_facebook_pages_connected_by`) |
| `V43__facebook_auto_sync_settings.sql` | Adds `facebook_auto_sync_enabled` & `facebook_auto_sync_interval_minutes` (`15..1440`, default `60`) on `system_settings` plus `consecutive_sync_failures` & `last_auto_synced_at` on `club_facebook_pages` |

Tables: `users`, `clubs`, `departments`, `memberships`, `department_members`, `permissions`, `user_permissions`, `roles`, `role_permissions`, `user_roles`, `permission_audit_logs`, `audit_logs`, `spring_session`, `spring_session_attributes`, `club_applications`, `club_application_forms`, `club_application_files`, `notifications`, `documents`, `document_versions`, `events`, `event_registrations`, `event_attendances`, `event_submissions`, `tasks`, `chat_channels`, `chat_messages`, `chat_channel_reads`, `chat_message_attachments`, `chat_message_reactions`, `chat_quick_replies`, `ai_summaries`, `system_settings`, `i18n_translations`, `password_reset_otps`, `club_facebook_pages`, `club_facebook_posts`; view `effective_user_permissions` (active direct grants plus active role assignments, used by every authorization check). Flyway records applied migrations in `flyway_schema_history`. Migrations seed the 63-permission catalog, 5 system roles, club overview presets, and default quick-reply templates; sample users and memberships are only created under the `local` profile.

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
| AI translation cache entries are deduplicated per hash and target locale | `i18n_translations` enforces `uq_i18n_source_locale (source_hash, target_locale)` and indexes `idx_i18n_translations_locale` (`V23`) |
| Document Vault enforces 3-tier scope and visibility invariants | `documents` checks `ck_documents_scope_target` (`SYSTEM` has null `club_id`/`department_id`; `CLUB` requires `club_id`; `DEPARTMENT` requires both `club_id` and `department_id`) and deduplicates live names per tier (`V25`) |
| Custom club overview configs are valid JSON objects | `clubs.overview_config` enforces `ck_clubs_overview_config_object (jsonb_typeof(overview_config::jsonb) = 'object')` (`V27`) |
| Chat media kinds, quick-reply shortcuts, and pinned messages stay consistent | `chat_message_attachments` checks `ck_chat_message_attachments_kind` (`IMAGE`/`VIDEO`/`FILE`) & `size_bytes > 0`; `chat_quick_replies` enforces `uq_chat_quick_replies_club_shortcut (club_id, shortcut)` (`V28`); pinned messages are indexed via `idx_chat_messages_channel_pinned` (`V29`) |
| `updated_at` follows every update | `set_updated_at()` trigger on `users`, `clubs`, `departments` (keeps a value the statement sets itself) |
| Notifications are user-owned and indexed by recency | `notifications.user_id` foreign key with `idx_notifications_user_created` |

Every foreign-key column is indexed, and list queries are backed by `idx_memberships_club_joined` and `idx_department_members_department_joined`. Repository lookups use `lower(...)` so they hit the case-insensitive indexes.

V3 checks existing data first and aborts with a readable message if values collide by case or a department member crosses clubs; merge or fix those rows, then restart. Memberships whose `left_at` contradicts their status are corrected automatically (status wins).

### Maintenance

Spring Session JDBC automatically cleans up expired HTTP sessions in `spring_session`. Dedicated threads on `vjuTaskScheduler` (4-thread pool with graceful shutdown) run `TaskServiceImpl.markOverdueTasks()`, `ChatMediaService.purgeOrphanAttachments()`, and `ClubFacebookSyncScheduler.scheduledSync()` independently without starving each other.

Check the local database with:

```bash
docker compose exec postgres psql -U club -d club -c '\\dt'
docker compose exec postgres psql -U club -d club -c 'select permission_key from permissions order by permission_key;'
```

Stop the local service with `docker compose down`. Add `-v` only when you intentionally want to delete the local PostgreSQL volume and start from an empty database.
