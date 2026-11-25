# Kế hoạch triển khai đa Agent — VJU ClubHub (Đợt hoàn thiện Production & Vận hành)

- **Ngày lập**: 2026-11-25
- **Baseline commit**: `43182a6` (trên nhánh `main`, Flyway hiện tại: `V39__anti_inflation_limits_and_quotas.sql`)
- **Mục tiêu**: Đóng gói toàn bộ các hạng mục còn lại sau Sprint 3 / V39 thành **6 luồng Agent độc lập** (Wave 1: 5 Agent chạy song song không xung đột file; Wave 2: 1 Agent tổng hợp OpenAPI, tài liệu kỹ thuật & kiểm thử toàn diện) để dễ dàng triển khai trên máy khác.

---

## Quy tắc phối hợp chung (Bắt buộc mọi Agent tuân thủ)

1. **Phân tách quyền sở hữu tệp (Disjoint File Ownership)**:
   - Trước khi chạy Wave 1, **Coordinator** thêm trước 2 hằng số dùng chung để tránh đụng file:
     - `backend/springboot/src/main/java/com/vju/club/common/ApiPaths.java`:
       - `public static final String CLUB_USAGE = "/clubs/{clubId}/usage";`
       - `public static final String REPORTS_TRAINING_POINTS = "/reports/training-points";`
     - `frontend/src/lib/api/query-keys.ts`:
       - `clubUsage: key("club-usage"),`
       - `trainingPointsReport: key("training-points-report"),`
   - **Không chạy `./mvnw test` song song** giữa các Agent Wave 1 (tránh tranh chấp thư mục `backend/springboot/target/`); để Wave 2 / Coordinator chạy tổng hợp Maven & Next.js build một lần sau khi Wave 1 xong.
2. **Guardrails dự án**:
   - Mọi file trong `frontend/src/{components,hooks,api,forms,lib,utils}` và các service chính (`DocumentServiceImpl.java`, `ChatServiceImpl.java`) phải **nhỏ hơn 400 dòng**.
   - Bảng màu giao diện nghiêm ngặt **60/30/10** (không dùng các lớp Tailwind ngoài bảng màu như `blue`, `green`, `emerald`, `lime`, `purple`, `sky`, `teal`, `indigo`, `violet`, `fuchsia`, `pink`, `cyan`, `orange`; không hardcode mã màu hex).
   - Không gắn nhãn nội bộ `(PB-XX)` hay tên thương hiệu bên thứ 3 (như `"Telegram"`) ra giao diện người dùng.
   - Không hardcode đường dẫn API trong `@GetMapping`/`@PostMapping` — luôn dùng hằng số trong `ApiPaths.java`.
   - Luôn đồng bộ `docs/api/openapi.yaml` ↔ `backend/springboot/src/main/resources/api/phase1-openapi.yaml` và `docs/api/catalog.yml` ↔ `backend/springboot/src/main/resources/api/catalog.yml`.
   - Không tạo nhánh `feat/*` nếu làm trên `main`; không đẩy thẳng lên Production nếu chưa kiểm thử Staging.

---

## Wave 1 — 5 Agent chạy song song

### Agent 1 — Deploy & Legal Pages Engineer (P0)

**Mục tiêu**: Khóa các biến môi trường Production còn thiếu (Facebook, QR, Rate Limit) và bổ sung 2 trang pháp lý công khai phục vụ Google Sign-In & Meta App Live.

**Danh sách file sở hữu độc quyền**:
- `deploy/compose.prod.yml`
- `deploy/.env.production.example`
- `frontend/src/app/privacy/page.tsx` *(tạo mới)*
- `frontend/src/app/data-deletion/page.tsx` *(tạo mới)*
- `frontend/src/components/home/HomeOnboardingFooter.tsx`
- `frontend/tests/legal-and-deploy-config.test.ts` *(tạo mới)*

