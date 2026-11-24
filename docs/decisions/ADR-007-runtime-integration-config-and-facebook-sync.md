# ADR-007: Cấu hình Tích hợp Động Mã hoá AES-256-GCM, Hạ tầng Bất đồng bộ Tập trung & Đồng bộ Fanpage Facebook Tự động

- **Trạng thái:** Accepted
- **Ngày chốt:** `2026-11-24`
- **Liên kết mã nguồn & Migration:** `V38`, `V40`, `V41`, `V42`, `V43`, `SchedulingConfig`, `RuntimeIntegrationConfig`, `ClubFacebookServiceImpl`, `ClubFacebookSyncScheduler`, `TokenCryptoService`, `PermissionAuthorizationService`, `SystemIntegrationsCard.tsx`

---

## 1. Bối cảnh & Vấn đề cần giải quyết
1. **Quản trị thông số tích hợp bên ngoài (`.env`):** Trước `V41`, thay đổi `FACEBOOK_APP_ID`, `FACEBOOK_APP_SECRET`, `FACEBOOK_OAUTH_REDIRECT_URI`, `AI_API_KEY`, hay `GOOGLE_CLIENT_ID` đều buộc kỹ sư phải SSH vào VPS sửa `.env` và khởi động lại Docker container, gây rủi ro sai sót và gián đoạn dịch vụ.
2. **Xử lý bất đồng bộ & lịch nền trước đây chưa tập trung:** `SchedulingConfig` chỉ dùng 1 thread mặc định của Spring cho toàn bộ `@Scheduled`; `NotificationEmailListener` tự tạo pool với `DiscardPolicy` và `shutdownNow()`; `ClubFacebookServiceImpl` gọi HTTP tới Meta Graph API trong transaction DB; và `application.yml` chưa bật `server.shutdown: graceful`.
3. **Đồng bộ Fanpage Facebook trước `V43` chỉ chạy thủ công:** Bài viết mới không tự cập nhật về hệ thống và đường dẫn ảnh `fbcdn.net` có chữ ký tạm sẽ hết hạn nếu không làm mới định kỳ.
4. **Ủy quyền cấp dưới (`Subordinate Delegation`):** Trước `V41`, các quyền `permission.view/assign/revoke` và `role.view` bị cố định ở scope `CLUB`, khiến Chủ nhiệm CLB không thể ủy quyền cục bộ theo từng ban và Trưởng ban không thể ủy quyền các quyền mình đang nắm giữ cho thành viên trong ban.

---

## 2. Quyết định Kiến trúc

### 2.1 Cấu hình tích hợp live trên `system_settings` + Fallback `.env` (`V41`)
- `RuntimeIntegrationConfig` ưu tiên đọc bản ghi đè từ bảng đơn dòng `system_settings` và tự động fallback sang biến môi trường (`.env`) khi trường tương ứng để trống.
- Mọi khoá bí mật (`facebook_app_secret`, `ai_api_key`, `club_facebook_pages.encrypted_access_token`) được mã hoá bằng **AES-256-GCM** (`TokenCryptoService`, prefix `enc:v1:`) trước khi ghi PostgreSQL; API trả về và `audit_logs` chỉ hiển thị cờ boolean `*Configured` chứ tuyệt đối không trả bản rõ.
- Các bí mật tầng hạ tầng cốt lõi (`DB_PASSWORD`, `FACEBOOK_TOKEN_ENCRYPTION_KEY`) giữ cố định tại `.env` trên máy chủ.

### 2.2 Hạ tầng Bất đồng bộ Tập trung & Graceful Shutdown
- Mở rộng `SchedulingConfig` với `@EnableAsync` + `@EnableScheduling` và 3 thread pool riêng có `waitForTasksToCompleteOnShutdown = true` (`30s`):
  - `vjuTaskScheduler` (`4` luồng `vju-sched-*`) tách biệt hoàn toàn `TaskOverdue`, `ChatOrphanCleanup` và `ClubFacebookSyncScheduler`.
  - `integrationTaskExecutor` (`2..6` luồng `vju-int-*`, hàng đợi `100`).
  - `mailTaskExecutor` (`1..3` luồng `vju-mail-*`, hàng đợi `256`, ghi log cảnh báo khi vượt tải thay vì âm thầm `DiscardPolicy`).
