-- V11: accounts are created by administrators (POST /api/v1/users); self-registration is removed.
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES ('user.create', 'user', 'create', 'GLOBAL', 'Create user accounts')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SYSTEM_ADMIN' AND p.permission_key = 'user.create'
ON CONFLICT DO NOTHING;

-- Forgotten passwords are handled by an administrator (PATCH /api/v1/users/{userId}/password).
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES ('user.reset_password', 'user', 'reset_password', 'GLOBAL', 'Set a new password for a user account')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id FROM roles r, permissions p
WHERE r.code = 'SYSTEM_ADMIN' AND p.permission_key = 'user.reset_password'
ON CONFLICT DO NOTHING;
