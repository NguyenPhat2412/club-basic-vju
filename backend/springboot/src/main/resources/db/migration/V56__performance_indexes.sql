-- V56: Performance indexes for high-frequency queries & missing foreign key indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_unread
    ON notifications (user_id, created_at DESC)
    WHERE read = FALSE;

CREATE INDEX IF NOT EXISTS idx_users_status
    ON users (status);

CREATE INDEX IF NOT EXISTS idx_memberships_club_status
    ON memberships (club_id, status);

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_creator_created
    ON notification_campaigns (created_by, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_notification_campaigns_document
    ON notification_campaigns (document_id)
    WHERE document_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_blocked_ips_blocked_by
    ON blocked_ips (blocked_by)
    WHERE blocked_by IS NOT NULL;
