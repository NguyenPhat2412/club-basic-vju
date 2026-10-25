-- V9: who created and who last changed each business record, filled by Spring Data JPA auditing
-- (@CreatedBy / @LastModifiedBy) from the signed-in user. NULL means no signed-in user: self
-- registration, seed data or a background job.
--
-- These are plain UUID columns without a foreign key on purpose: they are metadata, and a FK to
-- users would make every one of these tables part of a TRUNCATE ... CASCADE on users (wiping the
-- seeded system roles, for instance) and would block removing a user that ever edited anything.
ALTER TABLE users             ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE clubs             ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE departments       ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE memberships       ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE roles             ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE club_applications ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
ALTER TABLE notifications     ADD COLUMN created_by UUID, ADD COLUMN updated_by UUID;