**Công việc chi tiết**:
1. Cập nhật mục `environment` của service `backend` trong `deploy/compose.prod.yml` và mẫu `deploy/.env.production.example`:
   - `FACEBOOK_APP_ID: ${FACEBOOK_APP_ID:-}`
   - `FACEBOOK_APP_SECRET: ${FACEBOOK_APP_SECRET:-}`
   - `FACEBOOK_GRAPH_VERSION: ${FACEBOOK_GRAPH_VERSION:-v22.0}`
   - `FACEBOOK_TOKEN_ENCRYPTION_KEY: ${FACEBOOK_TOKEN_ENCRYPTION_KEY:-}`
   - `FACEBOOK_OAUTH_REDIRECT_URI: https://${API_HOST}/api/v1/integrations/facebook/oauth/callback`
   - `FRONTEND_BASE_URL: https://${FRONTEND_HOST}`
   - `APP_QR_SECRET: ${APP_QR_SECRET:-}`
   - `RATE_LIMIT_MAX_REQUESTS: ${RATE_LIMIT_MAX_REQUESTS:-15}`
   - `RATE_LIMIT_WRITE_MAX_REQUESTS: ${RATE_LIMIT_WRITE_MAX_REQUESTS:-60}`
   - `RATE_LIMIT_CHAT_UPLOAD_MAX_REQUESTS: ${RATE_LIMIT_CHAT_UPLOAD_MAX_REQUESTS:-15}`
2. Tạo trang `/privacy` (**Chính sách bảo mật — VJU ClubHub**): nêu rõ phạm vi dữ liệu thu thập (`@st.vju.ac.vn`, mã sinh viên, thành viên CLB, điểm danh sự kiện, bài viết/chỉ số Fanpage công khai), mã hoá token AES-256-GCM, cam kết không bán dữ liệu và đầu mối liên hệ Đoàn Thanh niên / Phòng CTSV VJU.
3. Tạo trang `/data-deletion` (**Hướng dẫn xoá dữ liệu người dùng — VJU ClubHub**): hướng dẫn sinh viên yêu cầu ẩn danh/xoá tài khoản và hướng dẫn BCN ngắt kết nối Fanpage Facebook (xoá ngay token mã hoá và cache bài viết).
4. Gắn liên kết tinh gọn đến `/privacy` và `/data-deletion` trong `HomeOnboardingFooter.tsx`.
5. Viết unit test `frontend/tests/legal-and-deploy-config.test.ts` kiểm tra đủ biến môi trường, tồn tại 2 trang pháp lý, `< 400` dòng và không dùng màu ngoài palette.

---

### Agent 2 — Club Usage Quota & Redis Rate Limit Engineer (P0)

**Mục tiêu**: Hiển thị thanh tiến độ dung lượng lưu trữ & hạn mức tài nguyên thực tế cho từng CLB (tận dụng V39), đồng thời hỗ trợ Redis 7 cho `RateLimitService` khi chạy Production.

**Danh sách file sở hữu độc quyền**:
- Backend:
  - `backend/springboot/src/main/java/com/vju/club/dto/response/ClubUsageResponse.java` *(tạo mới)*
  - `backend/springboot/src/main/java/com/vju/club/service/impl/ClubStorageQuotaService.java`
  - `backend/springboot/src/main/java/com/vju/club/controller/ClubController.java`
  - `backend/springboot/src/main/java/com/vju/club/security/RateLimitService.java`
  - `backend/springboot/src/test/java/com/vju/club/integration/AntiInflationLimitsApiTest.java`
  - `backend/springboot/src/test/java/com/vju/club/security/RateLimitServiceTest.java`
- Frontend:
  - `frontend/src/types/club/club.types.ts`
  - `frontend/src/api/club/clubs.api.ts`
  - `frontend/src/components/management/ClubUsageQuotaCard.tsx` *(tạo mới)*
  - `frontend/src/components/management/ClubSettingsTab.tsx`
  - `frontend/src/components/document/DocumentsView.tsx`

**Công việc chi tiết**:
1. Tạo record `ClubUsageResponse` gồm:
   - `UUID clubId`
   - `long storageUsedBytes`, `long documentBytes`, `long chatMediaBytes`, `long storageQuotaBytes`, `int storageQuotaMb`
   - `long channelCount`, `int maxChannelsPerClub`
   - `long departmentCount`, `int maxDepartmentsPerClub`
   - `long activeEventCount`, `int maxActiveEventsPerClub`
   - `long openTaskCount`, `int maxOpenTasksPerClub`
2. Bổ sung `getClubUsage(Actor actor, UUID clubId)` trong `ClubStorageQuotaService` và endpoint `GET ApiPaths.CLUB_USAGE` (`/api/v1/clubs/{clubId}/usage`) trong `ClubController` (kiểm quyền xem CLB / thành viên CLB).
3. Nâng cấp `RateLimitService`:
   - Giữ nguyên constructor `(RateLimitProperties, Clock)` để không gãy unit test cũ.
   - Inject `@Autowired(required = false) StringRedisTemplate redisTemplate` và `@Value("${app.cache.type:simple}") String cacheType`.
   - Khi `cacheType == "redis"` và `redisTemplate != null`: dùng atomic `INCR` + `EXPIRE` trên key `vju:rl:<key>:<windowBucket>`, bọc `try/catch` tự fallback về `ConcurrentHashMap` nếu Redis lỗi.
