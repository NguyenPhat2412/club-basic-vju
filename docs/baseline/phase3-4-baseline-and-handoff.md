# Hồ sơ Nghiệm thu Bảo mật, Truy vết Toàn hệ thống & Bàn giao Cuối kỳ (`PB-49`, `PB-51`)

- **Ngày chốt hồ sơ:** `2026-11-04`
- **Phạm vi bao phủ:** Toàn bộ 4 giai đoạn phát triển (`Phase 1`..`Phase 4` — `104/104 PBI`, `394/394 TC-PB-*`, `67/67 DoD`)
- **Đề xuất nhãn phát hành (chờ PO phê duyệt chính thức theo `PB-51` AC04):** `v1.0.0-phase4-complete`

---

## 1. Chỉ số xác minh kỹ thuật tại thời điểm bàn giao (`PB-47`, `PB-51` AC01)

| Tầng kiểm định | Lệnh xác minh | Kết quả thực tế |
|---|---|---|
| **Backend Unit, Integration, Concurrency & E2E** | `cd backend/springboot && ./mvnw test` | **587 / 587 Pass** (`0 Failures, 0 Errors`, 65 lớp test trên PostgreSQL 16 Testcontainers) |
| **OpenAPI 3.1 & API Catalog Contract** | `python3 -m unittest discover -s docs/api/tests -v` | **16 / 16 Pass** (khớp tuyệt đối **132 HTTP operations** giữa `openapi.yaml`, `catalog.yml` và `ApiPaths.java`) |
| **Frontend Lint, TypeScript, Unit Tests & Production Build** | `pnpm --dir frontend/nextjs run lint && pnpm --dir frontend/nextjs run typecheck && pnpm --dir frontend/nextjs test && pnpm --dir frontend/nextjs run build` | **0 warnings/errors**, **6 / 6 unit tests Pass**, **21 / 21 Next.js routes built** |
| **Database Schema & Migrations** | Flyway `V1`..`V21` trên PostgreSQL 16 | **21 / 21 migrations applied (`success = true`)** |
| **Đo tải tham chiếu (`20` luồng đồng thời)** | `python3 docs/baseline/run_load_benchmark.py` | **600 / 600 HTTP 200 OK** (`0.0%` lỗi, `p95` `11.20 ms`..`240.93 ms`) |

---

## 2. Báo cáo Rà soát Bảo mật, Quyền hạn & Dữ liệu cá nhân (`PB-49` AC01–AC04)

### 2.1 Ma trận kiểm soát phân quyền chéo (`PB-49` AC01)
- **3 phạm vi RBAC chuẩn (`GLOBAL > CLUB > DEPARTMENT`):** Mọi API quản trị và điều hành đều đối chiếu qua `PermissionAuthorizationService` và `@RequirePermission` (được kiểm tra tự động bằng `RequirePermissionUsageTest` trên toàn bộ lớp Service).
- **Cách ly giữa các CLB & Ban:**
  - Quản lý CLB A không xem/sửa được sự kiện, nhiệm vụ, điểm danh, thống kê hay tài liệu của CLB B (`403 PERMISSION_DENIED` / `404 NOT_FOUND`).
  - Trưởng ban (`DEPARTMENT` scope) chỉ được tạo task con / giao task và gửi thông báo cho nhân sự thuộc đúng ban mình phụ trách (`403 PERMISSION_SCOPE_MISMATCH` nếu giao chéo sang ban khác).
- **Cách ly Cộng tác viên (`CTV`) và Quyền sở hữu cá nhân (`Owner`):**
  - Sinh viên đăng ký sự kiện diện `CTV` và nhận `eventRole` **không** được tạo `Membership` và **không** phát sinh bất kỳ bản ghi nào trong `user_roles` / `user_permissions`.
  - `CTV` của Sự kiện 1 chỉ xem và cập nhật tiến độ task sự kiện mà chính mình là `assignee`; cố tình truyền `taskId` của Sự kiện 2 nhận `403 PERMISSION_DENIED` (`PhaseThreeAcceptanceTest`).
  - Lịch sử sự kiện & điểm danh cá nhân (`GET /api/v1/users/me/event-registrations`), hộp thư thông báo (`/api/v1/users/me/notifications`), và đơn ứng tuyển cá nhân đều lấy `actor.id()` trực tiếp từ phiên máy chủ, không bao giờ tin `userId` từ client.

