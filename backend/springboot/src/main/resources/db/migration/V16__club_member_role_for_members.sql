-- V16: joining a club (approved application or direct add) gives the member the roles flagged granted_on_join in
-- that club; the seed flags CLUB_MEMBER, so members can see the club, its departments, its member list and its
-- documents. Leaving revokes every club role; suspension revokes only these roles (MembershipServiceImpl).
ALTER TABLE roles ADD COLUMN granted_on_join BOOLEAN NOT NULL DEFAULT false;
UPDATE roles SET granted_on_join = true WHERE code = 'CLUB_MEMBER';

-- Give it to the people who were already active members before this change.
INSERT INTO user_roles (user_id, role_id, scope, club_id, granted_by)
SELECT m.user_id, r.id, 'CLUB', m.club_id,
       COALESCE((SELECT ur.user_id FROM user_roles ur JOIN roles sr ON sr.id = ur.role_id
                 WHERE sr.code = 'SYSTEM_ADMIN' AND ur.revoked_at IS NULL ORDER BY ur.granted_at LIMIT 1), m.user_id)
FROM memberships m
JOIN roles r ON r.granted_on_join AND r.active AND r.scope = 'CLUB'
WHERE m.status = 'ACTIVE'
  AND NOT EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = m.user_id AND ur.role_id = r.id
                  AND ur.scope = 'CLUB' AND ur.club_id = m.club_id AND ur.revoked_at IS NULL);
