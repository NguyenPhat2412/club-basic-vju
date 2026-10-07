-- V5: roles. A role is a named bundle of permissions (for club positions such as president or
-- department head). Users get roles at a scope exactly like single permissions; what a user may do
-- is the union of direct grants and active role assignments (view effective_user_permissions).

-- Scope breadth: DEPARTMENT (0) < CLUB (1) < GLOBAL (2).
CREATE FUNCTION scope_rank(scope VARCHAR) RETURNS INT IMMUTABLE LANGUAGE sql AS $$
    SELECT CASE scope WHEN 'DEPARTMENT' THEN 0 WHEN 'CLUB' THEN 1 WHEN 'GLOBAL' THEN 2 END
$$;

INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('role.view', 'role', 'view', 'GLOBAL', 'View role definitions'),
    ('role.manage', 'role', 'manage', 'GLOBAL', 'Create and edit roles')
ON CONFLICT (permission_key) DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- Role definitions
-- ---------------------------------------------------------------------------------------------
CREATE TABLE roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(64) NOT NULL,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    scope VARCHAR(16) NOT NULL,
    system BOOLEAN NOT NULL DEFAULT FALSE,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_roles_scope CHECK (scope IN ('GLOBAL', 'CLUB', 'DEPARTMENT')),
    CONSTRAINT ck_roles_code_format CHECK (code ~ '^[A-Z][A-Z0-9_]*$')
);
CREATE UNIQUE INDEX uq_roles_code_ci ON roles (lower(code));
CREATE TRIGGER trg_roles_updated_at BEFORE UPDATE ON roles
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE role_permissions (
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE CASCADE,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE RESTRICT,
    PRIMARY KEY (role_id, permission_id)
);
CREATE INDEX idx_role_permissions_permission ON role_permissions (permission_id);

-- A role can only bundle permissions it could legally hold at its own scope: a CLUB role may
-- contain CLUB and DEPARTMENT permissions, never GLOBAL ones.
CREATE FUNCTION check_role_permission_scope() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
    IF (SELECT scope_rank(p.scope) FROM permissions p WHERE p.id = NEW.permission_id)
       > (SELECT scope_rank(r.scope) FROM roles r WHERE r.id = NEW.role_id) THEN
        RAISE EXCEPTION 'ck_role_permissions_scope: permission is broader than the role scope'
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_role_permissions_scope';
    END IF;
    RETURN NEW;
END;
$$;
CREATE TRIGGER trg_role_permissions_scope BEFORE INSERT OR UPDATE ON role_permissions
    FOR EACH ROW EXECUTE FUNCTION check_role_permission_scope();

-- ---------------------------------------------------------------------------------------------
-- Role assignments (same scope rules and history model as user_permissions)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    role_id UUID NOT NULL REFERENCES roles (id) ON DELETE RESTRICT,
    scope VARCHAR(16) NOT NULL,
    club_id UUID REFERENCES clubs (id) ON DELETE RESTRICT,
    department_id UUID REFERENCES departments (id) ON DELETE RESTRICT,
    granted_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    revoked_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    CONSTRAINT ck_user_roles_scope CHECK (
        (scope = 'GLOBAL' AND club_id IS NULL AND department_id IS NULL)
        OR (scope = 'CLUB' AND club_id IS NOT NULL AND department_id IS NULL)
        OR (scope = 'DEPARTMENT' AND club_id IS NULL AND department_id IS NOT NULL)
    ),
    CONSTRAINT ck_user_roles_revoked_by CHECK (revoked_by IS NULL OR revoked_at IS NOT NULL)
);
CREATE UNIQUE INDEX uq_user_roles_active_global ON user_roles (user_id, role_id)
    WHERE revoked_at IS NULL AND scope = 'GLOBAL';
CREATE UNIQUE INDEX uq_user_roles_active_club ON user_roles (user_id, role_id, club_id)
    WHERE revoked_at IS NULL AND scope = 'CLUB';
CREATE UNIQUE INDEX uq_user_roles_active_department ON user_roles (user_id, role_id, department_id)
    WHERE revoked_at IS NULL AND scope = 'DEPARTMENT';
CREATE INDEX idx_user_roles_user ON user_roles (user_id);
CREATE INDEX idx_user_roles_role ON user_roles (role_id);
CREATE INDEX idx_user_roles_club ON user_roles (club_id) WHERE club_id IS NOT NULL;
CREATE INDEX idx_user_roles_department ON user_roles (department_id) WHERE department_id IS NOT NULL;
CREATE INDEX idx_user_roles_granted_by ON user_roles (granted_by);
CREATE INDEX idx_user_roles_revoked_by ON user_roles (revoked_by) WHERE revoked_by IS NOT NULL;

-- Grants may be made at the item's own scope or a broader one, never narrower. Enforced for
-- both role assignments and direct permission grants.
CREATE FUNCTION check_grant_scope() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
    item_scope VARCHAR;