### 2.2 Quản lý thông tin mật, phiên xác thực & đầu vào (`PB-49` AC02–AC03)
- **Không lộ thông tin mật:** Các tệp `.env.local.example` và `deploy/.env.production.example` chỉ chứa giá trị giữ chỗ; `GET /api/v1/system-settings` và `GET /api/v1/statistics/system` chỉ trả chỉ số nghiệp vụ, không chứa mật khẩu, khóa ký hay chuỗi kết nối (`ProdProfileStartupTest`, `PhaseFourAcceptanceTest`).
- **Phiên & CSRF:** Sử dụng `HttpOnly` cookie `CLUB_SESSION` lưu trong PostgreSQL (`spring_session` V12) kết hợp SPA CSRF header `X-XSRF-TOKEN`; khi tài khoản chuyển sang `LOCKED` hoặc `INACTIVE` (hoặc bị ẩn danh), `userSessionService.endAllSessions` và `AccountStatusFilter` thu hồi phiên tức thời.
- **Bảo vệ toàn vẹn lịch sử & ẩn danh PII (`PB-38`, `PB-59`):** Khi xóa tài khoản đã phát sinh lịch sử nghiệp vụ/audit, hệ thống tự động tẩy trắng PII (`deleted+<uuid>@anonymized.vju.local`, xóa MSSV/SĐT/avatar/Google subject, khóa mật khẩu ngẫu nhiên, `status = INACTIVE`, `anonymized_at = now()`) và giữ nguyên 100% khóa ngoại lịch sử CLB (`ON DELETE RESTRICT` trong `V21`).

### 2.3 Lỗi phát hiện trong quá trình rà soát & Giới hạn đánh giá trung thực (`PB-49` AC04)
- **Các hạng mục đã phát hiện, khắc phục và kiểm thử lại (`Retest = Pass`):**
  1. `BUG-P2-07` (*Đã đóng*): Tập trung toàn bộ hằng số đường dẫn API vào `common/ApiPaths.java`, đồng bộ 21 cặp `service` + `service/impl`, tắt đăng ký trùng Servlet filter cho `RateLimitFilter` và `AccountStatusFilter`.
  2. `GAP-P3-01` (*Đã đóng*): Mở cổng Sự kiện & CTV (`/events`), hỗ trợ giao task sự kiện cho CTV đã đăng ký, phân rã subtask 1 cấp (`parent_task_id`) và giữ nguyên trạng thái `IN_PROGRESS` khi quá hạn.
  3. `GAP-P4-01` (*Đã đóng*): Bổ sung sửa điểm danh sau `COMPLETED` kèm `editReason` + `@Version` + `attendanceEditWindowHours`, tra cứu điểm danh & lịch sử sự kiện cá nhân, gửi thông báo theo event/task, thống kê Admin/CLB và ẩn danh PII an toàn (đồng thời loại bỏ câu lệnh dọn bảng `refresh_tokens` cũ đã ngừng dùng từ `V12`).
- **Tuyên bố giới hạn bảo mật trung thực (`PB-49` AC04):** Báo cáo này xác nhận các kiểm soát xác thực, phân quyền 3-scope, CSRF, rate-limit ứng dụng và ẩn danh PII đã vượt qua toàn bộ 587 bài kiểm thử tự động; **tuy nhiên hệ thống không tuyên bố "an toàn tuyệt đối 100%"** trước các rủi ro tầng hạ tầng ngoài ứng dụng (như tấn công DDoS tầng mạng L3/L4, lộ khóa máy chủ VPS vật lý, hoặc kiểm thử xâm nhập độc lập bên thứ ba chưa thực hiện). Khi vận hành thực tế cần kết hợp tường lửa đám mây/WAF, TLS chứng chỉ hợp lệ và sao lưu định kỳ theo [`docs/deploy/README.md`](../deploy/README.md).

