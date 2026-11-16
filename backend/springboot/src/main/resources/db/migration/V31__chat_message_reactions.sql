-- V31: Telegram-style chat message emoji reactions with real PostgreSQL persistence

CREATE TABLE IF NOT EXISTS chat_message_reactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    message_id UUID NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    emoji VARCHAR(24) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT uq_chat_message_reactions_msg_user_emoji UNIQUE (message_id, user_id, emoji),
    CONSTRAINT chk_chat_message_reactions_emoji_nonempty CHECK (length(btrim(emoji)) BETWEEN 1 AND 24)
);

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_message_created
    ON chat_message_reactions (message_id, created_at ASC);
