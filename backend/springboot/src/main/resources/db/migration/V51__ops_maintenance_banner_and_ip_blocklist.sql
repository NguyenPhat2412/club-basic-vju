-- Maintenance mode, global announcement banner on system_settings, and IP blocklist table.

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS maintenance_mode BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS maintenance_message VARCHAR(500),
    ADD COLUMN IF NOT EXISTS announcement_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS announcement_message VARCHAR(500),
    ADD COLUMN IF NOT EXISTS announcement_tone VARCHAR(16) NOT NULL DEFAULT 'info',
    ADD COLUMN IF NOT EXISTS announcement_expires_at TIMESTAMPTZ;

CREATE TABLE IF NOT EXISTS blocked_ips (
    id UUID PRIMARY KEY,
    ip_address VARCHAR(64) NOT NULL UNIQUE,
    reason VARCHAR(300),
    blocked_by UUID REFERENCES users(id) ON DELETE SET NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_blocked_ips_expires_at ON blocked_ips (expires_at);
