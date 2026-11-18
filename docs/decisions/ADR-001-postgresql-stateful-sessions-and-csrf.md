# ADR-001: Chuyển sang phiên máy chủ lưu trên PostgreSQL (`spring_session`), Cookie `HttpOnly` + CSRF và Google OAuth2 `@st.vju.ac.vn`

## Status
Accepted (Supersedes initial stateless JWT + `refresh_tokens` table from `V2`)

## Date
2026-10-18 (cập nhật mở rộng Google OAuth2 ngày `2026-11-09`)

## Context
Ở giai đoạn khởi tạo (`V2__create_refresh_tokens.sql`), hệ thống thử nghiệm mô hình cặp JWT ngắn hạn lưu phía trình duyệt kèm bảng `refresh_tokens`. Tuy nhiên, các yêu cầu nghiệp vụ quản trị tài khoản CLB sinh viên VJU đặt ra ba ràng buộc nghiêm ngặt:
1. **Thu hồi quyền tức thời (`PB-04`, `PB-38`):** Khi Quản trị viên khóa tài khoản (`LOCKED`), vô hiệu hóa (`INACTIVE`) hoặc ẩn danh tài khoản (`anonymized_at`), mọi phiên đăng nhập đang mở trên mọi thiết bị phải mất hiệu lực **ngay lập tức** ở request kế tiếp mà không được tồn tại thêm 15 phút theo hạn sống của access token.
2. **Bảo vệ chống XSS trên SPA:** Lưu bearer token trong `localStorage` khiến ứng dụng dễ mất phiên nếu phát sinh lỗ hổng XSS.
3. **Liên kết danh tính sinh viên trường (`@st.vju.ac.vn`):** Sinh viên VJU dùng Google Workspace của trường để tự đăng ký/đăng nhập không mật khẩu, trong khi tài khoản quản trị/cán bộ đặc thù vẫn cần đăng nhập bằng email + mật khẩu BCrypt.

## Decision
1. Sử dụng **Spring Session JDBC** (`V12__http_sessions.sql`: bảng `spring_session` và `spring_session_attributes` trong PostgreSQL) cấp phát cookie phiên `CLUB_SESSION` (`HttpOnly`, `SameSite=Lax`, `Secure` trên HTTPS).
2. Bật bảo vệ **SPA CSRF** bắt buộc cho mọi phương thức thay đổi trạng thái (`POST`, `PUT`, `PATCH`, `DELETE`): client đọc cookie `XSRF-TOKEN` (khởi tạo qua `GET /api/v1/auth/csrf`) và gửi lại qua header `X-XSRF-TOKEN`.
3. Thực thi `AccountStatusFilter` kiểm tra trạng thái tài khoản hiện hành và gọi `UserSessionService#endAllSessions` ngay khi tài khoản bị chuyển sang `LOCKED`, `INACTIVE`, đổi mật khẩu bắt buộc hoặc bị ẩn danh PII.
4. Tích hợp xác thực **Google ID Token** (`V15__google_sign_in.sql`, `POST /api/v1/auth/google`) ràng buộc miền `@st.vju.ac.vn` và cột `users.google_subject` duy nhất để chống chiếm quyền khi tái sử dụng địa chỉ email.

## Alternatives Considered

### Giữ nguyên Stateless JWT + `refresh_tokens` (`V2`)
- **Ưu điểm:** Không cần đọc bảng phiên trên mỗi request nếu chỉ xác minh chữ ký JWT.
- **Nhược điểm:** Không thể thu hồi tức thời các access token chưa hết hạn nếu không duy trì thêm danh sách đen (token blocklist) trên DB/Redis — vốn làm mất lợi thế stateless ban đầu; lưu token phía JS tăng bề mặt tấn công XSS.
- **Lý do loại bỏ:** Vi phạm tiêu chí thu hồi phiên tức thời khi khóa/ẩn danh tài khoản.

### Triển khai máy chủ OAuth2 / Keycloak riêng
- **Ưu điểm:** Đầy đủ tính năng SSO doanh nghiệp.
- **Nhược điểm:** Tăng gấp đôi chi phí RAM trên VPS đơn và độ phức tạp vận hành/sao lưu cho quy mô 12 CLB sinh viên.
- **Lý do loại bỏ:** Quá nặng so với hạ tầng Docker Compose mục tiêu.

## Consequences
- **Thu hồi phiên tức thời & bền vững qua restart:** Khởi động lại container backend hoặc deploy bản mới không làm đăng xuất người dùng đang thao tác vì phiên nằm trong PostgreSQL.
- **Lưu ý quan trọng (Gotcha) cho mã nguồn:**
  - Bảng `refresh_tokens` từ `V2` đã ngừng sử dụng kể từ `V12`; tuyệt đối **không** viết câu lệnh dọn dẹp chạm vào `refresh_tokens` trong các luồng xóa/ẩn danh người dùng (`UserAccountPurgeSupport`).
  - Mọi client kiểm thử (Postman, `curl`, Frontend `apiClient`) khi gọi request ghi dữ liệu phải kèm cả cookie `CLUB_SESSION` lẫn header `X-XSRF-TOKEN` (riêng `apiClient` trên frontend tự động thử lại 1 lần nếu gặp `CSRF_INVALID`).
