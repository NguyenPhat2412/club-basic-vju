-- V30: Active delivery & read-receipt lifecycle columns on chat_messages (SENT -> DELIVERED -> SEEN).

ALTER TABLE chat_messages
    ADD COLUMN IF NOT EXISTS delivery_status VARCHAR(16) NOT NULL DEFAULT 'SENT',
    ADD COLUMN IF NOT EXISTS delivered_at TIMESTAMPTZ;

ALTER TABLE chat_messages
    DROP CONSTRAINT IF EXISTS ck_chat_messages_delivery_status;

ALTER TABLE chat_messages
    ADD CONSTRAINT ck_chat_messages_delivery_status
        CHECK (delivery_status IN ('SENT', 'DELIVERED', 'SEEN'));

UPDATE chat_messages m
SET delivery_status = 'SEEN',
    delivered_at = COALESCE(m.delivered_at, m.created_at)
WHERE m.delivery_status <> 'SEEN'
  AND EXISTS (
      SELECT 1
      FROM chat_channel_reads r
      WHERE r.channel_id = m.channel_id
        AND (m.sender_id IS NULL OR r.user_id <> m.sender_id)
        AND r.last_read_at >= m.created_at
  );

CREATE INDEX IF NOT EXISTS idx_chat_messages_channel_pending_delivery
    ON chat_messages (channel_id, delivery_status)
    WHERE delivery_status <> 'SEEN';
