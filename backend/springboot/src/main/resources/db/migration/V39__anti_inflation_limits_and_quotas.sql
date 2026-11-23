-- Anti-inflation quotas, per-club resource caps, and anti-spam cooldowns in system_settings.
-- Also switches default max_active_clubs from 0 (unlimited) to 5 clubs per student.
ALTER TABLE system_settings
    ALTER COLUMN max_active_clubs SET DEFAULT 5,
    ADD COLUMN club_storage_quota_mb INTEGER NOT NULL DEFAULT 500
        CONSTRAINT ck_system_settings_club_storage_quota_mb CHECK (club_storage_quota_mb BETWEEN 50 AND 10240),
    ADD COLUMN document_max_versions INTEGER NOT NULL DEFAULT 20
        CONSTRAINT ck_system_settings_document_max_versions CHECK (document_max_versions BETWEEN 1 AND 100),
    ADD COLUMN max_channels_per_club INTEGER NOT NULL DEFAULT 30
        CONSTRAINT ck_system_settings_max_channels_per_club CHECK (max_channels_per_club BETWEEN 1 AND 200),
    ADD COLUMN max_departments_per_club INTEGER NOT NULL DEFAULT 20
        CONSTRAINT ck_system_settings_max_departments_per_club CHECK (max_departments_per_club BETWEEN 1 AND 100),
    ADD COLUMN max_active_events_per_club INTEGER NOT NULL DEFAULT 50
        CONSTRAINT ck_system_settings_max_active_events_per_club CHECK (max_active_events_per_club BETWEEN 1 AND 500),
    ADD COLUMN max_open_tasks_per_club INTEGER NOT NULL DEFAULT 200
        CONSTRAINT ck_system_settings_max_open_tasks_per_club CHECK (max_open_tasks_per_club BETWEEN 1 AND 2000),
    ADD COLUMN chat_messages_per_minute INTEGER NOT NULL DEFAULT 20
        CONSTRAINT ck_system_settings_chat_messages_per_minute CHECK (chat_messages_per_minute BETWEEN 1 AND 200),
    ADD COLUMN broadcast_cooldown_minutes INTEGER NOT NULL DEFAULT 5
        CONSTRAINT ck_system_settings_broadcast_cooldown_minutes CHECK (broadcast_cooldown_minutes BETWEEN 0 AND 1440),
    ADD COLUMN facebook_sync_cooldown_minutes INTEGER NOT NULL DEFAULT 2
        CONSTRAINT ck_system_settings_facebook_sync_cooldown_minutes CHECK (facebook_sync_cooldown_minutes BETWEEN 0 AND 1440);

UPDATE system_settings
SET max_active_clubs = 5
WHERE max_active_clubs = 0;

-- Index for scheduled cleanup of orphan chat attachments (uploaded but never linked to a message).
CREATE INDEX IF NOT EXISTS idx_chat_attachments_orphan_created
    ON chat_message_attachments (created_at)
    WHERE message_id IS NULL;
