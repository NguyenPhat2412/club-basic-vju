-- V13: Align Phase 1 permissions and aliases
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES ('department.active', 'department', 'active', 'DEPARTMENT', 'Activate a department (alias for department.activate)')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r, permissions p
WHERE p.permission_key = 'department.active'
  AND (r.code = 'SYSTEM_ADMIN' OR r.code = 'CLUB_PRESIDENT')
ON CONFLICT DO NOTHING;
