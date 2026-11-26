-- V49: Multi-club festival hierarchy (parent_event_id + booth_code), co-host clubs,
--      venue/booth map ("Bản đồ chơi"), 4-stage Facebook campaign links, and Mỹ Đình <-> Hòa Lạc shuttle bus flag.

ALTER TABLE events
    ADD COLUMN IF NOT EXISTS parent_event_id UUID REFERENCES events(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS booth_code VARCHAR(32),
    ADD COLUMN IF NOT EXISTS venue_map_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS facebook_post_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS recap_album_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS allow_shuttle_bus BOOLEAN NOT NULL DEFAULT FALSE,
    ADD CONSTRAINT ck_events_not_self_parent CHECK (parent_event_id IS NULL OR parent_event_id <> id);

CREATE INDEX IF NOT EXISTS idx_events_parent_event_id
    ON events (parent_event_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_events_parent_booth_code
    ON events (parent_event_id, UPPER(BTRIM(booth_code)))
    WHERE parent_event_id IS NOT NULL
      AND booth_code IS NOT NULL
      AND BTRIM(booth_code) <> ''
      AND status <> 'CANCELLED';

CREATE TABLE IF NOT EXISTS event_co_hosts (
    event_id   UUID        NOT NULL REFERENCES events(id) ON DELETE CASCADE,
    club_id    UUID        NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (event_id, club_id)
);

CREATE INDEX IF NOT EXISTS idx_event_co_hosts_club_id
    ON event_co_hosts (club_id);

ALTER TABLE event_registrations
    ADD COLUMN IF NOT EXISTS needs_shuttle_bus BOOLEAN NOT NULL DEFAULT FALSE;