BEGIN
    IF TG_TABLE_NAME = 'user_roles' THEN
        SELECT scope INTO item_scope FROM roles WHERE id = NEW.role_id;
    ELSE
        SELECT scope INTO item_scope FROM permissions WHERE id = NEW.permission_id;
    END IF;
    IF scope_rank(NEW.scope) < scope_rank(item_scope) THEN
        RAISE EXCEPTION 'ck_%_grant_scope: grant scope % is narrower than %', TG_TABLE_NAME, NEW.scope, item_scope
            USING ERRCODE = 'check_violation', CONSTRAINT = 'ck_' || TG_TABLE_NAME || '_grant_scope';
    END IF;
    RETURN NEW;
END;
$$;

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM user_permissions up JOIN permissions p ON p.id = up.permission_id
               WHERE scope_rank(up.scope) < scope_rank(p.scope)) THEN
        RAISE EXCEPTION 'V5 aborted: some user_permissions are granted at a scope narrower than the permission';
    END IF;
END $$;

CREATE TRIGGER trg_user_roles_grant_scope BEFORE INSERT OR UPDATE ON user_roles
    FOR EACH ROW EXECUTE FUNCTION check_grant_scope();
CREATE TRIGGER trg_user_permissions_grant_scope BEFORE INSERT OR UPDATE ON user_permissions
    FOR EACH ROW EXECUTE FUNCTION check_grant_scope();

-- ---------------------------------------------------------------------------------------------
-- Audit covers role assignments too: exactly one of permission_id / role_id
-- ---------------------------------------------------------------------------------------------
ALTER TABLE permission_audit_logs ALTER COLUMN permission_id DROP NOT NULL;
ALTER TABLE permission_audit_logs ADD COLUMN role_id UUID REFERENCES roles (id) ON DELETE RESTRICT;
ALTER TABLE permission_audit_logs ADD CONSTRAINT ck_permission_audit_subject
    CHECK ((permission_id IS NULL) <> (role_id IS NULL));
CREATE INDEX idx_permission_audit_role ON permission_audit_logs (role_id) WHERE role_id IS NOT NULL;

-- ---------------------------------------------------------------------------------------------
-- What each user may currently do: active direct grants plus active role assignments
-- ---------------------------------------------------------------------------------------------
CREATE VIEW effective_user_permissions AS
SELECT up.user_id, p.id AS permission_id, p.permission_key, up.scope, up.club_id, up.department_id,
       'DIRECT'::VARCHAR(16) AS source, NULL::UUID AS role_id
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id AND p.active
WHERE up.revoked_at IS NULL
UNION ALL
SELECT ur.user_id, p.id, p.permission_key, ur.scope, ur.club_id, ur.department_id,
       'ROLE'::VARCHAR(16), r.id
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.active
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id AND p.active
WHERE ur.revoked_at IS NULL;

-- ---------------------------------------------------------------------------------------------
-- System roles for the usual club positions
-- ---------------------------------------------------------------------------------------------
INSERT INTO roles (code, name, description, scope, system) VALUES
    ('SYSTEM_ADMIN', 'Quản trị hệ thống', 'Toàn quyền trên hệ thống', 'GLOBAL', TRUE),
    ('CLUB_PRESIDENT', 'Chủ nhiệm CLB', 'Quản lý thông tin, ban và thành viên của CLB', 'CLUB', TRUE),
    ('CLUB_VICE_PRESIDENT', 'Phó chủ nhiệm CLB', 'Quản lý thành viên và phân ban của CLB', 'CLUB', TRUE),
    ('DEPARTMENT_HEAD', 'Trưởng ban', 'Quản lý thông tin và thành viên của ban', 'DEPARTMENT', TRUE),
    ('CLUB_MEMBER', 'Thành viên CLB', 'Xem thông tin CLB, các ban và danh sách thành viên', 'CLUB', TRUE);

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r JOIN permissions p ON (
       (r.code = 'SYSTEM_ADMIN')
    OR (r.code = 'CLUB_PRESIDENT' AND p.permission_key IN (
            'club.view', 'club.update', 'department.view', 'department.create', 'department.update',
            'department.activate', 'department.inactive', 'member.view', 'member.view_detail', 'member.add',
            'member.update', 'member.remove', 'department.member.view', 'department.member.add',
            'department.member.remove'))
    OR (r.code = 'CLUB_VICE_PRESIDENT' AND p.permission_key IN (
            'club.view', 'department.view', 'member.view', 'member.view_detail', 'member.add', 'member.update',
            'department.member.view', 'department.member.add', 'department.member.remove'))
    OR (r.code = 'DEPARTMENT_HEAD' AND p.permission_key IN (
            'department.update', 'department.member.view', 'department.member.add', 'department.member.remove'))
    OR (r.code = 'CLUB_MEMBER' AND p.permission_key IN ('club.view', 'department.view', 'member.view'))
);
