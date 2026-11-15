-- V29: Messenger-style pinned messages per chat channel.

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS pinned_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS pinned_by UUID REFERENCES users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_chat_messages_pinned_by
    ON chat_messages (pinned_by);

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_pinned
    ON chat_messages (channel_id, pinned_at DESC, created_at DESC)
    WHERE pinned = TRUE;