4. Tạo component `ClubUsageQuotaCard.tsx` hiển thị thanh tiến độ % dung lượng (`used / quota MB`, tách rõ Kho tài liệu vs Media chat, cảnh báo đỏ khi > 80%) và 4 chip hạn mức tài nguyên (Kênh chat, Ban, Sự kiện hoạt động, Công việc mở).
5. Gắn `ClubUsageQuotaCard` vào sub-tab `Hồ sơ CLB` của `ClubSettingsTab.tsx` và gắn thanh dung lượng nhỏ gọn ở `DocumentsView.tsx` khi đang chọn 1 CLB.
6. Bổ sung integration test cho `GET /api/v1/clubs/{clubId}/usage` trong `AntiInflationLimitsApiTest` và unit test fallback Redis trong `RateLimitServiceTest`.

---

### Agent 3 — Facebook Phase 1.5 Engineer (P1)

**Mục tiêu**: Hỗ trợ CLB cá nhân không có Business Verification vẫn nhúng được bảng tin Fanpage công khai ngay lập tức, đồng thời tự động đồng bộ định kỳ cho các CLB đã kết nối Graph API.

**Danh sách file sở hữu độc quyền**:
- Backend:
  - `backend/springboot/src/main/java/com/vju/club/service/impl/ClubFacebookServiceImpl.java`
  - `backend/springboot/src/test/java/com/vju/club/integration/ClubFacebookApiTest.java`
- Frontend:
  - `frontend/src/components/club/ClubPublicFacebookFeed.tsx`
  - `frontend/src/components/club/ClubRecruitmentDrawer.tsx`
  - `frontend/src/components/management/ClubFacebookSettingsCard.tsx`
  - `frontend/tests/facebook-fallback-embed.test.ts` *(tạo mới)*

**Công việc chi tiết**:
1. **Scheduled Auto-Sync** trong `ClubFacebookServiceImpl`:
   - Thêm `@Scheduled(fixedDelayString = "${app.facebook.auto-sync-interval:21600000}")` (mặc định 6 giờ/lần, bật/tắt bằng `${app.facebook.auto-sync-enabled:true}`).
   - Duyệt `pageRepository.findAll()`, bỏ qua trang mới sync trong 30 phút gần nhất, mỗi CLB chạy trong `try/catch` độc lập (lỗi/hết hạn token 1 CLB chỉ cập nhật `lastSyncError`, không ảnh hưởng các CLB khác).
   - Viết method `syncConnectedPagesNow()` để kiểm thử trực tiếp trong `ClubFacebookApiTest`.
2. **Chế độ dự phòng Facebook Page Plugin** trên Frontend:
   - Mở rộng `ClubPublicFacebookFeed` nhận thêm `facebookUrl?: string | null`.
   - Nếu Graph API đã kết nối và có bài viết → hiển thị thẻ bài viết native như hiện tại.
   - Nếu chưa kết nối Graph API nhưng CLB có `facebookUrl` hợp lệ (`https://(www.|m.)?facebook.com/...` hoặc `https://fb.com/...` — kiểm tra chặt bằng helper `buildFacebookPagePluginSrc`, chặn tuyệt đối domain lạ / `javascript:` / `http:`) → hiển thị iframe **Facebook Page Plugin** chính chủ (`loading="lazy"`, `sandbox="allow-scripts allow-same-origin allow-popups"`) kèm nút mở thẳng Fanpage Facebook.
   - Truyền `facebookUrl={club.facebookUrl}` từ `ClubRecruitmentDrawer.tsx`.
   - Thêm ghi chú ngắn trong `ClubFacebookSettingsCard.tsx` hướng dẫn CLB chưa có Token chỉ cần nhập link Fanpage ở tab `Hồ sơ CLB`.
3. Viết unit test `frontend/tests/facebook-fallback-embed.test.ts` cho `buildFacebookPagePluginSrc`.

---

### Agent 4 — Training Points Report Engineer (P1 — theo biên bản 20/11)

**Mục tiêu**: Cung cấp công cụ tra cứu minh chứng tham gia CLB & sự kiện (đã điểm danh `PRESENT`) theo CLB / mã sinh viên / khóa / khoảng thời gian và xuất file CSV UTF-8 BOM + Bản in A4 chuẩn VJU phục vụ tính điểm rèn luyện.

