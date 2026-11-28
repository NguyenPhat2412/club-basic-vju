-- V58: Dedicated RBAC permissions for Certificates, Training Points Reports & Club Posts,
-- plus Student Verifiable Certificate Proof Share Links (/verify/proof/{token}).

-- 1. Seed dedicated permissions (idempotent)
INSERT INTO permissions (permission_key, module, action, scope, description)
VALUES
    ('certificate.view', 'certificate', 'view', 'DEPARTMENT', 'Xem danh sách, tiến độ xác nhận và thống kê chứng nhận điện tử'),
    ('certificate.issue', 'certificate', 'issue', 'DEPARTMENT', 'Phát hành chứng nhận điện tử sau khi khoá sổ SHA-256 và gửi nhắc xác nhận'),
    ('certificate.template', 'certificate', 'template', 'DEPARTMENT', 'Tải lên, thay đổi hoặc xoá phôi ảnh chứng nhận riêng cho sự kiện'),
    ('certificate.revoke', 'certificate', 'revoke', 'DEPARTMENT', 'Thu hồi chứng nhận điện tử đã phát hành kèm lý do'),
    ('report.training_points.view', 'report', 'training_points.view', 'DEPARTMENT', 'Xem và xuất báo cáo tổng hợp điểm rèn luyện theo học kỳ'),
    ('club.post.manage', 'club', 'post.manage', 'CLUB', 'Đăng, chỉnh sửa, ghim và xoá bài viết trên bảng tin công khai của CLB')
ON CONFLICT (permission_key) DO NOTHING;

-- 2. Backfill existing built-in roles so current admins/officers retain full access seamlessly
INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
    'certificate.view',
    'certificate.issue',
    'certificate.template',
    'certificate.revoke',
    'report.training_points.view',
    'club.post.manage'
)
WHERE r.code IN ('SYSTEM_ADMIN', 'CLUB_PRESIDENT', 'CLUB_VICE_PRESIDENT')
ON CONFLICT DO NOTHING;

INSERT INTO role_permissions (role_id, permission_id)
SELECT r.id, p.id
FROM roles r
JOIN permissions p ON p.permission_key IN (
    'certificate.view',
    'report.training_points.view'
)
WHERE r.code = 'DEPARTMENT_HEAD'
ON CONFLICT DO NOTHING;

-- 3. Verifiable Certificate Proof Share Links for students (e.g., Class Vice Monitors / DRL Reviewers)
CREATE TABLE IF NOT EXISTS certificate_share_links (
    id UUID PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    academic_term VARCHAR(32),
    title VARCHAR(160),
    expires_at TIMESTAMPTZ,
    revoked_at TIMESTAMPTZ,
    view_count INTEGER NOT NULL DEFAULT 0,
    last_viewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT ck_cert_share_links_view_count CHECK (view_count >= 0)
);

CREATE INDEX IF NOT EXISTS idx_cert_share_links_user_created
    ON certificate_share_links (user_id, created_at DESC);