---

## 3. Ma trận Truy vết Tổng hợp 4 Phase (`PB-51` AC01)

| Nhóm chức năng & PBI | Migration / Bảng DB | Backend Service / API chính | Frontend Màn hình | Kiểm thử tự động đối chứng |
|---|---|---|---|---|
| **Auth, Google OAuth, Session & CSRF** (`PB-01`..`PB-03`) | `V1`, `V12`, `V13`, `V15` (`users`, `spring_session`) | `AuthServiceImpl` (`/api/v1/auth/*`) | `/login`, `/register`, `/change-password` | `AuthApiTest`, `GoogleSignInApiTest`, `sprint2.test.ts` |
| **Tài khoản, Ẩn danh PII & Cấu hình hệ thống** (`PB-04`, `PB-38`, `PB-59`) | `V11`, `V17`..`V19`, `V21` (`users.anonymized_at`, `system_settings`) | `UserServiceImpl`, `UserAccountPurgeSupport`, `SystemSettingsServiceImpl` | `/users`, `/settings`, `/profile` | `UserApiTest`, `AdminAccountApiTest`, `PhaseFourAcceptanceTest` |
| **CLB, Ban, Vòng đời Membership & Chuyển ban** (`PB-05`..`PB-13`, `PB-35.1`) | `V1`, `V4`, `V16`, `V18`, `V20` (`clubs`, `departments`, `memberships`) | `ClubServiceImpl`, `DepartmentServiceImpl`, `MembershipServiceImpl` | `/clubs`, `/memberships`, `/management` | `ClubApiTest`, `MembershipApiTest`, `DepartmentMemberApiTest`, `PhaseTwoAcceptanceTest` |
| **RBAC 3-Scope, Chức danh & Nhật ký Audit** (`PB-14`..`PB-17`, `PB-37`) | `V1`, `V5`, `V6`, `V18`, `V20` (`roles`, `effective_user_permissions`, `audit_logs`) | `RoleServiceImpl`, `PermissionServiceImpl`, `AuditServiceImpl` | `/roles`, `/audit-logs`, `PositionsTab.tsx` | `PermissionApiTest`, `RoleApiTest`, `AuditLogApiTest`, `SprintOneAcceptanceTest` |
| **Đơn ứng tuyển, Form động & Xét duyệt** (`PB-18`..`PB-20`) | `V7`, `V17`, `V20` (`club_applications`, `club_application_forms`) | `ClubApplicationServiceImpl`, `ApplicationFormServiceImpl` | `/clubs/[clubId]`, `/applications`, `ApplicationsTab.tsx` | `ClubApplicationApiTest`, `ApplicationFormApiTest`, `PhaseTwoAcceptanceTest` |
| **Sự kiện, Cổng CTV & Vai trò nhân sự sự kiện** (`PB-21.1`..`PB-25.2`, `PB-57`) | `V14`, `V21` (`events.completed_at`, `event_registrations.event_role`) | `EventServiceImpl` (`/public/events`, `/clubs/{id}/events`, `/events/{id}/registrations/*`) | `/events`, `EventsTab.tsx` | `PhaseThreeOperationsApiTest`, `PhaseThreeAcceptanceTest`, `phase34.test.ts` |
| **Nhiệm vụ, Subtask, Giao CTV & Cờ Quá hạn** (`PB-26.1`..`PB-29`, `PB-58`) | `V14`, `V21` (`tasks.parent_task_id`, `overdue_notified_at`) | `TaskServiceImpl` (`/clubs/{id}/tasks`, `/clubs/{id}/tasks/summary`, `/tasks/{id}/*`) | `/schedule`, `TasksTab.tsx` | `PhaseThreeOperationsApiTest`, `PhaseThreeAcceptanceTest`, `FlowHardeningApiTest` |
| **Điểm danh, Sửa sau COMPLETED & Lịch sử cá nhân** (`PB-30`..`PB-32`, `PB-35.2`, `PB-60`) | `V14`, `V21` (`event_attendances.edit_reason`, `version`) | `EventServiceImpl#recordAttendance`, `listMyRegistrations` | `/events` (Tab 2), `EventsTab.tsx` | `PhaseFourAcceptanceTest`, `PhaseThreeOperationsApiTest` |
| **Thông báo In-App CLB / Ban / Sự kiện / Task** (`PB-33.1`..`PB-33.4`) | `V8`, `V20` (`notifications`, `uq_notifications_user_event_key`) | `NotificationServiceImpl` (`/clubs/{id}/notifications`, `/events/{id}/notifications`, `/tasks/{id}/notifications`) | `/notifications`, `EventsTab.tsx`, `TasksTab.tsx` | `NotificationApiTest`, `PhaseFourAcceptanceTest` |
| **Thống kê Hệ thống & Thống kê CLB** (`PB-36.1`, `PB-36.2`, `PB-61`) | `V1`..`V21` (truy vấn tổng hợp khử trùng lặp) | `StatisticsServiceImpl` (`/statistics/system`, `/clubs/{id}/statistics`) | `/dashboard`, `OverviewTab.tsx` | `PhaseFourAcceptanceTest`, `phase34.test.ts` |
| **Tài liệu CLB, Kênh Chat & Trợ lý AI** | `V10`, `V14` (`documents`, `chat_channels`, `ai_summaries`) | `DocumentServiceImpl`, `ChatServiceImpl` | `/documents`, `DocumentsTab.tsx`, `ChatTab.tsx` | `DocumentApiTest`, `PhaseThreeOperationsApiTest` |