**Danh sách file sở hữu độc quyền**:
- Backend:
  - `backend/springboot/src/main/java/com/vju/club/dto/response/TrainingPointReportResponse.java` *(tạo mới)*
  - `backend/springboot/src/main/java/com/vju/club/service/TrainingPointReportService.java` *(tạo mới)*
  - `backend/springboot/src/main/java/com/vju/club/service/impl/TrainingPointReportServiceImpl.java` *(tạo mới)*
  - `backend/springboot/src/main/java/com/vju/club/controller/TrainingPointReportController.java` *(tạo mới)*
  - `backend/springboot/src/test/java/com/vju/club/integration/TrainingPointReportApiTest.java` *(tạo mới)*
- Frontend:
  - `frontend/src/types/statistics/statistics.types.ts`
  - `frontend/src/api/statistics/statistics.api.ts`
  - `frontend/src/utils/export/training-points-report.ts` *(tạo mới)*
  - `frontend/src/components/event/TrainingPointsReportDialog.tsx` *(tạo mới)*
  - `frontend/src/components/event/EventsPortalView.tsx`
  - `frontend/tests/training-points-report.test.ts` *(tạo mới)*

**Công việc chi tiết**:
1. Tạo endpoint `GET ApiPaths.REPORTS_TRAINING_POINTS` (`/api/v1/reports/training-points`):
   - Query params (tùy chọn): `clubId`, `search` (lọc theo họ tên / email / mã sinh viên / khóa), `from`, `to`.
   - Phân quyền: yêu cầu có quyền `event.view` / `attendance.view` / `club.view` (nếu không có quyền GLOBAL thì tự giới hạn phạm vi trong các CLB mà tài khoản có quyền; sinh viên thường bị từ chối `403 PERMISSION_DENIED`).
   - Trả về `TrainingPointReportResponse`: `generatedAt`, `clubId`, `clubName`, `from`, `to`, `totalStudents`, `totalPresentCheckIns`, `items` (`userId`, `fullName`, `studentCode`, `email`, `activeClubs`, `presentEventCount`, `attendedEventTitles`).
2. Viết helper `training-points-report.ts` tái sử dụng `buildUtf8BomCsv`, `downloadCsv`, `buildPrintableVjuReportHtml`, `openPrintableHtml` từ `frontend/src/utils/export/tabular-export.ts`.
3. Tạo dialog `TrainingPointsReportDialog.tsx` cho phép chọn CLB, nhập từ khóa MSSV/khóa, chọn khoảng ngày, xem trước bảng tổng hợp và bấm **Xuất Excel (CSV)** hoặc **In bản A4**.
4. Gắn nút **"Báo cáo điểm rèn luyện"** trên thanh công cụ `EventsPortalView.tsx` (chỉ hiện với người có quyền quản lý/xem báo cáo).
5. Viết integration test `TrainingPointReportApiTest.java` và unit test `frontend/tests/training-points-report.test.ts`.

---

### Agent 5 — Email Notifications & Mobile UX Engineer (P1)

**Mục tiêu**: Hoàn thiện luồng gửi Email thông báo tự động (thêm Broadcast CLB, nâng cấp giao diện HTML chuẩn VJU, thêm nút bật/tắt nhận email trong `/profile`) và tối ưu responsive di động `390×844`.

**Danh sách file sở hữu độc quyền**:
- Backend:
  - `backend/springboot/src/main/resources/db/migration/V40__user_email_notification_preference.sql` *(tạo mới)*
  - `backend/springboot/src/main/java/com/vju/club/entity/User.java`
  - `backend/springboot/src/main/java/com/vju/club/dto/response/UserResponse.java`
  - `backend/springboot/src/main/java/com/vju/club/dto/request/UpdateMyProfileRequest.java` *(hoặc DTO patch profile tương ứng của `PATCH /api/v1/users/me`)*
  - `backend/springboot/src/main/java/com/vju/club/service/impl/UserServiceImpl.java`
  - `backend/springboot/src/main/java/com/vju/club/service/impl/NotificationEmailListener.java`
  - `backend/springboot/src/main/java/com/vju/club/service/impl/OtpMailTemplateBuilder.java`
  - `backend/springboot/src/test/java/com/vju/club/service/NotificationEmailListenerTest.java` *(tạo mới)*
