-- PB-88 AC01 & AC03: Event file submission metadata and internal event scope support

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS requires_submission BOOLEAN NOT NULL DEFAULT FALSE;

ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS submission_file_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS submission_storage_key VARCHAR(500),
    ADD COLUMN IF NOT EXISTS submission_content_type VARCHAR(150),
    ADD COLUMN IF NOT EXISTS submission_size_bytes BIGINT,
    ADD COLUMN IF NOT EXISTS submission_uploaded_at TIMESTAMPTZ;
