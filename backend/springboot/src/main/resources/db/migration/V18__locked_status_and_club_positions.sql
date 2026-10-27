-- =============================================================================================
-- V18:
-- 1. Separate LOCKED (PB-05.3 temporary lock) from INACTIVE (PB-05.4 account deactivation)
-- 2. Add max_holders metadata to roles for organizational leadership positions (PB-14.1, PB-14.2)
-- =============================================================================================

ALTER TABLE users DROP CONSTRAINT IF EXISTS ck_users_status;
ALTER TABLE users ADD CONSTRAINT ck_users_status
    CHECK (status IN ('ACTIVE', 'INACTIVE', 'LOCKED'));

ALTER TABLE roles ADD COLUMN IF NOT EXISTS max_holders INTEGER;

UPDATE roles SET max_holders = 1 WHERE code IN ('CLUB_PRESIDENT', 'DEPARTMENT_HEAD');
UPDATE roles SET max_holders = 2 WHERE code = 'CLUB_VICE_PRESIDENT';
