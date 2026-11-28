ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS telegram_alert_on_server_error BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS telegram_alert_on_broadcast BOOLEAN NOT NULL DEFAULT TRUE;
