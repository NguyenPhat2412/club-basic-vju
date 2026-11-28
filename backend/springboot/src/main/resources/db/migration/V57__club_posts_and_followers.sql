-- V57: Club Page Posts (with pin & likes) and Club Followers
CREATE TABLE IF NOT EXISTS club_posts (
    id UUID PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    title VARCHAR(160),
    content VARCHAR(4000) NOT NULL,
    image_url VARCHAR(500),
    pinned BOOLEAN NOT NULL DEFAULT FALSE,
    likes_count INTEGER NOT NULL DEFAULT 0 CHECK (likes_count >= 0),
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_club_posts_club_pinned_created
    ON club_posts (club_id, pinned DESC, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_club_posts_author
    ON club_posts (author_id);

CREATE TABLE IF NOT EXISTS club_post_likes (
    post_id UUID NOT NULL REFERENCES club_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (post_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_post_likes_user
    ON club_post_likes (user_id);

CREATE TABLE IF NOT EXISTS club_followers (
    club_id UUID NOT NULL REFERENCES clubs(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    PRIMARY KEY (club_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_club_followers_user
    ON club_followers (user_id);
