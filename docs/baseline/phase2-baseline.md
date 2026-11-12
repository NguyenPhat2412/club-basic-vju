# Hồ sơ Nghiệm thu & Baseline Giai đoạn 2 (Sprint 2 Baseline)

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật (VJU)
- **Phạm vi bàn giao:** Toàn bộ 20 PBI Sprint 2, 11 tiêu chí `DoD-P2-01..DoD-P2-11`, và 77 kịch bản kiểm thử `TC-PB-*` (`R159..R235`), đồng thời hoàn tất chuẩn hóa cấu trúc thư mục phẳng (layered architecture) cho Backend Spring Boot.
- **Ngày chốt Baseline:** `2026-11-01`

---

## 1. Kiến trúc 3 tầng nghiêm ngặt (Zero Mock Data)

1. **Tầng Cơ sở dữ liệu (PostgreSQL 16 + Flyway `V1..V24`):**
   - Toàn bộ ràng buộc duy nhất, khóa ngoại ghép cùng CLB (`department_members`), trạng thái đơn/thành viên, chống gửi trùng thông báo (`uq_notifications_user_event_key`), view phân quyền hiệu lực (`effective_user_permissions`), lưu trữ media CLB (`V22`) và bộ nhớ đệm dịch đa ngôn ngữ AI (`V23`) được thực thi trực tiếp dưới PostgreSQL.
2. **Tầng Backend (`backend/springboot` — Java 21, Spring Boot 4.1.1):**
   - Cấu trúc gói phẳng chuẩn hóa dưới `com.vju.club.{annotation,bootstrap,common,config,controller,dto,entity,enums,error,exception,mapper,repository,rest,security,service,specification,storage}`.
   - Xác thực phiên qua HttpOnly cookie `CLUB_SESSION` kết hợp bảo vệ CSRF (`XSRF-TOKEN` / `X-XSRF-TOKEN`) và kiểm tra trạng thái tài khoản tức thời (`ACTIVE`, `LOCKED -> 403 ACCOUNT_LOCKED`, `INACTIVE -> 403 ACCOUNT_INACTIVE`).
   - 143 API endpoints (123 ở thời điểm chốt Sprint 2 + 20 mở rộng ở Giai đoạn 3–4, Club Media `V22`, I18n `V23` và Dashboard Review Summary) khớp tuyệt đối giữa `@RestController`, `docs/api/openapi.yaml` (OpenAPI 3.1) và `docs/api/catalog.yml`.
3. **Tầng Frontend (`frontend` — Next.js 16.3.5, React 19, TypeScript 5, TanStack Query 5):**
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
| `V22` | `V22__club_media_storage.sql` | Lưu trữ và stream trực tiếp logo & ảnh bìa (cover) của 12 CLB VJU (`logo_storage_key`, `cover_storage_key`, content-type, byte size) |
| `V23` | `V23__i18n_translations_cache.sql` | Bảng `i18n_translations` lưu bộ nhớ đệm dịch thuật đa ngôn ngữ AI (`vi`, `en`, `ja`) |

---

## 3. Kết quả Kiểm thử & Lệnh Xác minh Độc lập

Mọi kết quả dưới đây được chạy trực tiếp trên PostgreSQL 16 thật (Testcontainers), trình kiểm tra hợp đồng OpenAPI 3.1 và trình biên dịch Next.js 16:

| Hạng mục kiểm tra | Lệnh thực thi | Kết quả xác minh |
|---|---|---|
| **Backend Unit + Migration + Concurrency + Integration Tests** | `cd backend/springboot && ./mvnw test` | **574/574 tests Pass** (`Failures: 0, Errors: 0, Skipped: 0`; mở rộng lên **587+ tests Pass** cùng `V21..V23`) |
| **OpenAPI 3.1 & API Catalog Static Contract Tests** | `python3 -m unittest discover -s docs/api/tests -v` | **16/16 tests Pass** (`143/143` HTTP operations khớp tuyệt đối) |
| **Spring Runtime Contract & Catalog Tests** | `cd backend/springboot && ./mvnw test -Dtest=ContractDocumentsTest,ApiCatalogControllerTest` | **5/5 tests Pass** |
| **Frontend ESLint** | `cd frontend && pnpm run lint` | **Exit code `0`** (0 lỗi, 0 cảnh báo) |
| **Frontend TypeScript Strict Typecheck** | `cd frontend && pnpm run typecheck` | **Exit code `0`** (`tsc --noEmit` sạch lỗi) |
| **Frontend Automated Unit Tests** | `cd frontend && pnpm test` | **Pass 100%** (error mapping tiếng Việt, RBAC scope helpers, API client + CSRF retry) |
| **Frontend Production Build** | `cd frontend && pnpm run build` | **Exit code `0`** (toàn bộ route build thành công) |

---

## 4. Hướng dẫn Khởi chạy Nhanh để Nghiệm thu (Runbook)

```bash
# 1. Khởi động PostgreSQL 16
docker compose up -d postgres

# 2. Khởi chạy Backend Spring Boot (tự động chạy Flyway V1..V24)
cp -n backend/springboot/.env.local.example backend/springboot/.env.local
cd backend/springboot
./mvnw spring-boot:run -Dspring-boot.run.profiles=local

# 3. Khởi chạy Frontend Next.js (mở terminal mới từ thư mục gốc)
cd frontend
pnpm install --frozen-lockfile
pnpm dev
```

- **Giao diện người dùng:** `http://localhost:3000` (Production: `https://vju-club.all1.vn`)
- **Swagger UI:** `http://localhost:8080/swagger-ui.html` (Production: `https://api.vju-club.all1.vn/swagger-ui.html`)
- **API Catalog:** `http://localhost:8080/api/v1/api-catalog`
- **Tài liệu liên quan:**
  - Quyết định nghiệp vụ PO: [phase2-po-decisions.md](phase2-po-decisions.md)
  - Ma trận truy vết PBI – Test Case – Code: [phase2-traceability-matrix.md](phase2-traceability-matrix.md)
  - Bảng theo dõi Sprint Backlog, Kiểm thử & E2E, Nhật ký lỗi và DoD (Google Drive Sprint 2): [Product Backlog.xlsx](https://drive.google.com/file/d/1x-75h2bN7mTVHJgy8NYMwT29ZrHh0OTb/view)

