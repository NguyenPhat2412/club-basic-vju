-- Configurable OTP password-reset policy and SMTP mail server settings in system_settings,
-- plus persistent hashed OTP records for password recovery.
ALTER TABLE system_settings
    ADD COLUMN otp_expiry_minutes INTEGER NOT NULL DEFAULT 5
        CONSTRAINT ck_system_settings_otp_expiry_minutes CHECK (otp_expiry_minutes BETWEEN 1 AND 60),
    ADD COLUMN otp_max_send_count INTEGER NOT NULL DEFAULT 5
        CONSTRAINT ck_system_settings_otp_max_send_count CHECK (otp_max_send_count BETWEEN 1 AND 30),
    ADD COLUMN otp_resend_cooldown_seconds INTEGER NOT NULL DEFAULT 60
        CONSTRAINT ck_system_settings_otp_resend_cooldown CHECK (otp_resend_cooldown_seconds BETWEEN 0 AND 600),
    ADD COLUMN otp_max_verify_attempts INTEGER NOT NULL DEFAULT 5
        CONSTRAINT ck_system_settings_otp_max_verify_attempts CHECK (otp_max_verify_attempts BETWEEN 1 AND 15),
    ADD COLUMN smtp_host VARCHAR(255),
    ADD COLUMN smtp_port INTEGER NOT NULL DEFAULT 587
        CONSTRAINT ck_system_settings_smtp_port CHECK (smtp_port BETWEEN 1 AND 65535),
    ADD COLUMN smtp_username VARCHAR(255),
    ADD COLUMN smtp_password VARCHAR(500),
    ADD COLUMN smtp_from_email VARCHAR(320),
    ADD COLUMN smtp_from_name VARCHAR(120) NOT NULL DEFAULT 'VJU ClubHub',
    ADD COLUMN smtp_start_tls BOOLEAN NOT NULL DEFAULT TRUE;

CREATE TABLE password_reset_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    otp_hash VARCHAR(120) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 CHECK (max_attempts BETWEEN 1 AND 15),
    consumed_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_password_reset_otps_user_created
    ON password_reset_otps (user_id, created_at DESC);
