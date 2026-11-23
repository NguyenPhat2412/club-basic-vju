-- =============================================================================
-- V35: Backfill ACTIVE club memberships & department_members for officers
--      assigned via user_roles (PB-85 / BUG-P3-12) and seed Đoàn Thanh niên VJU
--      (DOANVJU) as the 13th club with its 3 departments (PB-84).
-- =============================================================================

-- -----------------------------------------------------------------------------
-- 1. Backfill missing ACTIVE memberships for users holding active club-scoped
--    or department-scoped role assignments without a current (non-LEFT) row.
-- -----------------------------------------------------------------------------
INSERT INTO memberships (user_id, club_id, status, joined_at, left_at)
SELECT src.user_id,
       src.club_id,
       'ACTIVE',
       MIN(src.granted_at),
       NULL
FROM (
    SELECT ur.user_id,
           COALESCE(ur.club_id, d.club_id) AS club_id,
           ur.granted_at
    FROM user_roles ur
    LEFT JOIN departments d ON d.id = ur.department_id
    WHERE ur.revoked_at IS NULL
      AND COALESCE(ur.club_id, d.club_id) IS NOT NULL
) src
WHERE NOT EXISTS (
    SELECT 1
    FROM memberships m
    WHERE m.user_id = src.user_id
      AND m.club_id = src.club_id
      AND m.status <> 'LEFT'
)
GROUP BY src.user_id, src.club_id;

-- -----------------------------------------------------------------------------
-- 2. Backfill missing department_members rows for users holding active
--    department-scoped role assignments with an ACTIVE club membership.
-- -----------------------------------------------------------------------------
INSERT INTO department_members (department_id, membership_id, club_id, joined_at)
SELECT ur.department_id,
       m.id,
       d.club_id,
       MIN(ur.granted_at)
FROM user_roles ur
JOIN departments d ON d.id = ur.department_id
JOIN memberships m
  ON m.user_id = ur.user_id
 AND m.club_id = d.club_id
 AND m.status = 'ACTIVE'
WHERE ur.revoked_at IS NULL
  AND ur.department_id IS NOT NULL
GROUP BY ur.department_id, m.id, d.club_id
ON CONFLICT (department_id, membership_id) DO NOTHING;

-- -----------------------------------------------------------------------------
-- 3. Seed Đoàn Thanh niên Trường Đại học Việt Nhật (DOANVJU) idempotently.
-- -----------------------------------------------------------------------------
INSERT INTO clubs (
    code,
    name,
    logo_url,
    cover_url,
    description,
    activity_field,
    contact_email,
    status,
    overview_config
)
SELECT
    'DOANVJU',
    'Đoàn Thanh niên Trường Đại học Việt Nhật',
    '/images/vju-logo.png',
    '/images/intro/campus-awards.jpg',
    'Tổ chức Đoàn TNCS Hồ Chí Minh Trường Đại học Việt Nhật (VJU) — đầu mối điều phối phong trào sinh viên, hỗ trợ vận hành hệ sinh thái 12 Câu lạc bộ trực thuộc và tổ chức các hoạt động cộng đồng, đối ngoại thanh niên Việt – Nhật tại hai cơ sở Hòa Lạc & Mỹ Đình.',
    'Đoàn thể & Điều phối',
    'doanthanhnien@vju.ac.vn',
    'ACTIVE',
    '{
  "preset": "VOLUNTEER",
  "slogan": "Xung kích · Sáng tạo · Hội nhập — Đầu mối kết nối Đoàn viên & hệ sinh thái 12 CLB sinh viên VJU",
  "campusLocation": "Văn phòng Đoàn Thanh niên — Cơ sở Mỹ Đình & Cơ sở Hòa Lạc",
  "operatingSchedule": "Thứ 2 – Thứ 6 · Giờ hành chính & Giao ban Ban Chấp hành định kỳ tối Thứ 4",
  "enabledBlocks": ["metrics", "highlights", "schedule", "departments", "gallery"],
  "customMetrics": [
    {"label": "CLB trực thuộc điều phối", "value": "12 CLB", "sub": "Kết nối học thuật, văn hóa, nghệ thuật, thể thao & tình nguyện"},
    {"label": "Hoạt động cấp trường", "value": "20+ sự kiện/năm", "sub": "Chào tân sinh viên · Tháng Thanh niên · Chiến dịch tình nguyện"},
    {"label": "Cơ sở hoạt động", "value": "02 cơ sở", "sub": "Phối hợp đồng bộ tại Hòa Lạc & Mỹ Đình"},
    {"label": "Ban chuyên môn trực thuộc", "value": "03 ban", "sub": "Điều phối CLB · Truyền thông & Sự kiện · Phong trào & Tình nguyện"}
  ],
  "highlights": [
    {"title": "Tháng Thanh niên & Ngày hội CLB Sinh viên VJU", "tag": "Chương trình trọng điểm", "description": "Điều phối không gian giới thiệu CLB, tuyển quân đầu năm và chuỗi hoạt động rèn luyện đoàn viên toàn trường."},
    {"title": "Chiến dịch Mùa Hè Xanh & Đối ngoại Thanh niên Việt – Nhật", "tag": "Phong trào & Hội nhập", "description": "Kết nối sinh viên tình nguyện vì cộng đồng và các chương trình giao lưu thanh niên quốc tế Việt Nam – Nhật Bản."}
  ]
}'
WHERE NOT EXISTS (
    SELECT 1
    FROM clubs
    WHERE lower(code) = 'doanvju'
);

-- -----------------------------------------------------------------------------
-- 4. Seed 3 departments for DOANVJU idempotently.
-- -----------------------------------------------------------------------------
INSERT INTO departments (club_id, name, description, status)
SELECT c.id, dep.name, dep.description, 'ACTIVE'
FROM clubs c
CROSS JOIN (
    VALUES
        ('Ban Điều phối CLB', 'Điều phối hoạt động, lịch sự kiện và hỗ trợ vận hành hệ sinh thái các Câu lạc bộ sinh viên Trường Đại học Việt Nhật.'),
        ('Ban Truyền thông & Sự kiện', 'Phụ trách truyền thông chính thức, ấn phẩm nhận diện và tổ chức các chương trình, lễ hội cấp trường của Đoàn Thanh niên VJU.'),
        ('Ban Phong trào & Tình nguyện', 'Tổ chức phong trào Đoàn – Hội, chiến dịch tình nguyện vì cộng đồng và các hoạt động giao lưu thanh niên Việt – Nhật.')
) AS dep(name, description)
WHERE lower(c.code) = 'doanvju'
  AND NOT EXISTS (
      SELECT 1
      FROM departments existing
      WHERE existing.club_id = c.id
        AND lower(existing.name) = lower(dep.name)
  );
