-- V13: accounts created or reset by an administrator must choose their own password on first login.
-- Existing accounts keep working as before.
ALTER TABLE users ADD COLUMN requires_password_change BOOLEAN NOT NULL DEFAULT false;
