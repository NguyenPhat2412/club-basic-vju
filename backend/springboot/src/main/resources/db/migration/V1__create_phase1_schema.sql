CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(320) NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    full_name VARCHAR(200) NOT NULL,
    student_code VARCHAR(50) UNIQUE,
    phone VARCHAR(32),
    avatar_url TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_users_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE clubs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(200) NOT NULL,
    logo_url TEXT,
    cover_url TEXT,
    description TEXT,
    activity_field VARCHAR(200),
    contact_email VARCHAR(320),
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_clubs_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_departments_club_name UNIQUE (club_id, name),
    CONSTRAINT ck_departments_status CHECK (status IN ('ACTIVE', 'INACTIVE'))
);

CREATE TABLE memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    status VARCHAR(16) NOT NULL DEFAULT 'ACTIVE',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    left_at TIMESTAMPTZ,
    CONSTRAINT uq_memberships_user_club UNIQUE (user_id, club_id),
    CONSTRAINT ck_memberships_status CHECK (status IN ('ACTIVE', 'INACTIVE', 'LEFT', 'SUSPENDED')),
    CONSTRAINT ck_memberships_left_at CHECK (status <> 'LEFT' OR left_at IS NOT NULL)
);

CREATE TABLE department_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    department_id UUID NOT NULL REFERENCES departments (id) ON DELETE CASCADE,
    membership_id UUID NOT NULL REFERENCES memberships (id) ON DELETE CASCADE,
    joined_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_department_members_assignment UNIQUE (department_id, membership_id)
);

CREATE TABLE permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    permission_key VARCHAR(120) NOT NULL UNIQUE,
    module VARCHAR(64) NOT NULL,
    action VARCHAR(64) NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'GLOBAL',
    description TEXT,
    active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_permissions_scope CHECK (scope IN ('GLOBAL', 'CLUB', 'DEPARTMENT'))
);

CREATE TABLE user_permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE RESTRICT,
    scope VARCHAR(16) NOT NULL DEFAULT 'GLOBAL',
    club_id UUID REFERENCES clubs (id) ON DELETE CASCADE,
    department_id UUID REFERENCES departments (id) ON DELETE CASCADE,
    granted_by UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    granted_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    revoked_at TIMESTAMPTZ,
    CONSTRAINT ck_user_permissions_scope CHECK (
        (scope = 'GLOBAL' AND club_id IS NULL AND department_id IS NULL)
        OR (scope = 'CLUB' AND club_id IS NOT NULL AND department_id IS NULL)
        OR (scope = 'DEPARTMENT' AND club_id IS NULL AND department_id IS NOT NULL)
    )
);

CREATE TABLE permission_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    actor_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    target_user_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    permission_id UUID NOT NULL REFERENCES permissions (id) ON DELETE RESTRICT,
    action VARCHAR(16) NOT NULL,
    scope VARCHAR(16) NOT NULL DEFAULT 'GLOBAL',
    club_id UUID REFERENCES clubs (id) ON DELETE SET NULL,
    department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    reason TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_permission_audit_action CHECK (action IN ('GRANT', 'REVOKE')),
    CONSTRAINT ck_permission_audit_scope CHECK (
        (scope = 'GLOBAL' AND club_id IS NULL AND department_id IS NULL)
        OR (scope = 'CLUB' AND club_id IS NOT NULL AND department_id IS NULL)
        OR (scope = 'DEPARTMENT' AND club_id IS NULL AND department_id IS NOT NULL)
    )
);

CREATE INDEX idx_departments_club_id ON departments (club_id);
CREATE INDEX idx_memberships_user_id ON memberships (user_id);
CREATE INDEX idx_memberships_club_id ON memberships (club_id);
CREATE INDEX idx_department_members_department_id ON department_members (department_id);
CREATE INDEX idx_department_members_membership_id ON department_members (membership_id);
CREATE INDEX idx_user_permissions_user_id ON user_permissions (user_id);
CREATE INDEX idx_user_permissions_permission_id ON user_permissions (permission_id);
CREATE INDEX idx_permission_audit_target_created_at ON permission_audit_logs (target_user_id, created_at DESC);

CREATE UNIQUE INDEX uq_user_permissions_active_global
    ON user_permissions (user_id, permission_id)
    WHERE revoked_at IS NULL AND scope = 'GLOBAL';

CREATE UNIQUE INDEX uq_user_permissions_active_club
    ON user_permissions (user_id, permission_id, club_id)
    WHERE revoked_at IS NULL AND scope = 'CLUB';

CREATE UNIQUE INDEX uq_user_permissions_active_department
    ON user_permissions (user_id, permission_id, department_id)
    WHERE revoked_at IS NULL AND scope = 'DEPARTMENT';

INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('user.view', 'user', 'view', 'GLOBAL', 'View user accounts'),
    ('user.update', 'user', 'update', 'GLOBAL', 'Update user profiles'),
    ('user.active', 'user', 'active', 'GLOBAL', 'Activate a user account'),
    ('user.inactive', 'user', 'inactive', 'GLOBAL', 'Deactivate a user account'),
    ('club.view', 'club', 'view', 'CLUB', 'View club information'),
    ('club.create', 'club', 'create', 'GLOBAL', 'Create a club'),
    ('club.update', 'club', 'update', 'CLUB', 'Update a club'),
    ('club.active', 'club', 'active', 'CLUB', 'Activate a club'),
    ('club.inactive', 'club', 'inactive', 'CLUB', 'Deactivate a club'),
    ('department.view', 'department', 'view', 'CLUB', 'View departments'),
    ('department.create', 'department', 'create', 'CLUB', 'Create a department'),
    ('department.update', 'department', 'update', 'DEPARTMENT', 'Update a department'),
    ('department.activate', 'department', 'activate', 'DEPARTMENT', 'Activate a department'),
    ('department.inactive', 'department', 'inactive', 'DEPARTMENT', 'Deactivate a department'),
    ('member.view', 'member', 'view', 'CLUB', 'View club members'),
    ('member.view_detail', 'member', 'view_detail', 'CLUB', 'View member details'),
    ('member.add', 'member', 'add', 'CLUB', 'Add a club member'),
    ('member.update', 'member', 'update', 'CLUB', 'Update a club member'),
    ('member.remove', 'member', 'remove', 'CLUB', 'Remove a club member'),
    ('department.member.view', 'department.member', 'view', 'DEPARTMENT', 'View department members'),
    ('department.member.add', 'department.member', 'add', 'DEPARTMENT', 'Add a department member'),
    ('department.member.remove', 'department.member', 'remove', 'DEPARTMENT', 'Remove a department member'),
    ('permission.view', 'permission', 'view', 'GLOBAL', 'View permission assignments'),
    ('permission.assign', 'permission', 'assign', 'GLOBAL', 'Grant a permission'),
    ('permission.revoke', 'permission', 'revoke', 'GLOBAL', 'Revoke a permission')
ON CONFLICT (permission_key) DO NOTHING;
