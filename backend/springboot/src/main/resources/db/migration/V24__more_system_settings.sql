-- Admin-tunable values that used to be hard-coded or server-config only; defaults keep today's behaviour.
ALTER TABLE system_settings
    ADD COLUMN allow_self_registration BOOLEAN NOT NULL DEFAULT TRUE,
    ADD COLUMN attendance_opens_before_minutes INTEGER NOT NULL DEFAULT 120,
    ADD COLUMN event_task_grace_days INTEGER NOT NULL DEFAULT 7,
    ADD COLUMN chat_summaries_per_hour INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN chat_max_message_length INTEGER NOT NULL DEFAULT 4000,
    ADD COLUMN document_max_file_mb INTEGER NOT NULL DEFAULT 20,
    ADD COLUMN club_image_max_mb INTEGER NOT NULL DEFAULT 10,
    ADD COLUMN avatar_max_mb INTEGER NOT NULL DEFAULT 5;
