-- V7: student club applications and the Phase 2 review workflow.
CREATE TABLE club_applications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    applicant_id UUID NOT NULL REFERENCES users (id) ON DELETE RESTRICT,
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE RESTRICT,
    message VARCHAR(2000) NOT NULL,
    status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
    reviewed_by UUID REFERENCES users (id) ON DELETE RESTRICT,
    reviewed_at TIMESTAMPTZ,
    review_note VARCHAR(1000),
    cancelled_at TIMESTAMPTZ,
    version BIGINT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_club_applications_status CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED', 'CANCELLED')),
    CONSTRAINT ck_club_applications_review CHECK (
        (status = 'PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND cancelled_at IS NULL)
        OR (status IN ('APPROVED', 'REJECTED') AND reviewed_by IS NOT NULL AND reviewed_at IS NOT NULL AND cancelled_at IS NULL)
        OR (status = 'CANCELLED' AND reviewed_by IS NULL AND reviewed_at IS NULL AND cancelled_at IS NOT NULL)
    )
);

CREATE INDEX idx_club_applications_applicant ON club_applications (applicant_id, created_at DESC);
CREATE INDEX idx_club_applications_club_status ON club_applications (club_id, status, created_at DESC);
CREATE UNIQUE INDEX uq_club_applications_pending
    ON club_applications (applicant_id, club_id)
    WHERE status = 'PENDING';

INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('application.view', 'application', 'view', 'CLUB', 'View club applications'),
    ('application.view_detail', 'application', 'view_detail', 'CLUB', 'View club application details'),
    ('application.create', 'application', 'create', 'CLUB', 'Create a club application'),
    ('application.cancel', 'application', 'cancel', 'CLUB', 'Cancel a club application'),
    ('application.review', 'application', 'review', 'CLUB', 'Review club applications'),
    ('application.approve', 'application', 'approve', 'CLUB', 'Approve a club application'),
    ('application.reject', 'application', 'reject', 'CLUB', 'Reject a club application')
ON CONFLICT (permission_key) DO NOTHING;

ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT', 'APPLICATION'));

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
  AND p.permission_key IN (
      'application.view', 'application.view_detail', 'application.review',
      'application.approve', 'application.reject')
ON CONFLICT DO NOTHING;

CREATE TRIGGER trg_club_applications_updated_at BEFORE UPDATE ON club_applications
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();