---

## 4. Hướng dẫn Sử dụng & Kịch bản Trình diễn Hệ thống (`PB-51` AC02)

> **Quy tắc bảo mật tài liệu (`PB-51` AC02):** Hướng dẫn dưới đây **không lưu mật khẩu thật**. Khi chạy môi trường phát triển cục bộ (`local` profile), mật khẩu của tài khoản quản trị khởi tạo và các tài khoản demo được đọc từ tệp `backend/springboot/.env.local` (xem khóa `BOOTSTRAP_ADMIN_PASSWORD` và `DEMO_USER_PASSWORD` trên máy cục bộ của người trình bày).

### 4.1 Địa chỉ truy cập trực tiếp
- **Giao diện người dùng (Next.js 16):** http://localhost:3000
- **Máy chủ REST API (Spring Boot 4):** http://localhost:8080
- **Danh mục API sống:** http://localhost:8080/api/v1/api-catalog

### 4.2 Kịch bản trình diễn 5 vai trò (5–7 phút)
1. **Vai trò 1 — Quản trị hệ thống (`BOOTSTRAP_ADMIN_EMAIL` trong `.env.local`):**
   - Mở **Tổng quan (`/dashboard`)**: trình bày thẻ thống kê toàn hệ thống (`PB-36.1`: tổng tài khoản `ACTIVE/LOCKED/INACTIVE/Đã ẩn danh`, số CLB hoạt động, bảng cơ cấu người dùng duy nhất theo từng nhóm quyền).
   - Mở **Cài đặt hệ thống (`/settings`)**: trình bày ngưỡng `Thời hạn cho phép sửa điểm danh sau khi hoàn tất sự kiện (giờ)` (`PB-31` / `PB-60`, mặc định `48h`).
   - Mở **Quản lý người dùng (`/users`)**: minh họa cơ chế xóa tài khoản tự động ẩn danh PII khi tài khoản đã có lịch sử CLB (`PB-38`).
