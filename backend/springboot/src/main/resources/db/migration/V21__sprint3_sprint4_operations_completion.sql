-- V21: Complete Sprint 3 & Sprint 4 operational rules, data integrity constraints, and permissions:
-- 1. Events & registrations: completed_at timestamp and per-event participant role (PB-21.4, PB-25.2).
-- 2. Event attendances: EXCUSED status, edit_reason, and optimistic locking version (PB-31, PB-60).
-- 3. Tasks: parent_task_id hierarchy, non-destructive overdue_notified_at, and CANCELLED status (PB-26.2, PB-29, PB-21.3).
-- 4. Users & history protection: anonymized_at column and RESTRICT foreign keys preventing cascade history loss (PB-38, PB-59).
-- 5. System settings: configurable post-completion attendance_edit_window_hours (PB-31, PB-60).
-- 6. Granular permissions: event.attendance_edit and task.update (PB-31, PB-27.1, PB-27.2, PB-44).

-- ---------------------------------------------------------------------------------------------
-- 1. Events & Registrations
-- ---------------------------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS completed_at TIMESTAMPTZ;

UPDATE events
SET completed_at = end_time
WHERE status = 'COMPLETED'
  AND completed_at IS NULL;

ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS event_role VARCHAR(100);

-- ---------------------------------------------------------------------------------------------
-- 2. Event Attendances (EXCUSED + edit_reason + @Version optimistic locking)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE event_attendances
    ADD COLUMN IF NOT EXISTS edit_reason VARCHAR(500),
    ADD COLUMN IF NOT EXISTS version BIGINT NOT NULL DEFAULT 0;

ALTER TABLE event_attendances DROP CONSTRAINT IF EXISTS ck_event_attendances_status;
ALTER TABLE event_attendances
    ADD CONSTRAINT ck_event_attendances_status
        CHECK (status IN ('PRESENT', 'ABSENT', 'LATE', 'EXCUSED'));

-- ---------------------------------------------------------------------------------------------
-- 3. Tasks (Subtasks + Non-destructive Overdue + CANCELLED)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS parent_task_id UUID REFERENCES tasks (id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS overdue_notified_at TIMESTAMPTZ;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_no_self_parent;
ALTER TABLE tasks
    ADD CONSTRAINT ck_tasks_no_self_parent
        CHECK (parent_task_id IS NULL OR parent_task_id <> id);

CREATE INDEX IF NOT EXISTS idx_tasks_parent
    ON tasks (parent_task_id);

-- Preserve execution state (IN_PROGRESS / TODO) on any previously marked OVERDUE rows (PB-29 AC03)
UPDATE tasks
SET overdue_notified_at = COALESCE(overdue_notified_at, updated_at),
    status = CASE WHEN progress_percent > 0 THEN 'IN_PROGRESS' ELSE 'TODO' END
WHERE status = 'OVERDUE';

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS ck_tasks_status;
ALTER TABLE tasks
    ADD CONSTRAINT ck_tasks_status
        CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'COMPLETED', 'OVERDUE', 'CANCELLED'));

DROP INDEX IF EXISTS idx_tasks_overdue_scan;
CREATE INDEX idx_tasks_overdue_scan
    ON tasks (deadline)
    WHERE status IN ('TODO', 'IN_PROGRESS') AND overdue_notified_at IS NULL;

-- ---------------------------------------------------------------------------------------------
-- 4. Users & Historical Integrity Hardening (PB-38, PB-59)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS anonymized_at TIMESTAMPTZ;

-- Prevent accidental cascade deletion of audit & operational history; UserServiceImpl anonymizes PII when history exists
ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_actor_user_id_fkey;
ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_target_user_id_fkey;
ALTER TABLE permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_actor_user_id_fkey
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT permission_audit_logs_target_user_id_fkey
        FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE club_applications DROP CONSTRAINT IF EXISTS club_applications_applicant_id_fkey;
ALTER TABLE club_applications
    ADD CONSTRAINT club_applications_applicant_id_fkey
        FOREIGN KEY (applicant_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_owner_id_fkey;
ALTER TABLE documents
    ADD CONSTRAINT documents_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE event_attendances DROP CONSTRAINT IF EXISTS event_attendances_user_id_fkey;
ALTER TABLE event_attendances
    ADD CONSTRAINT event_attendances_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigner_id_fkey;
ALTER TABLE tasks
    ADD CONSTRAINT tasks_assignee_id_fkey
        FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE RESTRICT,
    ADD CONSTRAINT tasks_assigner_id_fkey
        FOREIGN KEY (assigner_id) REFERENCES users (id) ON DELETE RESTRICT;

ALTER TABLE ai_summaries DROP CONSTRAINT IF EXISTS ai_summaries_requested_by_fkey;
ALTER TABLE ai_summaries
    ADD CONSTRAINT ai_summaries_requested_by_fkey
        FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------------------------
-- 5. System Settings (Post-COMPLETED Attendance Edit Window)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS attendance_edit_window_hours INT NOT NULL DEFAULT 48
        CHECK (attendance_edit_window_hours BETWEEN 0 AND 720);

-- ---------------------------------------------------------------------------------------------
-- 6. Permissions & Default Role Mappings (No hardcoded roles; strictly GLOBAL / CLUB / DEPARTMENT)
-- ---------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('event.attendance_edit', 'event', 'attendance_edit', 'DEPARTMENT', 'Edit existing event attendance records and post-completion corrections'),
    ('task.update', 'task', 'update', 'DEPARTMENT', 'Update task assignee, deadline, priority, or reopen unverified tasks')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    (r.code IN ('SYSTEM_ADMIN', 'CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
        AND p.permission_key IN ('event.attendance_edit', 'task.update'))
    OR (r.code = 'DEPARTMENT_HEAD'
        AND p.permission_key IN ('task.update'))
)
ON CONFLICT DO NOTHING;
