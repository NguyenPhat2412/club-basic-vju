-- V46: Standardized event participation roles (MEMBER, ORGANIZER, CTV, ATTENDEE),
-- public attendee toggle (events.allow_public_attendees), and verifiable e-certificates.

-- ---------------------------------------------------------------------------------------------
-- 1. Events: distinguish CTV support staff from general public attendees
-- ---------------------------------------------------------------------------------------------
ALTER TABLE events
    ADD COLUMN IF NOT EXISTS allow_public_attendees BOOLEAN NOT NULL DEFAULT FALSE;

UPDATE events
SET allow_public_attendees = TRUE
WHERE allow_ctv = TRUE;

-- ---------------------------------------------------------------------------------------------
-- 2. Event registrations: expand participant_type to MEMBER, ORGANIZER, CTV, ATTENDEE
-- ---------------------------------------------------------------------------------------------
ALTER TABLE event_registrations
    ALTER COLUMN participant_type TYPE VARCHAR(24);

ALTER TABLE event_registrations
    DROP CONSTRAINT IF EXISTS ck_event_registrations_type;

ALTER TABLE event_registrations
    ADD CONSTRAINT ck_event_registrations_type
        CHECK (participant_type IN ('MEMBER', 'ORGANIZER', 'CTV', 'ATTENDEE'));

-- ---------------------------------------------------------------------------------------------
-- 3. Event e-certificates (issued after SHA-256 attendance lock, revocable, publicly verifiable)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS event_certificates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    certificate_code VARCHAR(64) NOT NULL UNIQUE,
    event_id UUID NOT NULL REFERENCES events (id) ON DELETE CASCADE,
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    participant_type VARCHAR(24) NOT NULL
        CONSTRAINT ck_event_certificates_participant_type
            CHECK (participant_type IN ('MEMBER', 'ORGANIZER', 'CTV', 'ATTENDEE')),
    event_role VARCHAR(120),
    academic_term VARCHAR(16),
    recipient_name VARCHAR(200) NOT NULL,
    student_code VARCHAR(32),
    club_code VARCHAR(32) NOT NULL,
    club_name VARCHAR(200) NOT NULL,
    event_title VARCHAR(255) NOT NULL,
    event_start_time TIMESTAMPTZ NOT NULL,
    status VARCHAR(24) NOT NULL DEFAULT 'ISSUED'
        CONSTRAINT ck_event_certificates_status
            CHECK (status IN ('ISSUED', 'REVOKED')),
    verification_sha256 VARCHAR(64) NOT NULL,
    issued_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    revoked_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    revoked_at TIMESTAMPTZ,
    revocation_reason VARCHAR(500),
    CONSTRAINT uq_event_certificates_event_user UNIQUE (event_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_event_certificates_event_id
    ON event_certificates (event_id);
CREATE INDEX IF NOT EXISTS idx_event_certificates_user_issued
    ON event_certificates (user_id, issued_at DESC);
CREATE INDEX IF NOT EXISTS idx_event_certificates_club_id
    ON event_certificates (club_id);
CREATE INDEX IF NOT EXISTS idx_event_certificates_issued_by
    ON event_certificates (issued_by);
CREATE INDEX IF NOT EXISTS idx_event_certificates_revoked_by
    ON event_certificates (revoked_by);
