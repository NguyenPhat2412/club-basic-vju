-- V44: Sprint 4 (PB-89..PB-93) & production handoff schema extensions:
-- 1. User email opt-out preference & optional 2FA flag.
-- 2. Club public Facebook Fanpage URL fallback.
-- 3. Audit log IP address & User-Agent traceability.
-- 4. Event academic term (with deterministic backfill) & SHA-256 attendance lock metadata.
-- 5. Post-event satisfaction feedbacks (event_feedbacks) & 2FA OTP tokens (security_otps).

-- ---------------------------------------------------------------------------------------------
-- 1. Users: email notification preference & optional 2FA
-- ---------------------------------------------------------------------------------------------
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN IF NOT EXISTS two_factor_enabled BOOLEAN NOT NULL DEFAULT FALSE;

-- ---------------------------------------------------------------------------------------------
-- 2. Clubs: public Facebook URL for Page Plugin fallback
-- ---------------------------------------------------------------------------------------------
ALTER TABLE clubs
    ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500);

-- ---------------------------------------------------------------------------------------------
-- 3. Audit logs: request IP & User-Agent
-- ---------------------------------------------------------------------------------------------
ALTER TABLE audit_logs
    ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64),
    ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512);

-- ---------------------------------------------------------------------------------------------
-- 4. Events: academic term & SHA-256 attendance lock
-- ---------------------------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS academic_term VARCHAR(16),
    ADD COLUMN IF NOT EXISTS attendance_locked_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS attendance_locked_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    ADD COLUMN IF NOT EXISTS attendance_signature_sha256 VARCHAR(64);

CREATE INDEX IF NOT EXISTS idx_events_attendance_locked_by
    ON events (attendance_locked_by);
CREATE INDEX IF NOT EXISTS idx_events_academic_term
    ON events (academic_term);

UPDATE events
SET academic_term = CASE
    WHEN EXTRACT(MONTH FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT BETWEEN 9 AND 12
        THEN EXTRACT(YEAR FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT::TEXT || '-1'
    WHEN EXTRACT(MONTH FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT BETWEEN 1 AND 5
        THEN (EXTRACT(YEAR FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT - 1)::TEXT || '-2'
    ELSE (EXTRACT(YEAR FROM start_time AT TIME ZONE 'Asia/Ho_Chi_Minh')::INT - 1)::TEXT || '-3'
END
WHERE academic_term IS NULL;

-- ---------------------------------------------------------------------------------------------
-- 5. Event feedbacks (post-event survey restricted to PRESENT/LATE attendees in service)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_feedbacks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    rating INTEGER NOT NULL CONSTRAINT ck_event_feedbacks_rating CHECK (rating BETWEEN 1 AND 5),
    comment VARCHAR(1000),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_event_feedbacks_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_feedbacks_event_id
    ON event_feedbacks (event_id);
CREATE INDEX IF NOT EXISTS idx_event_feedbacks_user_id
    ON event_feedbacks (user_id);

-- ---------------------------------------------------------------------------------------------
-- 6. Security OTPs (optional/critical-action 2FA via email)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS security_otps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    purpose VARCHAR(32) NOT NULL,
    action_context VARCHAR(120),
    otp_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    attempts INTEGER NOT NULL DEFAULT 0 CONSTRAINT ck_security_otps_attempts CHECK (attempts >= 0),
    max_attempts INTEGER NOT NULL DEFAULT 5 CONSTRAINT ck_security_otps_max_attempts CHECK (max_attempts BETWEEN 1 AND 15),
    consumed_at TIMESTAMPTZ,
    invalidated_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_security_otps_user_id
    ON security_otps (user_id);
CREATE INDEX IF NOT EXISTS idx_security_otps_user_purpose_created
    ON security_otps (user_id, purpose, created_at DESC);