2. **Vai trò 2 — Chủ nhiệm CLB Học thuật VJU (`demo.a@vju.local`):**
   - Mở **Quản lý CLB (`/management`) -> Tab `Tổng quan CLB`**: trình bày thống kê CLB theo khoảng thời gian (`PB-36.2`: tách bạch người tham gia duy nhất, đăng ký hợp lệ, đăng ký đã hủy và số lượt có mặt `PRESENT + LATE`).
   - Chuyển sang **Tab `Sự kiện`**: mở sự kiện *"Ngày hội Giao lưu Học thuật & Văn hóa Việt - Nhật 2026"*, xem danh sách Thành viên & CTV đã đăng ký, cập nhật `Vai trò trong sự kiện` (`PB-25.2`), gửi **Thông báo sự kiện** tới cả Member + CTV (`PB-33.3`), và xem sự kiện đã `COMPLETED` kèm ô nhập **Lý do điều chỉnh điểm danh** (`PB-31`).
   - Chuyển sang **Tab `Nhiệm vụ`**: trình bày thanh bộ đếm tổng hợp khớp bộ lọc (`PB-29`), nhiệm vụ quá hạn vẫn giữ nhãn `Đang làm (IN_PROGRESS)` kèm huy hiệu cảnh báo **Quá hạn**, giao việc sự kiện cho CTV (`PB-27.1`), mở lại task `DONE` và gửi nhắc việc (`PB-33.4`).
3. **Vai trò 3 — Trưởng ban Truyền thông (`demo.b@vju.local`):**
   - Mở **Quản lý CLB (`/management`) -> Tab `Nhiệm vụ`**: chọn task cha *"Triển khai chiến dịch truyền thông..."* và tạo **Task con (Subtask)** 1 cấp cho thành viên trong Ban Truyền thông (`PB-26.2`).
4. **Vai trò 4 — Thành viên CLB (`demo.c@vju.local`):**
   - Mở **Lịch & Công việc (`/schedule`)**: lọc công việc theo trạng thái / **Đang quá hạn**, cập nhật thanh tiến độ `%`, ghi chú & link báo cáo (`PB-28.1`, `PB-28.2`).
5. **Vai trò 5 — Sinh viên ngoài CLB / Cộng tác viên (`ctv.demo@gmail.com`):**
   - Mở **Sự kiện & CTV (`/events`)**:
     - Tab **Khám phá sự kiện**: lọc sự kiện **Mở cho CTV**, xem hạn đăng ký và bấm đăng ký/hủy đăng ký trước hạn (`PB-21.5`, `PB-24.1`, `PB-24.2`).
     - Tab **Sự kiện & Điểm danh của tôi**: xem vai trò `CTV`, `Vai trò trong sự kiện`, trạng thái điểm danh (`Đi muộn` kèm lý do điều chỉnh của BTC) và cột `Tính tham gia: Đã tính có mặt` (`PB-32`, `PB-35.2`).
   - Mở **Lịch & Công việc (`/schedule`)** và **Thông báo (`/notifications`)**: xem nhiệm vụ sự kiện được giao cho CTV và thông báo tổng duyệt từ Ban tổ chức.

---

## 5. Chỉ mục Phạm vi Đã xác minh vs Ngoài phạm vi Release (`PB-51` AC03–AC04)

- **Đã xác minh 100% (`Hoàn thành`):** Toàn bộ `104/104 PBI` (`Phase 1`..`Phase 4`), `394/394 TC-PB-*`, `67/67 DoD`, `21` bản migration Flyway, `132` HTTP operations trong OpenAPI 3.1, giao diện tiếng Việt không dùng dữ liệu giả lập (zero mock data).
- **Ngoài phạm vi bản phát hành hiện tại (Out of Scope theo quyết định PO `PB-57`..`PB-61`):**
  - Không phát hành vé QR / thanh toán lệ phí sự kiện hoặc quy trình duyệt từng lượt đăng ký sự kiện.
  - Không gửi thông báo qua cổng Email SMTP / SMS / Mobile Push bên ngoài (tập trung 100% vào kênh In-App khử trùng lặp chuẩn).
  - Không tự động cộng điểm rèn luyện cấp Trường hay xuất báo cáo tài chính/xếp hạng thi đua ngoài thống kê vận hành CLB.
- **Trạng thái phát hành (`PB-51` AC04):** Đề xuất tag `v1.0.0-phase4-complete`; giữ ở trạng thái đề xuất bàn giao cho tới khi Product Owner ký biên bản cho phép phát hành chính thức lên môi trường vận hành.
