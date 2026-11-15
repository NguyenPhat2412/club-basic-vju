-- V28: Chat-TTA style rich media attachments (images, videos, files) and club quick replies (Tin nhan nhanh).
-- Note: Avoid dollar-quoted blocks so Flyway placeholder parsing never collides with JSON/text literals.

-- ---------------------------------------------------------------------------------------------
-- 1. Chat Message Attachments (Images, Videos, Direct Files)
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_message_attachments (
    id UUID PRIMARY KEY,
    channel_id UUID NOT NULL REFERENCES chat_channels (id) ON DELETE CASCADE,
    message_id UUID REFERENCES chat_messages (id) ON DELETE CASCADE,
    uploader_id UUID NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    file_name VARCHAR(255) NOT NULL,
    content_type VARCHAR(120) NOT NULL,
    media_kind VARCHAR(16) NOT NULL,
    size_bytes BIGINT NOT NULL,
    storage_key VARCHAR(512) NOT NULL,
    checksum_sha256 VARCHAR(64) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT ck_chat_message_attachments_kind CHECK (media_kind IN ('IMAGE', 'VIDEO', 'FILE')),
    CONSTRAINT ck_chat_message_attachments_size CHECK (size_bytes > 0)
);

CREATE INDEX IF NOT EXISTS idx_chat_attachments_message
    ON chat_message_attachments (message_id, sort_order, created_at)
    WHERE message_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_chat_attachments_channel_pending
    ON chat_message_attachments (channel_id, uploader_id, created_at)
    WHERE message_id IS NULL;

CREATE INDEX IF NOT EXISTS idx_chat_attachments_uploader
    ON chat_message_attachments (uploader_id);

-- ---------------------------------------------------------------------------------------------
-- 2. Chat Quick Replies (Tin nhan nhanh) per Club
-- ---------------------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS chat_quick_replies (
    id UUID PRIMARY KEY,
    club_id UUID NOT NULL REFERENCES clubs (id) ON DELETE CASCADE,
    created_by UUID REFERENCES users (id) ON DELETE SET NULL,
    shortcut VARCHAR(40) NOT NULL,
    title VARCHAR(120) NOT NULL,
    content VARCHAR(2000) NOT NULL,
    sort_order INT NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_chat_quick_replies_club_shortcut UNIQUE (club_id, shortcut)
);

CREATE INDEX IF NOT EXISTS idx_chat_quick_replies_club_sort
    ON chat_quick_replies (club_id, sort_order, created_at);

CREATE INDEX IF NOT EXISTS idx_chat_quick_replies_creator
    ON chat_quick_replies (created_by);

-- Seed practical VJU Club quick replies across all existing clubs
INSERT INTO chat_quick_replies (id, club_id, created_by, shortcut, title, content, sort_order)
SELECT
    md5(c.id::text || ':qr:' || t.shortcut)::uuid,
    c.id,
    NULL,
    t.shortcut,
    t.title,
    t.content,
    t.sort_order
FROM clubs c
CROSS JOIN (
    VALUES
        ('/diem-danh', 'Điểm danh sinh hoạt CLB', '📋 [Điểm danh] Các thành viên tham gia buổi sinh hoạt hôm nay vui lòng phản hồi Họ tên + Ban chuyên môn ngay bên dưới nhé!', 1),
        ('/lich-tap', 'Nhắc lịch Hòa Lạc & Mỹ Đình', '⏰ [Nhắc lịch] Nhắc các thành viên lịch hoạt động tuần này tại cơ sở Hòa Lạc & Mỹ Đình. Mọi người có mặt trước 15 phút để chuẩn bị nhé!', 2),
        ('/da-nhan', 'Xác nhận đã tiếp nhận', '✅ Ban Chủ nhiệm đã tiếp nhận thông tin và tệp đính kèm. Cảm ơn bạn đã cập nhật kịp thời!', 3),
        ('/media', 'Gửi tư liệu ảnh & video', '🎬 Nhờ Ban Truyền thông gửi hình ảnh & video highlight hoạt động trực tiếp vào kênh này để tổng hợp truyền thông CLB nhé!', 4),
        ('/ctv', 'Hướng dẫn Cộng tác viên', '🤝 Chào mừng các bạn Cộng tác viên! Vui lòng xem tệp phân công nhiệm vụ được đính kèm trong kênh và phản hồi nếu cần hỗ trợ.', 5)
) AS t(shortcut, title, content, sort_order)
ON CONFLICT (club_id, shortcut) DO NOTHING;
