-- Add updated_by column required by TimestampedEntity JPA auditing on notification_campaigns.

ALTER TABLE notification_campaigns
    ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id) ON DELETE SET NULL;
