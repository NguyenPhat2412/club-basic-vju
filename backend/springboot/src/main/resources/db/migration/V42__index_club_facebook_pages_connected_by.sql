-- V42: Index club_facebook_pages.connected_by foreign key column (DatabaseConstraintsTest invariant).
CREATE INDEX IF NOT EXISTS idx_club_facebook_pages_connected_by
    ON club_facebook_pages(connected_by);
