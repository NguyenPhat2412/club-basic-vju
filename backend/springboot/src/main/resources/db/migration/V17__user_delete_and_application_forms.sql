-- V17: User account deletion support, Club Application Form Builder (CRUD),
-- detailed Club Application fields (CRUD), and file attachments (Docs/PDF/Images).

-- ---------------------------------------------------------------------------------------------
-- 1. New Permissions & Role Grants
-- ---------------------------------------------------------------------------------------------
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('user.delete', 'user', 'delete', 'GLOBAL', 'Delete a user account'),
    ('application.manage_form', 'application', 'manage_form', 'CLUB', 'Create and manage club application forms'),
    ('application.update', 'application', 'update', 'CLUB', 'Update club applications'),
    ('application.delete', 'application', 'delete', 'CLUB', 'Delete club applications')
ON CONFLICT (permission_key) DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code = 'SYSTEM_ADMIN'
  AND p.permission_key IN ('user.delete', 'application.manage_form', 'application.update', 'application.delete')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r CROSS JOIN permissions p
WHERE r.code IN ('CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
  AND p.permission_key IN ('application.manage_form', 'application.update', 'application.delete')
ON CONFLICT DO NOTHING;

-- ---------------------------------------------------------------------------------------------
-- 2. Adjust Foreign Keys & Constraints for Safe User Account Deletion
-- ---------------------------------------------------------------------------------------------
-- audit_logs is append-only (trg_audit_logs_append_only rejects UPDATE/DELETE), so actor_user_id
-- must remain an immutable UUID without a cascading/restricting FK to users.
ALTER TABLE audit_logs DROP CONSTRAINT IF EXISTS audit_logs_actor_user_id_fkey;

ALTER TABLE memberships DROP CONSTRAINT IF EXISTS memberships_user_id_fkey;
ALTER TABLE memberships
    ADD CONSTRAINT memberships_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE user_permissions ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_user_id_fkey;
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_granted_by_fkey;
ALTER TABLE user_permissions DROP CONSTRAINT IF EXISTS user_permissions_revoked_by_fkey;
ALTER TABLE user_permissions
    ADD CONSTRAINT user_permissions_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT user_permissions_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT user_permissions_revoked_by_fkey
        FOREIGN KEY (revoked_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE user_roles ALTER COLUMN granted_by DROP NOT NULL;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_user_id_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_granted_by_fkey;
ALTER TABLE user_roles DROP CONSTRAINT IF EXISTS user_roles_revoked_by_fkey;
ALTER TABLE user_roles
    ADD CONSTRAINT user_roles_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT user_roles_granted_by_fkey
        FOREIGN KEY (granted_by) REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT user_roles_revoked_by_fkey
        FOREIGN KEY (revoked_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_actor_user_id_fkey;
ALTER TABLE permission_audit_logs DROP CONSTRAINT IF EXISTS permission_audit_logs_target_user_id_fkey;
ALTER TABLE permission_audit_logs
    ADD CONSTRAINT permission_audit_logs_actor_user_id_fkey
        FOREIGN KEY (actor_user_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT permission_audit_logs_target_user_id_fkey
        FOREIGN KEY (target_user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE club_applications DROP CONSTRAINT IF EXISTS club_applications_applicant_id_fkey;
ALTER TABLE club_applications DROP CONSTRAINT IF EXISTS club_applications_reviewed_by_fkey;
ALTER TABLE club_applications DROP CONSTRAINT IF EXISTS ck_club_applications_review;
ALTER TABLE club_applications
    ADD CONSTRAINT club_applications_applicant_id_fkey
        FOREIGN KEY (applicant_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT club_applications_reviewed_by_fkey
        FOREIGN KEY (reviewed_by) REFERENCES users (id) ON DELETE SET NULL,
    ADD CONSTRAINT ck_club_applications_review CHECK (
        (status = 'PENDING' AND reviewed_by IS NULL AND reviewed_at IS NULL AND cancelled_at IS NULL)
        OR (status IN ('APPROVED', 'REJECTED') AND reviewed_at IS NOT NULL AND cancelled_at IS NULL)
        OR (status = 'CANCELLED' AND reviewed_by IS NULL AND reviewed_at IS NULL AND cancelled_at IS NOT NULL)
    );

-- document_versions has an immutability trigger on UPDATE, so drop FK on uploaded_by and deleted_by
-- while cascading owned documents on user deletion.
ALTER TABLE document_versions DROP CONSTRAINT IF EXISTS document_versions_uploaded_by_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_deleted_by_fkey;
ALTER TABLE documents DROP CONSTRAINT IF EXISTS documents_owner_id_fkey;
ALTER TABLE documents
    ADD CONSTRAINT documents_owner_id_fkey
        FOREIGN KEY (owner_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE event_registrations DROP CONSTRAINT IF EXISTS event_registrations_user_id_fkey;
ALTER TABLE event_registrations
    ADD CONSTRAINT event_registrations_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE event_attendances DROP CONSTRAINT IF EXISTS event_attendances_user_id_fkey;
ALTER TABLE event_attendances DROP CONSTRAINT IF EXISTS event_attendances_checked_by_fkey;
ALTER TABLE event_attendances
    ADD CONSTRAINT event_attendances_user_id_fkey
        FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assignee_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_assigner_id_fkey;
ALTER TABLE tasks DROP CONSTRAINT IF EXISTS tasks_verified_by_fkey;
ALTER TABLE tasks
    ADD CONSTRAINT tasks_assignee_id_fkey
        FOREIGN KEY (assignee_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT tasks_assigner_id_fkey
        FOREIGN KEY (assigner_id) REFERENCES users (id) ON DELETE CASCADE,
    ADD CONSTRAINT tasks_verified_by_fkey
        FOREIGN KEY (verified_by) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE chat_messages DROP CONSTRAINT IF EXISTS chat_messages_sender_id_fkey;
ALTER TABLE chat_messages
    ADD CONSTRAINT chat_messages_sender_id_fkey
        FOREIGN KEY (sender_id) REFERENCES users (id) ON DELETE SET NULL;

ALTER TABLE ai_summaries DROP CONSTRAINT IF EXISTS ai_summaries_requested_by_fkey;
ALTER TABLE ai_summaries
    ADD CONSTRAINT ai_summaries_requested_by_fkey
        FOREIGN KEY (requested_by) REFERENCES users (id) ON DELETE CASCADE;

-- Update audit_logs resource_type constraint to include APPLICATION_FORM
ALTER TABLE audit_logs DROP CONSTRAINT ck_audit_logs_resource_type;
ALTER TABLE audit_logs ADD CONSTRAINT ck_audit_logs_resource_type CHECK (resource_type IN
    ('USER', 'CLUB', 'DEPARTMENT', 'MEMBERSHIP', 'DEPARTMENT_MEMBER', 'PERMISSION_GRANT', 'ROLE', 'ROLE_ASSIGNMENT',
     'APPLICATION', 'APPLICATION_FORM', 'DOCUMENT', 'EVENT', 'TASK', 'CHAT_CHANNEL', 'NOTIFICATION'));

-- ---------------------------------------------------------------------------------------------
-- 3. Club Application Forms (Biểu mẫu đơn đăng ký CLB)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE club_application_forms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    status VARCHAR(16) NOT NULL DEFAULT 'OPEN',
    open_at TIMESTAMPTZ,
    close_at TIMESTAMPTZ,
    fields_config TEXT NOT NULL DEFAULT '[]',
    allow_attachments BOOLEAN NOT NULL DEFAULT TRUE,
    require_attachment BOOLEAN NOT NULL DEFAULT FALSE,
    max_attachments INT NOT NULL DEFAULT 5,
    is_default BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    created_by UUID,
    updated_by UUID,
    CONSTRAINT ck_club_application_forms_status CHECK (status IN ('DRAFT', 'OPEN', 'CLOSED')),
    CONSTRAINT ck_club_application_forms_max_attachments CHECK (max_attachments BETWEEN 1 AND 20),
    CONSTRAINT ck_club_application_forms_fields_array CHECK (jsonb_typeof(fields_config::jsonb) = 'array')
);

CREATE INDEX idx_club_application_forms_club
    ON club_application_forms (club_id, is_default DESC, created_at DESC);
CREATE TRIGGER trg_club_application_forms_updated_at BEFORE UPDATE ON club_application_forms
    FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------------------------
-- 4. Expand Club Applications with Detailed Input Fields
-- ---------------------------------------------------------------------------------------------
ALTER TABLE club_applications
    ADD COLUMN form_id UUID REFERENCES club_application_forms (id) ON DELETE SET NULL,
    ADD COLUMN preferred_department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    ADD COLUMN secondary_department_id UUID REFERENCES departments (id) ON DELETE SET NULL,
    ADD COLUMN applicant_phone VARCHAR(30),
    ADD COLUMN faculty_major VARCHAR(150),
    ADD COLUMN academic_year VARCHAR(50),
    ADD COLUMN gpa VARCHAR(20),
    ADD COLUMN social_portfolio_url VARCHAR(500),
    ADD COLUMN self_introduction VARCHAR(2000),
    ADD COLUMN skills_experience VARCHAR(2000),
    ADD COLUMN availability VARCHAR(500),
    ADD COLUMN custom_answers TEXT NOT NULL DEFAULT '{}',
    ADD CONSTRAINT ck_club_applications_custom_answers_object CHECK (jsonb_typeof(custom_answers::jsonb) = 'object');

CREATE INDEX idx_club_applications_form ON club_applications (form_id);
CREATE INDEX idx_club_applications_pref_dept ON club_applications (preferred_department_id);
CREATE INDEX idx_club_applications_sec_dept ON club_applications (secondary_department_id);

-- ---------------------------------------------------------------------------------------------
-- 5. Club Application Files (Docs, PDF, Images for Form Templates & Applicant Submissions)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE club_application_files (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    form_id UUID REFERENCES club_application_forms (id) ON DELETE CASCADE,
    application_id UUID REFERENCES club_applications (id) ON DELETE CASCADE,
    file_category VARCHAR(32) NOT NULL DEFAULT 'APPLICANT_ATTACHMENT',
    original_name VARCHAR(255) NOT NULL,
    file_type VARCHAR(16) NOT NULL,
    content_type VARCHAR(127) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_path VARCHAR(1024) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    uploaded_by UUID,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_club_application_files_owner CHECK (
        (form_id IS NOT NULL AND application_id IS NULL)
        OR (form_id IS NULL AND application_id IS NOT NULL)
    ),
    CONSTRAINT ck_club_application_files_category CHECK (
        file_category IN (
            'FORM_TEMPLATE_DOC',
            'FORM_POSTER_IMAGE',
            'APPLICANT_DOC',
            'APPLICANT_CV_PDF',
            'APPLICANT_IMAGE',
            'APPLICANT_ATTACHMENT'
        )
    ),
    CONSTRAINT ck_club_application_files_size_positive CHECK (size_bytes > 0)
);

CREATE INDEX idx_club_application_files_club ON club_application_files (club_id, created_at DESC);
CREATE INDEX idx_club_application_files_form ON club_application_files (form_id, created_at ASC);
CREATE INDEX idx_club_application_files_app ON club_application_files (application_id, created_at ASC);

-- Seed a default open application form for any existing clubs
INSERT INTO club_application_forms (
    club_id, title, description, status, fields_config,
    allow_attachments, require_attachment, max_attachments, is_default
)
SELECT
    c.id,
    'Đơn đăng ký tuyển thành viên ' || c.name,
    'Chào mừng bạn đến với đợt tuyển thành viên của ' || c.name || '! Vui lòng điền đầy đủ thông tin cá nhân, chọn Ban nguyện vọng và đính kèm Đơn đăng ký (.doc/.docx), CV (.pdf) hoặc hình ảnh minh chứng hoạt động.',
    'OPEN',
    '[{"key":"interview_slot","label":"Khung giờ bạn có thể tham gia phỏng vấn","type":"SELECT","required":false,"placeholder":"Chọn khung giờ phù hợp","options":["Sáng Thứ 7 (08:30 - 11:30)","Chiều Thứ 7 (14:00 - 17:00)","Sáng Chủ Nhật (08:30 - 11:30)","Buổi tối trong tuần (Online)"]},{"key":"achievements","label":"Thành tích nổi bật hoặc dự án đã tham gia","type":"TEXTAREA","required":false,"placeholder":"Chia sẻ ngắn gọn về giải thưởng, sự kiện hoặc sản phẩm bạn từng thực hiện...","options":[]}]',
    TRUE,
    FALSE,
    5,
    TRUE
FROM clubs c
WHERE NOT EXISTS (SELECT 1 FROM club_application_forms f WHERE f.club_id = c.id);

