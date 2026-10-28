-- System-wide limits an admin edits from the "Cài đặt hệ thống" page. One row; 0 means "no limit" where noted.
CREATE TABLE system_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    singleton BOOLEAN NOT NULL DEFAULT TRUE UNIQUE CHECK (singleton),
    -- Applications a student may have PENDING at once across all clubs (0 = no limit).
    max_pending_applications INT NOT NULL DEFAULT 3 CHECK (max_pending_applications BETWEEN 0 AND 100),
    -- Days a student waits after a rejection before applying to the same club again (0 = no wait).
    reapply_cooldown_days INT NOT NULL DEFAULT 7 CHECK (reapply_cooldown_days BETWEEN 0 AND 365),
    -- Clubs a student may belong to at once (0 = no limit).
    max_active_clubs INT NOT NULL DEFAULT 0 CHECK (max_active_clubs BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID
);
CREATE TRIGGER trg_system_settings_updated_at BEFORE UPDATE ON system_settings
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
INSERT INTO system_settings DEFAULT VALUES;

INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES ('setting.view', 'setting', 'view', 'GLOBAL', 'View system settings'),
       ('setting.update', 'setting', 'update', 'GLOBAL', 'Change system settings')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SYSTEM_ADMIN' AND p.permission_key IN ('setting.view', 'setting.update')
ON CONFLICT DO NOTHING;

ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT',
     'APPLICATION', 'APPLICATION_FORM', 'DOCUMENT', 'EVENT', 'TASK', 'CHAT_CHANNEL', 'NOTIFICATION', 'SYSTEM_SETTINGS'));
