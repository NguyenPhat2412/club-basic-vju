-- V14: events & schedules (TC05-TC07), tasks & progress tracking (TC08-TC10),
-- internal club/department chat channels, and AI assistant summaries.

-- ---------------------------------------------------------------------------------------------
-- 1. Events & Schedules
-- ---------------------------------------------------------------------------------------------
CREATE TABLE events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments (id) ON DELETE RESTRICT,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(4000),
    event_type VARCHAR(32) NOT NULL DEFAULT 'CLUB_EVENT',
    location VARCHAR(300),
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    registration_deadline TIMESTAMPTZ NOT NULL,
    allow_ctv BOOLEAN NOT NULL DEFAULT FALSE,
    max_participants INT,
    status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_events_type CHECK (event_type IN ('CLUB_EVENT', 'MEETING', 'WORKSHOP', 'RECRUITMENT')),
    CONSTRAINT ck_events_status CHECK (status IN ('DRAFT', 'OPEN_REGISTRATION', 'CLOSED_REGISTRATION', 'COMPLETED', 'CANCELLED')),
    CONSTRAINT ck_events_time_order CHECK (start_time < end_time AND registration_deadline <= start_time),
    CONSTRAINT ck_events_max_participants CHECK (max_participants IS NULL OR max_participants > 0)
);

CREATE INDEX idx_events_club_start ON events (club_id, start_time DESC);
CREATE INDEX idx_events_department ON events (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_events_status_start ON events (status, start_time);
CREATE TRIGGER trg_events_updated_at BEFORE UPDATE ON events
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_registrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    participant_type VARCHAR(16) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'REGISTERED',
    note VARCHAR(500),
    registered_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    cancelled_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_event_registrations_type CHECK (participant_type IN ('MEMBER', 'CTV')),
    CONSTRAINT ck_event_registrations_status CHECK (status IN ('REGISTERED', 'CANCELLED')),
    CONSTRAINT ck_event_registrations_cancelled CHECK (
        (status = 'REGISTERED' AND cancelled_at IS NULL)
        OR (status = 'CANCELLED' AND cancelled_at IS NOT NULL)
    )
);

CREATE UNIQUE INDEX uq_event_registrations_active
    ON event_registrations (event_id, user_id)
    WHERE status = 'REGISTERED';
CREATE INDEX idx_event_registrations_event ON event_registrations (event_id, status, registered_at);
CREATE INDEX idx_event_registrations_user ON event_registrations (user_id, status, registered_at DESC);
CREATE TRIGGER trg_event_registrations_updated_at BEFORE UPDATE ON event_registrations
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE event_attendances (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL,
    note VARCHAR(500),
    checked_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    checked_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT uq_event_attendances_event_user UNIQUE (event_id, user_id),
    CONSTRAINT ck_event_attendances_status CHECK (status IN ('PRESENT', 'ABSENT', 'LATE'))
);

CREATE INDEX idx_event_attendances_event ON event_attendances (event_id, status);
CREATE INDEX idx_event_attendances_user ON event_attendances (user_id, checked_at DESC);
CREATE INDEX idx_event_attendances_checked_by ON event_attendances (checked_by);
CREATE TRIGGER trg_event_attendances_updated_at BEFORE UPDATE ON event_attendances
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 2. Tasks & Progress Tracking
-- ---------------------------------------------------------------------------------------------
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments (id) ON DELETE RESTRICT,
    event_id UUID REFERENCES events (id) ON DELETE SET NULL,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(4000),
    priority VARCHAR(16) NOT NULL DEFAULT 'MEDIUM',
    status VARCHAR(16) NOT NULL DEFAULT 'TODO',
    progress_percent INT NOT NULL DEFAULT 0,
    deadline TIMESTAMPTZ NOT NULL,
    assignee_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    assigner_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    progress_note VARCHAR(2000),
    report_link VARCHAR(1000),
    verified_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_tasks_priority CHECK (priority IN ('LOW', 'MEDIUM', 'HIGH')),
    CONSTRAINT ck_tasks_status CHECK (status IN ('TODO', 'IN_PROGRESS', 'DONE', 'COMPLETED', 'OVERDUE')),
    CONSTRAINT ck_tasks_progress CHECK (progress_percent BETWEEN 0 AND 100)
);

