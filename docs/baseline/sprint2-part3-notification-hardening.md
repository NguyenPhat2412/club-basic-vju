# Báo cáo Bàn giao Sprint 2 (Phần 3/3) — Thông báo In-App, Toàn vẹn Giao dịch ACID & Kiểm thử Đua đồng thời

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật
- **Giai đoạn:** Sprint 2 (Part 3/3 — Hoàn tất Sprint 2 Backend & Database)
- **Người phụ trách:** **Đoàn Kinh Quốc** (Backend Dev & Database)
- **Mã PR:** PR 3 (`feat/sprint2-notifications-and-hardening`)
- **Đối chiếu Backlog:** `PB-34.1`, `PB-34.2`, `PB-46`, `PB-41`, `PB-43`
- **Tiêu chí DoD liên quan:** `DoD-P2-02`, `DoD-P2-04`, `DoD-P2-05`

---

## 1. Danh mục User Story & Acceptance Criteria thực thi

### 1.1. `PB-34.1` (3 SP) — Nhận & Xem chi tiết thông báo In-App
- **API:**
  - `GET /api/v1/users/me/notifications`: Danh sách thông báo cá nhân (sắp xếp mới nhất trước, phân trang `offset`, `limit`).
  - `GET /api/v1/users/me/notifications/{id}`: Xem chi tiết thông báo với metadata điều hướng (`referenceType`, `referenceId`).
- **Acceptance Criteria:**
  - `TC-PB-34.1-01`: Nhận thông báo in-app ngay khi đơn đăng ký được duyệt (`APPROVED`), liên kết trực tiếp tới đơn ứng tuyển (`referenceType = 'CLUB_APPLICATION'`, `referenceId = applicationId`), trạng thái `read = false`.
  - `TC-PB-34.1-02`: Nhận thông báo in-app khi đơn bị từ chối (`REJECTED`) kèm lời nhắn phản hồi của ban chủ nhiệm.
  - `TC-PB-34.1-03`: Tự động gửi thông báo từ chối tới toàn bộ ứng viên có đơn `PENDING` khi CLB bị chuyển sang trạng thái `INACTIVE`.
  - `TC-PB-34.1-04`: Xem chi tiết thông báo phản ánh chính xác thông tin, bảo mật tuyệt đối cho tài khoản sở hữu.

### 1.2. `PB-34.2` (3 SP) — Quản lý trạng thái đọc & Bảo mật sở hữu thông báo
- **API:**
  - `PATCH /api/v1/users/me/notifications/{id}/read`: Đánh dấu đã đọc một thông báo cụ thể (HTTP 204 No Content).
  - `PATCH /api/v1/users/me/notifications/read-all`: Đánh dấu đã đọc toàn bộ thông báo của người dùng (HTTP 204 No Content).
- **Acceptance Criteria:**
  - `TC-PB-34.2-01`: Đánh dấu đã đọc 1 thông báo chuyển trạng thái `read` từ `false` sang `true`.
  - `TC-PB-34.2-02`: Đánh dấu đã đọc tất cả cập nhật toàn bộ thông báo chưa đọc của user sang `read = true`.
  - `TC-PB-34.2-03`: **Bảo mật phân quyền sở hữu:** Người dùng khác cố tình truy cập (`GET`) hoặc đánh dấu đọc (`PATCH .../read`) thông báo không thuộc quyền sở hữu bị chặn với mã lỗi `404 NOTIFICATION_NOT_FOUND`.
  - `TC-PB-34.2-04`: Thao tác trên ID thông báo không tồn tại trả về `404 NOTIFICATION_NOT_FOUND`.

### 1.3. `PB-46` (5 SP) — Tính toàn vẹn giao dịch ACID & Chống gửi trùng thông báo
- **Cơ chế triển khai:**
  - Partial unique index: `uq_notifications_user_event_key (user_id, event_key) WHERE event_key IS NOT NULL`.
  - Phương thức chèn lũy đạo: `insertIdempotent` chống lặp thông báo khi retry hoặc gửi đồng thời.
