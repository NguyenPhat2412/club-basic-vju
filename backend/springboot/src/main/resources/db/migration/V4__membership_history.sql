-- V4: keep the full membership history. Each time a user joins a club is its own row; LEFT rows
-- are the history and are never reopened. Only one current (non-LEFT) membership per user and club.
ALTER TABLE memberships DROP CONSTRAINT uq_memberships_user_club;
CREATE UNIQUE INDEX uq_memberships_user_club_current ON memberships (user_id, club_id) WHERE status <> 'LEFT';
CREATE INDEX idx_memberships_user_club ON memberships (user_id, club_id, joined_at DESC);
