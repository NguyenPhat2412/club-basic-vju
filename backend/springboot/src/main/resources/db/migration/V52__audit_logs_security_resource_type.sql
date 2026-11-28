-- Extend audit_logs resource_type CHECK constraint to permit SECURITY events (rate-limit blocks, IP blocklist).

ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT',
     'APPLICATION', 'APPLICATION_FORM', 'DOCUMENT', 'EVENT', 'TASK', 'CHAT_CHANNEL', 'NOTIFICATION', 'SYSTEM_SETTINGS',
     'SECURITY'));
