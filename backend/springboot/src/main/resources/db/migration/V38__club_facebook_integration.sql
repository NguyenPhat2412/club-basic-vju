-- V38: Club Facebook Fanpage integration (1 club <-> 1 Facebook Page + cached posts & engagement metrics).

CREATE TABLE club_facebook_pages (
    id                      UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id                 UUID NOT NULL UNIQUE REFERENCES clubs(id) ON DELETE CASCADE,
    page_id                 VARCHAR(100) NOT NULL,
    page_name               VARCHAR(255) NOT NULL,
    page_link               VARCHAR(1000),
    avatar_url              VARCHAR(1500),
    followers_count         INTEGER NOT NULL DEFAULT 0,
    fan_count               INTEGER NOT NULL DEFAULT 0,
    encrypted_access_token  TEXT NOT NULL,
    connected_by            UUID REFERENCES users(id) ON DELETE SET NULL,
    connected_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    last_synced_at          TIMESTAMPTZ,
    last_sync_error         TEXT,
    created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by              UUID,
    updated_by              UUID
);

CREATE INDEX idx_club_facebook_pages_page_id ON club_facebook_pages (page_id);

CREATE TABLE club_facebook_posts (
    id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id           UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    fb_post_id        VARCHAR(150) NOT NULL,
    message           TEXT,
    permalink_url     VARCHAR(1500),
    image_url         VARCHAR(2000),
    published_at      TIMESTAMPTZ NOT NULL,
    reactions_count   INTEGER NOT NULL DEFAULT 0,
    comments_count    INTEGER NOT NULL DEFAULT 0,
    shares_count      INTEGER NOT NULL DEFAULT 0,
    synced_at         TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by        UUID,
    updated_by        UUID,
    CONSTRAINT uq_club_facebook_posts_club_post UNIQUE (club_id, fb_post_id)
);

CREATE INDEX idx_club_facebook_posts_club_published
    ON club_facebook_posts (club_id, published_at DESC);
