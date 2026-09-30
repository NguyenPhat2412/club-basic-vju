-- V3: enforce in the database the rules that V1 left to the application, and add the indexes
-- the application's queries need. Every new constraint is preceded by a data check that aborts
-- the migration with a readable message instead of a bare constraint error.

-- ---------------------------------------------------------------------------------------------
-- 1. Case-insensitive uniqueness (email, student code, club code, department name per club)
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
    duplicates TEXT;
BEGIN
    SELECT string_agg(value, ', ') INTO duplicates FROM (
        SELECT 'users.email=' || lower(email) AS value FROM users GROUP BY lower(email) HAVING count(*) > 1
        UNION ALL
        SELECT 'users.student_code=' || lower(student_code) FROM users
            WHERE student_code IS NOT NULL GROUP BY lower(student_code) HAVING count(*) > 1
        UNION ALL
        SELECT 'clubs.code=' || lower(code) FROM clubs GROUP BY lower(code) HAVING count(*) > 1
        UNION ALL
        SELECT 'departments.name=' || club_id || '/' || lower(name) FROM departments
            GROUP BY club_id, lower(name) HAVING count(*) > 1
    ) found;
    IF duplicates IS NOT NULL THEN
        RAISE EXCEPTION 'V3 aborted: values differing only by letter case must be merged first: %', duplicates;
    END IF;
END $$;

ALTER TABLE users DROP CONSTRAINT users_email_key;
CREATE UNIQUE INDEX uq_users_email_ci ON users (lower(email));

ALTER TABLE users DROP CONSTRAINT users_student_code_key;
CREATE UNIQUE INDEX uq_users_student_code_ci ON users (lower(student_code)) WHERE student_code IS NOT NULL;

ALTER TABLE clubs DROP CONSTRAINT clubs_code_key;
CREATE UNIQUE INDEX uq_clubs_code_ci ON clubs (lower(code));

ALTER TABLE departments DROP CONSTRAINT uq_departments_club_name;
CREATE UNIQUE INDEX uq_departments_club_name_ci ON departments (club_id, lower(name));

-- ---------------------------------------------------------------------------------------------
-- 2. A department member must belong to the department's club
-- ---------------------------------------------------------------------------------------------
DO $$
DECLARE
    mismatched BIGINT;
BEGIN
    SELECT count(*) INTO mismatched
    FROM department_members dm
    JOIN departments d ON d.id = dm.department_id
    JOIN memberships m ON m.id = dm.membership_id
    WHERE d.club_id <> m.club_id;
    IF mismatched > 0 THEN
        RAISE EXCEPTION 'V3 aborted: % department_members rows link a membership to a department of another club',
            mismatched;
    END IF;
END $$;

ALTER TABLE departments ADD CONSTRAINT uq_departments_id_club UNIQUE (id, club_id);
ALTER TABLE memberships ADD CONSTRAINT uq_memberships_id_club UNIQUE (id, club_id);

ALTER TABLE department_members ADD COLUMN club_id UUID;
UPDATE department_members dm SET club_id = d.club_id FROM departments d WHERE d.id = dm.department_id;
ALTER TABLE department_members ALTER COLUMN club_id SET NOT NULL;

ALTER TABLE department_members DROP CONSTRAINT department_members_department_id_fkey;
ALTER TABLE department_members DROP CONSTRAINT department_members_membership_id_fkey;
ALTER TABLE department_members
    ADD CONSTRAINT fk_department_members_department_club
        FOREIGN KEY (department_id, club_id) REFERENCES departments (id, club_id) ON DELETE CASCADE,
    ADD CONSTRAINT fk_department_members_membership_club
        FOREIGN KEY (membership_id, club_id) REFERENCES memberships (id, club_id) ON DELETE CASCADE;

