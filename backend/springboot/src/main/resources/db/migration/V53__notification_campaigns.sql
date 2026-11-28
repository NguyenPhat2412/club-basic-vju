-- High-volume notification campaigns with audience targeting, document attachment, and exact read-rate tracking.

CREATE TABLE IF NOT EXISTS notification_campaigns (
    id UUID PRIMARY KEY,
    title VARCHAR(160) NOT NULL,
    message VARCHAR(2000) NOT NULL,
    audience_type VARCHAR(32) NOT NULL,
    target_club_ids TEXT,
    category VARCHAR(32) NOT NULL DEFAULT 'SYSTEM',
    document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
    send_email BOOLEAN NOT NULL DEFAULT FALSE,
    total_recipients INT NOT NULL DEFAULT 0,
    delivered_count INT NOT NULL DEFAULT 0,
    email_queued_count INT NOT NULL DEFAULT 0,
    status VARCHAR(24) NOT NULL DEFAULT 'COMPLETED',
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_created_at
    ON notification_campaigns (created_at DESC);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS campaign_id UUID REFERENCES notification_campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_notifications_campaign_read
    ON notifications (campaign_id, read)
    WHERE campaign_id IS NOT NULL;
