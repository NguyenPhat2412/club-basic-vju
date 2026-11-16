-- V32: Index chat_message_reactions.user_id for foreign-key ON DELETE CASCADE lookups

CREATE INDEX IF NOT EXISTS idx_chat_message_reactions_user_id
    ON chat_message_reactions (user_id);