- Bật `server.shutdown: graceful` và `spring.lifecycle.timeout-per-shutdown-phase: 25s` trong `application.yml`.

### 2.3 Chọn Polling định kỳ (`@Scheduled`) thay vì Meta Webhook ở Sprint 4 (`V43`)
- **Lựa chọn:** `ClubFacebookSyncScheduler` chạy mỗi 5 phút kiểm tra các CLB đến hạn `last_synced_at + facebook_auto_sync_interval_minutes` (mặc định `60 phút`, cấu hình `15..1440 phút` tại `/settings`).
- **Tách I/O mạng khỏi Transaction DB:** `ClubFacebookServiceImpl.runAutoSyncForClub()` thực hiện gọi Meta Graph API **ngoài transaction**, chỉ mở `TransactionTemplate` ngắn khi lưu DB; dùng tập `inFlightSyncClubs` (`ConcurrentHashMap`) chống chạy chồng khi BCN bấm đồng bộ tay cùng lúc (`409 FACEBOOK_SYNC_IN_PROGRESS`).
- **Cơ chế tự bảo vệ & cảnh báo:** Mỗi lỗi tăng `consecutive_sync_failures`; đạt ngưỡng `3` lần liên tiếp sẽ tự động bỏ qua tránh bị Meta rate-limit, đồng thời gửi thông báo `In-App` chống trùng theo ngày (`FB_TOKEN_ALERT:<clubId>:<date>`) khi gặp `FACEBOOK_TOKEN_EXPIRED` hoặc `FACEBOOK_PERMISSION_MISSING`.
- **Phương án để lại Giai đoạn 2:** Meta Webhooks (`page` feed subscription) đòi hỏi Meta App Review chế độ Live và endpoint công khai xác thực chữ ký `X-Hub-Signature-256` — ghi nhận vào Backlog giai đoạn sau.

### 2.4 Ủy quyền cấp dưới tương thích mô hình 4 tầng tinh gọn (`V41`, `PB-84` & `PB-95`)
- Hạ `permission.view`, `permission.assign`, `permission.revoke`, `role.view` xuống scope `DEPARTMENT`.
- `GrantGuard.requireCanGrant` và lọc phạm vi trên `PermissionServiceImpl` / `RoleServiceImpl` bảo đảm người được ủy quyền **chỉ xem, cấp và thu hồi đúng những quyền chính mình đang nắm giữ trong đúng CLB/Ban phụ trách** (`403 GRANT_EXCEEDS_OWN_PERMISSIONS`).
- Vận hành chuẩn theo góp ý của ĐTN/BĐP (`PB-84`) vẫn là **4 tầng tinh gọn (2–3 tài khoản BCN/đơn vị)**; cơ chế ủy quyền cấp ban là công cụ mở rộng tùy chọn khi CLB có nhu cầu phân quyền chi tiết mà vẫn an toàn tuyệt đối.

---

## 3. Hệ quả & Ràng buộc
- Mọi tính năng gọi HTTP bên ngoài hoặc tác vụ nền mới phải sử dụng `vjuTaskScheduler`, `integrationTaskExecutor` hoặc `mailTaskExecutor`, không tự tạo `ThreadPoolExecutor` rời rạc và không gọi HTTP bên trong `@Transactional` dài.
- Mọi thay đổi schema `system_settings` bắt buộc đồng bộ OpenAPI 3.1 kép (`docs/api/openapi.yaml` ↔ `phase1-openapi.yaml`) và vượt qua `SecurityAndInputBoundsTest` (`@Size` trên mọi `String`).