- Frontend:
  - `frontend/src/types/user/user.types.ts`
  - `frontend/src/components/profile/ProfileView.tsx`
  - `frontend/src/components/settings/SystemSettingsView.tsx`

**Công việc chi tiết**:
1. Flyway `V40__user_email_notification_preference.sql`: thêm cột `email_notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE` vào bảng `users`.
2. Cập nhật `User`, `UserResponse` (giữ tương thích constructor cũ nếu test gọi trực tiếp), DTO sửa hồ sơ cá nhân và `UserServiceImpl` để lưu `emailNotificationsEnabled`.
3. Cập nhật `NotificationEmailListener`:
   - Thêm `"CLUB"` (thông báo Broadcast CLB) vào `EMAIL_WORTHY_TYPES`.
   - Kiểm tra `if (!recipient.isEmailNotificationsEnabled()) return;` trước khi đẩy job gửi mail.
4. Nâng cấp `OtpMailTemplateBuilder.buildNotificationAlertHtml(...)`: bố cục HTML gọn đẹp theo nhận diện VJU ClubHub, có badge phân loại (Tuyển thành viên/Phỏng vấn, Sự kiện, Công việc, Thông báo CLB) và HTML-escape an toàn toàn bộ đầu vào.
5. Thêm nút gạt **"Nhận thông báo qua Email"** trong `ProfileView.tsx` và kiểm tra/chỉnh sửa responsive `390×844` ở `ProfileView.tsx` & `SystemSettingsView.tsx` (không tràn ngang).
6. Viết unit test `NotificationEmailListenerTest.java` kiểm tra Broadcast email, tôn trọng cờ opt-out và HTML escaping.

---

## Wave 2 — Agent 6: Đồng bộ hợp đồng API, Tài liệu & Kiểm thử toàn diện (P2)

*Chạy tuần tự sau khi toàn bộ 5 Agent ở Wave 1 hoàn tất.*

**Danh sách file sở hữu**:
- `docs/api/openapi.yaml` & `backend/springboot/src/main/resources/api/phase1-openapi.yaml`
- `docs/api/catalog.yml` & `backend/springboot/src/main/resources/api/catalog.yml`
- `docs/database/README.md`
- `docs/erd/README.md`
- `docs/api/postman/*` *(nếu cần bổ sung collection)*

**Công việc chi tiết**:
1. **Đồng bộ OpenAPI 3.1 & Catalog**:
   - Khai báo đầy đủ 2 endpoint mới (`GET /api/v1/clubs/{clubId}/usage` và `GET /api/v1/reports/training-points`), schema `ClubUsageResponse`, `TrainingPointReportResponse`, và trường `emailNotificationsEnabled` trong `UserResponse` / `UpdateProfileRequest`.
   - Copy đồng bộ sang `backend/springboot/src/main/resources/api/phase1-openapi.yaml` và `catalog.yml`.
2. **Cập nhật tài liệu CSDL & ERD** khớp đến Flyway `V40`:
   - Ghi nhận các bảng & cột mới từ `V35` → `V40` (Đoàn Thanh niên CLB thứ 13, lịch phỏng vấn, nộp hồ sơ sự kiện & phạm vi nội bộ, `club_facebook_pages`, `club_facebook_posts`, 9 cột quota trong `system_settings`, `users.email_notifications_enabled`).
3. **Bộ lệnh kiểm thử xác minh cuối (tất cả phải 100% Pass)**:
   ```bash
   # 1. OpenAPI Contract (16+ tests)
   python3 -m unittest discover -s docs/api/tests -v

   # 2. Backend full unit + PostgreSQL Testcontainers integration suite
   cd backend/springboot && ./mvnw test

   # 3. Frontend lint, typecheck, unit tests & production build
   cd frontend && pnpm run lint && npx tsc --noEmit && pnpm test && pnpm build
   ```
4. **Kiểm tra live trên Localhost** (cổng `8081` backend + `3000` frontend):
   - Kiểm tra desktop (`1280×800`) và mobile (`390×844`) trên `/home`, `/privacy`, `/data-deletion`, `/management`, `/documents`, `/events`, `/profile`, `/settings` — 0 lỗi console, 0 lỗi mạng, 0 tràn ngang.
5. **Quy trình lên Staging → Production** *(chỉ chạy khi PO xác nhận)*:
   - Merge `main` → `stagging`, kiểm tra CI workflows (`backend.yml`, `frontend.yml`, `deploy-stagging.yml`), smoke test live trên Staging rồi mới triển khai Production.
