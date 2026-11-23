-- V40: Dedicated RBAC permissions for Club Facebook Fanpage viewing and management.
-- Backward compatible: ClubFacebookServiceImpl continues to accept club.update/club.view alongside these granular permissions.

INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('club.facebook.view', 'club', 'facebook.view', 'CLUB', 'View club Facebook Fanpage insights and synced posts'),
    ('club.facebook.manage', 'club', 'facebook.manage', 'CLUB', 'Connect, sync, and disconnect club Facebook Fanpage')
ON CONFLICT (permission_key) DO UPDATE
SET
    description = EXCLUDED.description,
    active = TRUE;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code IN ('SYSTEM_ADMIN', 'CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
    AND p.permission_key IN ('club.facebook.view', 'club.facebook.manage')
)
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'CLUB_MEMBER'
    AND p.permission_key = 'club.facebook.view'
)
ON CONFLICT DO NOTHING;