-- ---------------------------------------------------------------------------------------------
-- 3. left_at is set exactly when a membership is LEFT (status is authoritative)
-- ---------------------------------------------------------------------------------------------
UPDATE memberships SET left_at = NULL WHERE status <> 'LEFT' AND left_at IS NOT NULL;
ALTER TABLE memberships DROP CONSTRAINT ck_memberships_left_at;
ALTER TABLE memberships ADD CONSTRAINT ck_memberships_left_at
    CHECK ((status = 'LEFT') = (left_at IS NOT NULL));

-- ---------------------------------------------------------------------------------------------
-- 4. Audit logs are immutable: a referenced club/department can no longer be deleted.
--    (ON DELETE SET NULL contradicted ck_permission_audit_scope, so such deletes always failed.)
-- ---------------------------------------------------------------------------------------------
ALTER TABLE permission_audit_logs DROP CONSTRAINT permission_audit_logs_club_id_fkey;
ALTER TABLE permission_audit_logs DROP CONSTRAINT permission_audit_logs_department_id_fkey;
ALTER TABLE permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_club_id_fkey
        FOREIGN KEY (club_id) REFERENCES clubs (id) ON DELETE RESTRICT,
    ADD CONSTRAINT permission_audit_logs_department_id_fkey
        FOREIGN KEY (department_id) REFERENCES departments (id) ON DELETE RESTRICT;

-- ---------------------------------------------------------------------------------------------
-- 5. Who revoked a grant, next to when
-- ---------------------------------------------------------------------------------------------
ALTER TABLE user_permissions ADD COLUMN revoked_by UUID REFERENCES users (id) ON DELETE RESTRICT;
ALTER TABLE user_permissions ADD CONSTRAINT ck_user_permissions_revoked_by
    CHECK (revoked_by IS NULL OR revoked_at IS NOT NULL);

-- ---------------------------------------------------------------------------------------------
-- 6. permission_key is always module.action
-- ---------------------------------------------------------------------------------------------
ALTER TABLE permissions ADD CONSTRAINT ck_permissions_key_matches_module_action
    CHECK (permission_key = module || '.' || action);

-- ---------------------------------------------------------------------------------------------
-- 7. Indexes: foreign keys, and list queries ordered by join date
-- ---------------------------------------------------------------------------------------------
CREATE INDEX idx_user_permissions_club_id ON user_permissions (club_id) WHERE club_id IS NOT NULL;
CREATE INDEX idx_user_permissions_department_id ON user_permissions (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_user_permissions_granted_by ON user_permissions (granted_by);
CREATE INDEX idx_user_permissions_revoked_by ON user_permissions (revoked_by) WHERE revoked_by IS NOT NULL;
CREATE INDEX idx_permission_audit_actor ON permission_audit_logs (actor_user_id);
CREATE INDEX idx_permission_audit_permission ON permission_audit_logs (permission_id);
CREATE INDEX idx_permission_audit_club ON permission_audit_logs (club_id) WHERE club_id IS NOT NULL;
CREATE INDEX idx_permission_audit_department ON permission_audit_logs (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_department_members_club_id ON department_members (club_id);

DROP INDEX idx_memberships_club_id;
CREATE INDEX idx_memberships_club_joined ON memberships (club_id, joined_at DESC);
DROP INDEX idx_department_members_department_id;
CREATE INDEX idx_department_members_department_joined ON department_members (department_id, joined_at);

-- ---------------------------------------------------------------------------------------------
-- 8. updated_at follows every UPDATE, including ones made outside the application. A value the
--    statement sets itself (Hibernate does) is kept so the API response matches the row.
-- ---------------------------------------------------------------------------------------------
CREATE FUNCTION set_updated_at() RETURNS trigger AS $$
BEGIN
    IF NEW.updated_at IS NOT DISTINCT FROM OLD.updated_at THEN
        NEW.updated_at := CURRENT_TIMESTAMP;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_clubs_updated_at BEFORE UPDATE ON clubs
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
CREATE TRIGGER trg_departments_updated_at BEFORE UPDATE ON departments
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
