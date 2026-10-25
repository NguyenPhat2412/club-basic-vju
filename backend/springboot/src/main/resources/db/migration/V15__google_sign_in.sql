-- V15: students sign in with their school Google account. The Google account id ("sub") is bound to
-- the user on first sign-in, so a later Google account that reuses the same address cannot take over.
ALTER TABLE users ADD COLUMN google_subject VARCHAR(255);
CREATE UNIQUE INDEX uq_users_google_subject ON users (google_subject) WHERE google_subject IS NOT NULL;
