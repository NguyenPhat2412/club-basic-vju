-- V6: a general audit trail for business actions (who did what to which resource, with the
-- values before and after), and created_at/updated_at on memberships.

-- ---------------------------------------------------------------------------------------------
-- Membership timestamps
-- ---------------------------------------------------------------------------------------------
ALTER TABLE memberships ADD COLUMN created_at TIMESTAMPTZ;
ALTER TABLE memberships ADD COLUMN updated_at TIMESTAMPTZ;
UPDATE memberships SET created_at = joined_at, updated_at = COALESCE(left_at, joined_at);
ALTER TABLE memberships
    ALTER COLUMN created_at SET NOT NULL,
    ALTER COLUMN created_at SET DEFAULT CURRENT_TIMESTAMP,
    ALTER COLUMN updated_at SET NOT NULL,
    ALTER COLUMN updated_at SET DEFAULT CURRENT_TIMESTAMP;
CREATE TRIGGER trg_memberships_updated_at BEFORE UPDATE ON memberships
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- Audit log. Rows are append-only: the application never updates or deletes them.
-- actor_user_id is NULL only for actions without a signed-in user (self-registration).
-- ---------------------------------------------------------------------------------------------
CREATE TABLE audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID REFERENCES users (id) ON DELETE RESTRICT,
    action VARCHAR(64) NOT NULL,
    resource_type VARCHAR(32) NOT NULL,
    resource_id UUID NOT NULL,
    club_id UUID REFERENCES clubs (id) ON DELETE RESTRICT,
    old_value TEXT,
    new_value TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_audit_logs_action_format CHECK (action ~ '^[A-Z][A-Z_]*$'),
    CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
        ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT')),
    CONSTRAINT ck_audit_logs_old_value_json CHECK (old_value IS NULL OR old_value::jsonb IS NOT NULL),
    CONSTRAINT ck_audit_logs_new_value_json CHECK (new_value IS NULL OR new_value::jsonb IS NOT NULL)
);
CREATE INDEX idx_audit_logs_created ON audit_logs (created_at DESC, id);
CREATE INDEX idx_audit_logs_resource ON audit_logs (resource_type, resource_id, created_at DESC);
CREATE INDEX idx_audit_logs_actor ON audit_logs (actor_user_id, created_at DESC) WHERE actor_user_id IS NOT NULL;
CREATE INDEX idx_audit_logs_club ON audit_logs (club_id, created_at DESC) WHERE club_id IS NOT NULL;

CREATE FUNCTION reject_audit_log_change() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    RAISE EXCEPTION 'ck_audit_logs_append_only: audit_logs rows cannot be changed or deleted'
        USING ERRCODE = 'check_violation';
END;
$$;
CREATE TRIGGER trg_audit_logs_append_only BEFORE UPDATE OR DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION reject_audit_log_change();

-- ---------------------------------------------------------------------------------------------
-- Permission to read the audit log; system administrators get it through their role.
-- ---------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES ('audit.view', 'audit', 'view', 'GLOBAL', 'View the audit log')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SYSTEM_ADMIN' AND p.permission_key = 'audit.view'
ON CONFLICT DO NOTHING;
