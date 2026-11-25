-- V47: Certificate recipient acknowledgement, reminder tracking, custom event certificate template image,
-- and indexes for centralized certificate management & statistics.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS certificate_template_url VARCHAR(500);

ALTER TABLE event_certificates
    ADD COLUMN IF NOT EXISTS template_image_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS acknowledged_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminded_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS reminder_count INTEGER NOT NULL DEFAULT 0
        CONSTRAINT ck_event_certificates_reminder_count CHECK (reminder_count >= 0);

CREATE INDEX IF NOT EXISTS idx_event_certificates_club_status_ack
    ON event_certificates (club_id, status, acknowledged_at);

CREATE INDEX IF NOT EXISTS idx_event_certificates_event_status_ack
    ON event_certificates (event_id, status, acknowledged_at);
