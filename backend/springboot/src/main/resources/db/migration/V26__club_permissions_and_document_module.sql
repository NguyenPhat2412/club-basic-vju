-- =============================================================================================
-- V26: Club-scoped RBAC delegation & Department-scoped Event/Chat operational permissions
-- =============================================================================================

-- 1. Allow Club Presidents/Officers to view & delegate roles/permissions within their own club
UPDATE permissions
SET scope = 'CLUB'
WHERE permission_key IN ('permission.view', 'permission.assign', 'permission.revoke', 'role.view');

-- 2. Allow Department Heads & Department-level grants for Event and Chat operations
UPDATE permissions
SET scope = 'DEPARTMENT'
WHERE permission_key IN (
    'event.view',
    'event.create',
    'event.update',
    'chat.view',
    'chat.send',
    'chat.summarize'
);

-- 3. Enrich CLUB_PRESIDENT with full club & department operational + delegation permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'CLUB_PRESIDENT'
    AND p.permission_key IN (
        'permission.view',
        'permission.assign',
        'permission.revoke',
        'role.view',
        'document.view',
        'document.upload',
        'document.update',
        'document.delete',
        'document.restore',
        'event.view',
        'event.create',
        'event.update',
        'event.attendance',
        'event.attendance_edit',
        'task.view',
        'task.create',
        'task.update',
        'task.verify',
        'chat.view',
        'chat.send',
        'chat.summarize',
        'notification.send'
    )
)
ON CONFLICT DO NOTHING;

-- 4. Enrich CLUB_VICE_PRESIDENT with missing club deputy operational permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'CLUB_VICE_PRESIDENT'
    AND p.permission_key IN (
        'department.update',
        'document.restore',
        'permission.view',
        'role.view'
    )
)
ON CONFLICT DO NOTHING;

-- 5. Enrich DEPARTMENT_HEAD with department-scoped Event, Attendance Edit, and Chat permissions
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON (
    r.code = 'DEPARTMENT_HEAD'
    AND p.permission_key IN (
        'document.view',
        'document.upload',
        'document.update',
        'event.view',
        'event.create',
        'event.update',
        'event.attendance',
        'event.attendance_edit',
        'task.view',
        'task.create',
        'task.update',
        'task.verify',
        'chat.view',
        'chat.send',
        'chat.summarize',
        'notification.send'
    )
)
ON CONFLICT DO NOTHING;
