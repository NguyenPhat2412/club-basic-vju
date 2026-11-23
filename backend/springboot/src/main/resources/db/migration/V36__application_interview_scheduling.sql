ALTER TABLE club_applications
    ADD COLUMN IF NOT EXISTS interview_at TIMESTAMPTZ,
    ADD COLUMN IF NOT EXISTS interview_location VARCHAR(500),
    ADD COLUMN IF NOT EXISTS interview_note VARCHAR(1000),
    ADD COLUMN IF NOT EXISTS interview_reminder_sent_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_club_applications_interview_at
    ON club_applications (club_id, interview_at)
    WHERE interview_at IS NOT NULL;
