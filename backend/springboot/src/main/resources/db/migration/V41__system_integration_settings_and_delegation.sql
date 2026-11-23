-- V41: Runtime integration settings overrides (Facebook OAuth, AI Gateway, Google Sign-In)
-- and subordinate delegation scopes for permission.view / assign / revoke / role.view.

ALTER TABLE system_settings
    ADD COLUMN IF NOT EXISTS facebook_app_id VARCHAR(64),
    ADD COLUMN IF NOT EXISTS facebook_app_secret VARCHAR(512),
    ADD COLUMN IF NOT EXISTS facebook_graph_version VARCHAR(32),
    ADD COLUMN IF NOT EXISTS facebook_oauth_redirect_uri VARCHAR(500),
    ADD COLUMN IF NOT EXISTS frontend_base_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ai_base_url VARCHAR(500),
    ADD COLUMN IF NOT EXISTS ai_api_key VARCHAR(512),
    ADD COLUMN IF NOT EXISTS ai_model VARCHAR(120),
    ADD COLUMN IF NOT EXISTS google_client_id VARCHAR(255),
    ADD COLUMN IF NOT EXISTS google_allowed_domains VARCHAR(500),
    ADD COLUMN IF NOT EXISTS google_create_accounts BOOLEAN;

-- Allow permission delegation controls down to DEPARTMENT scope so Club Presidents can delegate
-- department-level access management and Department Heads can delegate their own department
-- permissions to subordinates within their department (GrantGuard prevents privilege escalation).
UPDATE permissions
SET scope = 'DEPARTMENT'
WHERE permission_key IN ('permission.view', 'permission.assign', 'permission.revoke', 'role.view');

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN ('permission.view', 'permission.assign', 'permission.revoke', 'role.view')
WHERE r.code = 'DEPARTMENT_HEAD'
ON CONFLICT DO NOTHING;
