-- V34: Track message edit timestamp for inline chat message editing.
ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;