- **Acceptance Criteria:**
  - `TC-PB-46-01`: Tạo thông báo nằm trong cùng transaction với hành động nghiệp vụ (duyệt/từ chối đơn).
  - `TC-PB-46-02`: Khi transaction duyệt đơn bị lỗi/rollback (ví dụ lỗi DB trigger khi thêm membership), toàn bộ side-effects (Membership, UserRole, AuditLog, Notification) đều được rollback 100%, không để lại dữ liệu mồ côi.
  - `TC-PB-46-03`: Chống gửi trùng lặp: Nhiều lần dispatch với cùng `event_key` (ví dụ `APPLICATION_REVIEWED:{appId}`) chỉ sinh đúng 1 bản ghi thông báo duy nhất.
  - `TC-PB-46-04`: Thao tác chuyển CLB sang `INACTIVE` lặp lại nhiều lần không sinh trùng thông báo cho ứng viên.

### 1.4. `PB-41` (5 SP) — Database, Migration & Kiểm thử Đua đồng thời Concurrency
- **Cơ chế DB & Migration:**
  - Migration đồng bộ từ `V1` đến `V24` sạch sẽ trên PostgreSQL.
  - Các partial unique constraints cốt lõi:
    - `uq_club_applications_pending (applicant_id, club_id) WHERE status = 'PENDING'`
    - `uq_memberships_user_club_current (user_id, club_id) WHERE status != 'LEFT'`
    - `uq_notifications_user_event_key (user_id, event_key) WHERE event_key IS NOT NULL`
  - View quyền động: `effective_user_permissions` tự động triệt tiêu quyền CLB/ban khi membership bị `SUSPENDED`.
- **Acceptance Criteria:**
  - `TC-PB-41-01`: Đua đồng thời 8 threads nộp đơn `PENDING` -> duy nhất 1 request thành công (201), 7 requests còn lại trả `409 APPLICATION_ALREADY_PENDING`.
  - `TC-PB-41-02`: Đua đồng thời 8 threads duyệt đơn -> duy nhất 1 winner thành công (200), các threads còn lại trả `409 APPLICATION_ALREADY_REVIEWED`.
  - `TC-PB-41-03`: Đua đồng thời giữa hủy đơn (`cancel`) và duyệt đơn (`approve`) -> phân định đúng 1 trạng thái kết thúc (`CANCELLED` hoặc `APPROVED`), chỉ tạo membership nếu duyệt thắng.
  - `TC-PB-41-04`: View `effective_user_permissions` triệt tiêu toàn bộ quyền cấp CLB/ban khi membership chuyển sang `SUSPENDED`, tự động phục hồi khi chuyển lại `ACTIVE`.

### 1.5. `PB-43` (3 SP) — Đồng bộ Hợp đồng OpenAPI 3.1 & Catalog
- **Phạm vi kiểm chứng:**
  - Khớp 100% tất cả các endpoints giữa `docs/api/openapi.yaml`, `catalog.yml` và Spring Boot Controllers.
  - Đảm bảo toàn bộ DTO records, mã lỗi HTTP và cơ chế bảo mật JWT/Cookie hoạt động đồng bộ.
- **Acceptance Criteria:**
  - `TC-PB-43-01`: Vượt qua kiểm thử tĩnh `test_contract.py` (15/15 tests).
  - `TC-PB-43-02`: Vượt qua kiểm thử runtime `ContractDocumentsTest` (3/3 tests).

---

## 2. Kiểm thử Tích hợp Tự động

- **Lớp kiểm thử:** `SprintTwoNotificationAndHardeningAcceptanceTest.java` (`backend/springboot/src/test/java/com/vju/club/integration/SprintTwoNotificationAndHardeningAcceptanceTest.java`)
- **Phương thức kiểm thử đối ứng:**
  1. `testInAppNotificationLifecycleAndDetail()`: Kiểm chứng `PB-34.1` (`TC-PB-34.1-01..04`).
  2. `testNotificationReadManagementAndSecurity()`: Kiểm chứng `PB-34.2` (`TC-PB-34.2-01..04`).
  3. `testTransactionRollbackAndIdempotentDeduplication()`: Kiểm chứng `PB-46` (`TC-PB-46-01..04`).
  4. `testConcurrencyAndConstraintHardening()`: Kiểm chứng `PB-41` (`TC-PB-41-01..04`).
- **Hợp đồng OpenAPI & Catalog:** `ContractDocumentsTest` pass 3/3.
