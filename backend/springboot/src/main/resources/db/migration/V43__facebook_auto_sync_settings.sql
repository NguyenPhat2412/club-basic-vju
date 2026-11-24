-- V43: Periodic Facebook Fanpage auto-sync settings and consecutive failure tracking.

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS facebook_auto_sync_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS facebook_auto_sync_interval_minutes INT NOT NULL DEFAULT 60
        CONSTRAINT ck_system_settings_fb_auto_sync_interval CHECK (facebook_auto_sync_interval_minutes BETWEEN 15 AND 1440);

ALTER TABLE club_facebook_pages
    ADD COLUMN IF NOT EXISTS consecutive_sync_failures INT NOT NULL DEFAULT 0
        CONSTRAINT ck_club_facebook_pages_sync_failures CHECK (consecutive_sync_failures >= 0),
    ADD COLUMN IF NOT EXISTS last_auto_synced_at TIMESTAMPTZ;
