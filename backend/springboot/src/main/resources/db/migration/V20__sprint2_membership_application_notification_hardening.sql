-- V20: Sprint 2 (Phase 2) hardening:
-- 1. Separate reviewer-only internal_note from applicant-visible review_note on club_applications (PB-56, PB-19.1, PB-20.3).
-- 2. Add reference_type and idempotent event_key to notifications (PB-34.1, PB-34.2, PB-46).
-- 3. Suppress CLUB and DEPARTMENT effective permissions while a club membership is SUSPENDED (PB-55, PB-16.2).

ALTER TABLE club_applications
    ADD COLUMN IF NOT EXISTS internal_note VARCHAR(1000);

ALTER TABLE notifications
    ADD COLUMN IF NOT EXISTS reference_type VARCHAR(40),
    ADD COLUMN IF NOT EXISTS event_key VARCHAR(120);

CREATE UNIQUE INDEX IF NOT EXISTS uq_notifications_user_event_key
    ON notifications (user_id, event_key)
    WHERE event_key IS NOT NULL;

UPDATE notifications n
SET reference_type = CASE
    WHEN EXISTS (SELECT 1 FROM club_applications ca WHERE ca.id = n.reference_id) THEN 'CLUB_APPLICATION'
    WHEN EXISTS (SELECT 1 FROM clubs c WHERE c.id = n.reference_id) THEN 'CLUB'
    WHEN EXISTS (SELECT 1 FROM events ev WHERE ev.id = n.reference_id) THEN 'EVENT'
    WHEN EXISTS (SELECT 1 FROM tasks t WHERE t.id = n.reference_id) THEN 'TASK'
    ELSE NULL
END
WHERE n.reference_id IS NOT NULL
  AND n.reference_type IS NULL;

CREATE OR REPLACE VIEW effective_user_permissions AS
SELECT up.user_id, p.id AS permission_id, p.permission_key, up.scope, up.club_id, up.department_id,
       'DIRECT'::VARCHAR(16) AS source, NULL::UUID AS role_id
FROM user_permissions up
JOIN permissions p ON p.id = up.permission_id AND p.active
LEFT JOIN departments d ON d.id = up.department_id
WHERE up.revoked_at IS NULL
  AND (
      up.scope = 'GLOBAL'
      OR NOT EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = up.user_id
            AND m.club_id = COALESCE(up.club_id, d.club_id)
            AND m.status = 'SUSPENDED'
      )
  )
UNION ALL
SELECT ur.user_id, p.id, p.permission_key, ur.scope, ur.club_id, ur.department_id,
       'ROLE'::VARCHAR(16), r.id
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id AND r.active
JOIN role_permissions rp ON rp.role_id = r.id
JOIN permissions p ON p.id = rp.permission_id AND p.active
LEFT JOIN departments d ON d.id = ur.department_id
WHERE ur.revoked_at IS NULL
  AND (
      ur.scope = 'GLOBAL'
      OR NOT EXISTS (
          SELECT 1 FROM memberships m
          WHERE m.user_id = ur.user_id
            AND m.club_id = COALESCE(ur.club_id, d.club_id)
            AND m.status = 'SUSPENDED'
      )
  );

