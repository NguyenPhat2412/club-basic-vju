# ADR-005: Kênh Chat thời gian thực STOMP WebSocket + HTTP Range Media và Kho tài liệu tập trung 3 tầng

## Status
Accepted

## Date
2026-11-15

## Context
Khi các CLB sinh viên VJU sử dụng hệ thống cho điều hành sự kiện và lưu trữ hồ sơ hằng ngày, hai nhu cầu nâng cao phát sinh:
1. **Giao tiếp nội bộ tức thời:** Mô hình chat chỉ làm mới qua HTTP polling gây trễ, thiếu trạng thái đã đọc, không hỗ trợ xem trước ảnh/video dung lượng lớn, không có mẫu tin nhắn nhanh (`/quick-reply`) hay ghim thông báo quan trọng trên đầu kênh.
2. **Quản trị tài liệu đa cấp:** Tài liệu không chỉ nằm ở cấp CLB (`CLUB`) mà còn có quy chế chung toàn trường (`SYSTEM`) và tài liệu làm việc nội bộ từng Ban (`DEPARTMENT`), đồng thời cần hỗ trợ linh hoạt lưu trữ cục bộ, Cloudflare R2 hoặc Google Drive mà không làm tràn bộ nhớ backend khi phát tệp lớn.

## Decision
1. **Kiến trúc Chat lai (STOMP over WebSocket + REST Cursor Pagination — `V25`, `V28`, `V29`):**
   - Sử dụng **STOMP WebSocket** (`ChatWsController`, `/ws/chat`) để đẩy tin nhắn mới, sự kiện ghim/bỏ ghim và cập nhật trạng thái đọc theo thời gian thực; kết hợp REST phân trang con trỏ (`idx_chat_messages_channel_cursor`) và bộ nhớ đệm phía trình duyệt (**LRU + IndexedDB** trong `chat-message-cache.ts`) để chuyển kênh tức thì.
   - Bổ sung đính kèm đa phương tiện (`chat_message_attachments`: `IMAGE`, `VIDEO`, `FILE` có kiểm tra `checksum_sha256` và phát luồng `HTTP Range` qua `GET /api/v1/chat-attachments/{attachmentId}/stream`), kho phản hồi nhanh theo CLB (`chat_quick_replies` kích hoạt bằng `/`) và thanh ghim tin nhắn kiểu Messenger (`ChatPinService`, `V29`).
2. **Kho tài liệu tập trung 3 tầng (`SYSTEM` / `CLUB` / `DEPARTMENT` — `V25`, `V26`):**
   - Ràng buộc trực tiếp trên PostgreSQL qua `ck_documents_scope_target` bảo đảm tính nhất quán giữa `scope`, `club_id`, `department_id` và `visibility` (`PUBLIC_INTERNAL`, `OFFICERS`, `MEMBERS`, `DEPARTMENT_ONLY`).
   - Trừu tượng hóa lưu trữ qua interface `DocumentStorage` hỗ trợ 3 adapter: **Local File System**, **Cloudflare R2 (S3-compatible)** và **Google Drive Storage**; ghi tệp trước khi commit và tự động dọn tệp mồ côi nếu transaction cơ sở dữ liệu rollback.

## Alternatives Considered

### Đẩy tệp nhị phân trực tiếp qua khung tin nhắn WebSocket
- **Nhược điểm:** Làm nghẽn luồng tin nhắn văn bản thời gian thực, vượt ngưỡng kích thước frame STOMP và không tận dụng được `HTTP 206 Partial Content` (Range requests) của trình duyệt khi tua video.
- **Lý do loại bỏ:** Tách tải lên/phát trực tuyến media qua HTTP (`ChatMediaController`) rồi gắn `attachmentId` vào tin nhắn chat giúp kênh STOMP cực nhẹ và ổn định.

### Lưu nhị phân tài liệu/ảnh trực tiếp vào cột `BYTEA` của PostgreSQL
- **Nhược điểm:** Làm phình nhanh dung lượng `pg_dump` hằng đêm trên VPS và tốn RAM bộ đệm PostgreSQL.
- **Lý do loại bỏ:** PostgreSQL chỉ lưu siêu dữ liệu, khóa lưu trữ (`storage_key`) và mã băm `SHA-256`; luồng nhị phân nằm trên tầng `DocumentStorage`.

## Consequences
- Reverse proxy Nginx trên môi trường Stagging và Production (`deploy/nginx/vju-club*.conf`) phải bật nâng cấp kết nối `Upgrade` / `Connection "upgrade"` cho đường dẫn WebSocket và cho phép kích thước body phù hợp với giới hạn `document_max_file_mb` (`20MB`).
- Mọi kiểm tra quyền truy cập tệp đính kèm chat và xem trước tài liệu (`/preview`, `/stream`) đều xác thực phiên `CLUB_SESSION` và phạm vi kênh/ban trước khi mở luồng đọc tệp (`DocumentThreeTierAccessTest`, `ChatMediaAndQuickReplyTest`).
