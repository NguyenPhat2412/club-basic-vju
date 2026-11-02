# Hồ sơ Nghiệm thu & Baseline Giai đoạn 2 (Sprint 2 Baseline)

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật (VJU)
- **Phạm vi bàn giao:** Toàn bộ 20 PBI Sprint 2, 11 tiêu chí `DoD-P2-01..DoD-P2-11`, và 77 kịch bản kiểm thử `TC-PB-*` (`R159..R235`), đồng thời hoàn tất chuẩn hóa cấu trúc thư mục phẳng (layered architecture) cho Backend Spring Boot.
- **Ngày chốt Baseline:** `2026-11-01`

---

## 1. Kiến trúc 3 tầng nghiêm ngặt (Zero Mock Data)

1. **Tầng Cơ sở dữ liệu (PostgreSQL 16 + Flyway `V1..V20`):**
   - Toàn bộ ràng buộc duy nhất, khóa ngoại ghép cùng CLB (`department_members`), trạng thái đơn/thành viên, chống gửi trùng thông báo (`uq_notifications_user_event_key`), và view phân quyền hiệu lực (`effective_user_permissions`) được thực thi trực tiếp dưới PostgreSQL.
2. **Tầng Backend (`backend/springboot` — Java 21, Spring Boot 4.1.1):**
   - Cấu trúc gói phẳng chuẩn hóa dưới `com.vju.club.{annotation,bootstrap,common,config,controller,dto,entity,enums,error,exception,mapper,repository,rest,security,service,specification,storage}`.
   - Xác thực phiên qua HttpOnly cookie `CLUB_SESSION` kết hợp bảo vệ CSRF (`XSRF-TOKEN` / `X-XSRF-TOKEN`) và kiểm tra trạng thái tài khoản tức thời (`ACTIVE`, `LOCKED -> 403 ACCOUNT_LOCKED`, `INACTIVE -> 403 ACCOUNT_INACTIVE`).
   - 123 API endpoints khớp tuyệt đối giữa `@RestController`, `docs/api/openapi.yaml` (OpenAPI 3.1) và `docs/api/catalog.yml`.
3. **Tầng Frontend (`frontend/nextjs` — Next.js 16.3.5, React 19, TypeScript 5, TanStack Query 5):**
   - Không chứa bất kỳ dữ liệu giả lập (mock/hardcoded data) nào; danh mục lĩnh vực CLB trên `/clubs` truy vấn trực tiếp từ `GET /api/v1/public/clubs/categories`.
   - Đầy đủ các màn hình Sprint 2: `/clubs`, `/applications`, `/memberships`, `/notifications`, `/management` (tab Thành viên, Các ban, Tuyển thành viên).

---

## 2. Danh mục Migration Flyway liên quan đến Baseline Giai đoạn 2

| Phiên bản | Tệp Migration | Nội dung chính |
|---|---|---|
| `V1`..`V6` | `V1`..`V6__*.sql` | Nền tảng tài khoản, CLB, ban, thành viên, lịch sử membership, RBAC theo scope, `audit_logs` bất biến |
| `V7` | `V7__club_applications.sql` | Bảng `club_applications`, partial unique index `uq_club_applications_pending`, 7 quyền `application.*` |
| `V8` | `V8__notifications.sql` | Bảng `notifications`, index `(user_id, created_at desc)` |
| `V17` | `V17__application_forms_and_files.sql` | Biểu mẫu tuyển thành viên động (`club_application_forms`), đính kèm tệp (`club_application_files`), nguyện vọng ban |
| `V18` | `V18__sprint1_dod_account_locked_and_position_rules.sql` | Trạng thái `LOCKED`, giới hạn số lượng người giữ chức danh (`max_holders`) |
| `V19` | `V19__system_settings.sql` | Cấu hình hệ thống `max_pending_applications`, `reapply_cooldown_days`, `max_active_clubs` |
| `V20` | `V20__sprint2_membership_application_notification_hardening.sql` | Tách `club_applications.internal_note`, bổ sung `notifications.reference_type` & `event_key` + `uq_notifications_user_event_key`, cập nhật view `effective_user_permissions` đình chỉ quyền CLB/ban khi membership `SUSPENDED` |

---

## 3. Kết quả Kiểm thử & Lệnh Xác minh Độc lập

Mọi kết quả dưới đây được chạy trực tiếp trên PostgreSQL 16 thật (Testcontainers), trình kiểm tra hợp đồng OpenAPI 3.1 và trình biên dịch Next.js 16:

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả xác minh |
|---|---|---|
| **Backend Unit + Migration + Concurrency + Integration Tests** | `cd backend/springboot && ./mvnw test` | **574/574 tests Pass** (`Failures: 0, Errors: 0, Skipped: 0`) |
| **OpenAPI 3.1 & API Catalog Static Contract Tests** | `python3 -m unittest discover -s docs/api/tests -v` | **15/15 tests Pass** (`123/123` endpoints khớp tuyệt đối) |
| **Spring Runtime Contract & Catalog Tests** | `cd backend/springboot && ./mvnw test -Dtest=ContractDocumentsTest,ApiCatalogControllerTest` | **5/5 tests Pass** |
| **Frontend ESLint** | `cd frontend/nextjs && pnpm run lint` | **Exit code `0`** (0 lỗi, 0 cảnh báo) |
| **Frontend TypeScript Strict Typecheck** | `cd frontend/nextjs && pnpm run typecheck` | **Exit code `0`** (`tsc --noEmit` sạch lỗi) |
| **Frontend Automated Unit Tests** | `cd frontend/nextjs && pnpm test` | **3/3 test suites Pass** (error mapping tiếng Việt, RBAC scope helpers, API client + CSRF retry) |
| **Frontend Production Build** | `cd frontend/nextjs && pnpm run build` | **Exit code `0`** (20/20 route build thành công) |

---

## 4. Hướng dẫn Khởi chạy Nhanh để Nghiệm thu (Runbook)

```bash
# 1. Khởi động PostgreSQL 16
docker compose up -d postgres

# 2. Khởi chạy Backend Spring Boot (tự động chạy Flyway V1..V20)
cp -n backend/springboot/.env.local.example backend/springboot/.env.local
cd backend/springboot
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Khởi chạy Frontend Next.js (mở terminal mới từ thư mục gốc)
cd frontend/nextjs
pnpm install --frozen-lockfile
pnpm dev
```

- **Giao diện người dùng:** `http://localhost:3000`
- **Swagger UI:** `http://localhost:8080/swagger-ui.html`
- **API Catalog:** `http://localhost:8080/api/v1/api-catalog`
- **Tài liệu liên quan:**
  - Quyết định nghiệp vụ PO: [phase2-po-decisions.md](phase2-po-decisions.md)
  - Ma trận truy vết PBI – Test Case – Code: [phase2-traceability-matrix.md](phase2-traceability-matrix.md)
  - Bảng theo dõi Sprint Backlog, Kiểm thử & E2E, Nhật ký lỗi và DoD: [Product Backlog and Dod - Nhóm 3.xlsx](../Product%20Backlog%20and%20Dod%20-%20Nh%C3%B3m%203.xlsx)