CREATE INDEX idx_tasks_club_status ON tasks (club_id, status, deadline);
CREATE INDEX idx_tasks_department ON tasks (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_tasks_event ON tasks (event_id) WHERE event_id IS NOT NULL;
CREATE INDEX idx_tasks_assignee ON tasks (assignee_id, status, deadline);
CREATE INDEX idx_tasks_assigner ON tasks (assigner_id);
CREATE INDEX idx_tasks_verified_by ON tasks (verified_by) WHERE verified_by IS NOT NULL;
CREATE INDEX idx_tasks_overdue_scan ON tasks (deadline) WHERE status IN ('TODO', 'IN_PROGRESS');
CREATE TRIGGER trg_tasks_updated_at BEFORE UPDATE ON tasks
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 3. Internal Chat Channels, Messages & AI Bot Summaries
-- ---------------------------------------------------------------------------------------------
CREATE TABLE chat_channels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments (id) ON DELETE RESTRICT,
    event_id UUID REFERENCES events (id) ON DELETE SET NULL,
    name VARCHAR(160) NOT NULL,
    channel_type VARCHAR(32) NOT NULL DEFAULT 'CLUB_GENERAL',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_chat_channels_type CHECK (channel_type IN ('CLUB_GENERAL', 'DEPARTMENT', 'EVENT_THREAD'))
);

CREATE INDEX idx_chat_channels_club ON chat_channels (club_id, created_at);
CREATE INDEX idx_chat_channels_department ON chat_channels (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_chat_channels_event ON chat_channels (event_id) WHERE event_id IS NOT NULL;
CREATE TRIGGER trg_chat_channels_updated_at BEFORE UPDATE ON chat_channels
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE chat_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    sender_id UUID REFERENCES users (id) ON DELETE RESTRICT,
    sender_type VARCHAR(16) NOT NULL DEFAULT 'USER',
    content VARCHAR(4000) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_chat_messages_sender_type CHECK (sender_type IN ('USER', 'AI_BOT'))
);

CREATE INDEX idx_chat_messages_channel_created ON chat_messages (channel_id, created_at DESC);
CREATE INDEX idx_chat_messages_sender ON chat_messages (sender_id) WHERE sender_id IS NOT NULL;
CREATE TRIGGER trg_chat_messages_updated_at BEFORE UPDATE ON chat_messages
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE ai_summaries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    channel_id UUID NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    requested_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    message_count INT NOT NULL,
    summary TEXT NOT NULL,
    decisions_json TEXT NOT NULL DEFAULT '[]',
    suggested_tasks_json TEXT NOT NULL DEFAULT '[]',
    suggested_events_json TEXT NOT NULL DEFAULT '[]',
    model VARCHAR(64) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);

CREATE INDEX idx_ai_summaries_channel ON ai_summaries (channel_id, created_at DESC);
CREATE INDEX idx_ai_summaries_requested_by ON ai_summaries (requested_by);
CREATE TRIGGER trg_ai_summaries_updated_at BEFORE UPDATE ON ai_summaries
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 4. Permissions, Role Mappings & Audit Resource Types
-- ---------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('event.view', 'event', 'view', 'CLUB', 'View club events and schedules'),
    ('event.create', 'event', 'create', 'CLUB', 'Create club events and schedules'),
    ('event.update', 'event', 'update', 'CLUB', 'Update club events and schedules'),
    ('event.attendance', 'event', 'attendance', 'DEPARTMENT', 'Record event attendance'),
    ('task.view', 'task', 'view', 'DEPARTMENT', 'View club and department tasks'),
    ('task.create', 'task', 'create', 'DEPARTMENT', 'Create and assign tasks'),
    ('task.verify', 'task', 'verify', 'DEPARTMENT', 'Verify completed tasks'),
    ('chat.view', 'chat', 'view', 'CLUB', 'View club chat channels and messages'),
    ('chat.send', 'chat', 'send', 'CLUB', 'Send messages in club chat channels'),
    ('chat.summarize', 'chat', 'summarize', 'CLUB', 'Summarize chat discussions with AI bot'),
    ('notification.send', 'notification', 'send', 'DEPARTMENT', 'Send broadcast notifications to club or department')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON (
       (r.code IN ('SYSTEM_ADMIN', 'CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
        AND p.permission_key IN (
            'event.view', 'event.create', 'event.update', 'event.attendance',
            'task.view', 'task.create', 'task.verify',
            'chat.view', 'chat.send', 'chat.summarize',
            'notification.send'))
    OR (r.code = 'DEPARTMENT_HEAD'
        AND p.permission_key IN ('event.attendance', 'task.view', 'task.create', 'task.verify', 'notification.send'))
)
ON CONFLICT DO NOTHING;

ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT',
     'APPLICATION', 'DOCUMENT', 'EVENT', 'TASK', 'CHAT_CHANNEL', 'NOTIFICATION'));
