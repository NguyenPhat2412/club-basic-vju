-- V25: Realtime group chat collaboration (cursor pagination, read receipts, replies, document attachments)
-- and 3-tier centralized Document Vault permissions (SYSTEM / CLUB / DEPARTMENT + visibility).

-- ---------------------------------------------------------------------------------------------
-- 1. Chat Messages: Replies, Vault Document Attachments & Cursor Index
-- ---------------------------------------------------------------------------------------------
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS reply_to_id UUID REFERENCES chat_messages (id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS document_id UUID REFERENCES documents (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_cursor
    ON chat_messages (channel_id, created_at DESC, id DESC);

CREATE INDEX IF NOT EXISTS idx_chat_messages_reply_to
    ON chat_messages (reply_to_id) WHERE reply_to_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_document
    ON chat_messages (document_id) WHERE document_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- 2. Chat Channel Read State (Per-user unread counters)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_channel_reads (
    channel_id UUID NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    last_read_message_id UUID REFERENCES chat_messages (id) ON DELETE SET NULL,
    last_read_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (channel_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_chat_channel_reads_user
    ON chat_channel_reads (user_id);

CREATE INDEX IF NOT EXISTS idx_chat_channel_reads_last_message
    ON chat_channel_reads (last_read_message_id) WHERE last_read_message_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- 3. Documents: 3-Tier Scope (SYSTEM / CLUB / DEPARTMENT) & Visibility
-- ---------------------------------------------------------------------------------------------
ALTER TABLE documents
    ALTER COLUMN club_id DROP NOT NULL,
    ADD COLUMN IF NOT EXISTS scope VARCHAR(16) NOT NULL DEFAULT 'CLUB',
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES departments (id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS visibility VARCHAR(24) NOT NULL DEFAULT 'MEMBERS';

ALTER TABLE documents DROP CONSTRAINT IF EXISTS ck_documents_scope_target;
ALTER TABLE documents
    ADD CONSTRAINT ck_documents_scope_target CHECK (
        (scope = 'SYSTEM' AND club_id IS NULL AND department_id IS NULL
            AND visibility IN ('PUBLIC_INTERNAL', 'OFFICERS'))
        OR (scope = 'CLUB' AND club_id IS NOT NULL AND department_id IS NULL
            AND visibility IN ('MEMBERS', 'OFFICERS'))
        OR (scope = 'DEPARTMENT' AND club_id IS NOT NULL AND department_id IS NOT NULL
            AND visibility = 'DEPARTMENT_ONLY')
    );

DROP INDEX IF EXISTS uq_documents_club_name_live;

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_system_name_live
    ON documents (lower(name))
    WHERE NOT deleted AND scope = 'SYSTEM';

CREATE UNIQUE INDEX IF NOT EXISTS uq_documents_club_dept_name_live
    ON documents (club_id, COALESCE(department_id, '00000000-0000-0000-0000-000000000000'::uuid), lower(name))
    WHERE NOT deleted AND club_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_documents_system_live
    ON documents (created_at DESC)
    WHERE NOT deleted AND scope = 'SYSTEM';

CREATE INDEX IF NOT EXISTS idx_documents_department_live
    ON documents (department_id, created_at DESC)
    WHERE NOT deleted AND department_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- 4. Broaden Document Read/Upload/Update Permission Scope for Department Heads
-- ---------------------------------------------------------------------------------------------
UPDATE permissions
SET scope = 'DEPARTMENT'
WHERE permission_key IN ('document.view', 'document.upload', 'document.update');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'DEPARTMENT_HEAD'
    AND p.permission_key IN ('document.view', 'document.upload', 'document.update')
)
ON CONFLICT DO NOTHING;
