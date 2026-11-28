-- Telegram alerting configuration on system_settings + security monitoring indexes on audit_logs.

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS telegram_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    ADD COLUMN IF NOT EXISTS telegram_bot_token VARCHAR(512),
    ADD COLUMN IF NOT EXISTS telegram_chat_id VARCHAR(128),
    ADD COLUMN IF NOT EXISTS telegram_thread_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS telegram_alert_on_failed_login BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS telegram_failed_login_threshold INT NOT NULL DEFAULT 5,
    ADD COLUMN IF NOT EXISTS telegram_alert_on_rate_limit BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS telegram_alert_on_admin_login BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS telegram_alert_on_settings_change BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS telegram_cooldown_seconds INT NOT NULL DEFAULT 180;

CREATE INDEX IF NOT EXISTS idx_audit_logs_created_action
    ON audit_logs (created_at DESC, action);

CREATE INDEX IF NOT EXISTS idx_audit_logs_ip_created
    ON audit_logs (ip_address, created_at DESC)
    WHERE ip_address IS NOT NULL;
