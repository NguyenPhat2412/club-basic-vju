# Báo cáo Bàn giao Sprint 2 (Phần 2/3) — Quy trình Tuyển thành viên, Hồ sơ Ứng tuyển & Xét duyệt Đơn CLB

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật
- **Giai đoạn:** Sprint 2 (Part 2/3)
- **Người phụ trách:** **Đoàn Kinh Quốc** (Backend Dev & Database)
- **Mã PR:** PR 2 (`feat/sprint2-application-workflow`)
- **Đối chiếu Backlog:** `PB-18`, `PB-19.1`, `PB-19.2`, `PB-20.1`, `PB-20.2`, `PB-20.3`
- **Tiêu chí DoD liên quan:** `DoD-P2-09`, `DoD-P2-10`

---

## 1. Danh mục User Story & Acceptance Criteria thực thi

### 1.1. `PB-18` (5 SP) — Nộp đơn đăng ký tham gia CLB
- **API:**
  - `GET /api/v1/clubs/{clubId}/application-form`: Lấy biểu mẫu tuyển thành viên đang mở của CLB (hoặc form mặc định).
  - `POST /api/v1/clubs/{clubId}/applications`: Sinh viên nộp đơn đăng ký với các trường thông tin chi tiết (nguyện vọng ban 1/2, số điện thoại, ngành học, khóa, GPA, giới thiệu bản thân, kỹ năng, câu trả lời động).
- **Acceptance Criteria:**
  - `TC-PB-18-01`: Sinh viên nộp đơn thành công vào CLB đang `ACTIVE`, trạng thái khởi tạo `PENDING`.
  - `TC-PB-18-02`: Chặn nộp đơn trùng khi đã có đơn `PENDING` tại CLB đó (`409 APPLICATION_ALREADY_PENDING`).
  - `TC-PB-18-03`: Chặn nộp đơn khi sinh viên đã là thành viên đang hoạt động của CLB (`409 ALREADY_CLUB_MEMBER`).
  - `TC-PB-18-04`: Chặn nộp đơn vào CLB `INACTIVE` (`409 CLUB_INACTIVE`) hoặc khi vượt giới hạn `maxPendingApplications` (`409 APPLICATION_PENDING_LIMIT`).

### 1.2. `PB-19.1` (3 SP) — Xem danh sách & Chi tiết đơn đăng ký cá nhân
- **API:**
  - `GET /api/v1/users/me/applications`: Danh sách đơn của tài khoản đăng nhập (lọc `status`, `clubId`, sắp xếp, phân trang).
  - `GET /api/v1/users/me/applications/{applicationId}`: Xem chi tiết đơn cá nhân.
- **Acceptance Criteria:**
  - `TC-PB-19.1-01`: Trả về danh sách đơn của chính người dùng đăng nhập; hỗ trợ lọc theo trạng thái (`PENDING`, `APPROVED`, `REJECTED`, `CANCELLED`).
  - `TC-PB-19.1-02`: Xem chi tiết đơn với đầy đủ thông tin hồ sơ và `reviewNote` phản hồi từ ban chủ nhiệm.
  - `TC-PB-19.1-03`: **Bảo vệ quyền riêng tư tuyệt đối:** Phía ứng viên không bao giờ thấy `internalNote` (`internalNote = null`) và người duyệt (`reviewedBy = null`).
  - `TC-PB-19.1-04`: Người dùng khác không thể truy cập đơn qua endpoint cá nhân (`404 CLUB_APPLICATION_NOT_FOUND`).

### 1.3. `PB-19.2` (3 SP) — Cập nhật & Hủy đơn đăng ký cá nhân
- **API:**
  - `PUT /api/v1/users/me/applications/{applicationId}`: Cập nhật thông tin đơn khi đang ở trạng thái `PENDING`.
  - `PATCH /api/v1/users/me/applications/{applicationId}/cancel`: Hủy đơn đăng ký đang chờ duyệt.
- **Acceptance Criteria:**
  - `TC-PB-19.2-01`: Cho phép ứng viên bổ sung, cập nhật thông tin hồ sơ khi đơn còn ở trạng thái `PENDING`.
  - `TC-PB-19.2-02`: Hủy đơn `PENDING` chuyển trạng thái sang `CANCELLED`, cập nhật mốc thời gian `cancelledAt`.
  - `TC-PB-19.2-03`: Chặn hủy đơn đã kết thúc (`APPROVED`, `REJECTED`, `CANCELLED`) với mã lỗi `409 APPLICATION_CANNOT_BE_CANCELLED`.
  - `TC-PB-19.2-04`: **Cấm xóa cứng (No Hard Delete):** Endpoint `DELETE` bị vô hiệu hóa (`405 METHOD_NOT_ALLOWED`). Đơn `CANCELLED` bảo toàn lịch sử và cho phép ứng viên nộp lại ngay lập tức mà không chịu thời gian chờ cooldown.

### 1.4. `PB-20.1` (3 SP) — Quản lý & Lọc danh sách đơn cấp CLB
- **API:**
  - `GET /api/v1/clubs/{clubId}/applications`: Quản lý CLB xem danh sách đơn (lọc `status`, tìm kiếm từ khóa `search`, lọc khoảng ngày nộp `createdFrom`/`createdTo`, phân trang).
  - `GET /api/v1/clubs/{clubId}/applications/{applicationId}`: Xem chi tiết hồ sơ ứng viên (hiển thị cả `internalNote` và `reviewedBy`).
  - `PUT /api/v1/clubs/{clubId}/applications/{applicationId}`: Cập nhật thông tin/ghi chú của đơn.
- **Acceptance Criteria:**
  - `TC-PB-20.1-01`: Quản lý CLB lọc đơn theo từ khóa, trạng thái, ngày nộp chính xác.
  - `TC-PB-20.1-02`: Người có quyền xem đơn phía CLB thấy được đầy đủ cả `reviewNote` và `internalNote` nội bộ.
  - `TC-PB-20.1-03`: **Phân quyền Scope CLB nghiêm ngặt:** Người không có quyền quản lý CLB hoặc thuộc CLB khác bị chặn `403 PERMISSION_DENIED` hoặc `404 CLUB_APPLICATION_NOT_FOUND`.
  - `TC-PB-20.1-04`: Chặn lách quy trình xét duyệt bằng cách thay đổi trường `status` qua API `PUT` (`409 APPLICATION_STATUS_TRANSITION_NOT_ALLOWED`).

### 1.5. `PB-20.2` (5 SP) — Xét duyệt đơn đăng ký tham gia CLB (`APPROVED`)
- **API:** `POST /api/v1/clubs/{clubId}/applications/{applicationId}/approve`
- **Acceptance Criteria:**
  - `TC-PB-20.2-01`: Duyệt đơn chuyển trạng thái sang `APPROVED`, tự động tạo bản ghi `Membership ACTIVE` cho ứng viên, gán vai trò gia nhập `CLUB_MEMBER`, và phân công vào ban chuyên môn (`preferredDepartmentId` hoặc `departmentId` chỉ định).
  - `TC-PB-20.2-02`: Hỗ trợ tùy chọn `skipDepartmentAssignment = true` khi duyệt để chỉ tạo `Membership` CLB chung mà không phân ban.
  - `TC-PB-20.2-03`: Chặn duyệt lại đơn đã kết thúc (`409 APPLICATION_ALREADY_REVIEWED`).
  - `TC-PB-20.2-04`: Ghi nhật ký kiểm toán `CLUB_APPLICATION_APPROVED` và bắn thông báo in-app cho ứng viên.

### 1.6. `PB-20.3` (3 SP) — Từ chối đơn đăng ký tham gia CLB (`REJECTED`)
- **API:** `POST /api/v1/clubs/{clubId}/applications/{applicationId}/reject`
- **Acceptance Criteria:**
  - `TC-PB-20.3-01`: Từ chối đơn chuyển trạng thái sang `REJECTED`, lưu lý do phản hồi `reviewNote` và ghi chú đánh giá `internalNote`.
  - `TC-PB-20.3-02`: Từ chối đơn không tạo `Membership` hay phân ban nào.
  - `TC-PB-20.3-03`: Áp dụng thời gian chờ nộp lại `reapplyCooldownDays`: sinh viên nộp lại trước hạn bị chặn với `409 APPLICATION_REAPPLY_TOO_SOON`.
  - `TC-PB-20.3-04`: Gửi thông báo in-app kèm lời nhắn cho ứng viên và ghi nhật ký kiểm toán `CLUB_APPLICATION_REJECTED`.

---

## 2. Kiểm thử Tích hợp Tự động

- **Lớp kiểm thử:** `SprintTwoApplicationAcceptanceTest.java` (`backend/springboot/src/test/java/com/vju/club/integration/SprintTwoApplicationAcceptanceTest.java`)
- **Phương thức kiểm thử đối ứng:**
  1. `testSubmitClubApplicationAndEnforceConstraints()`: Kiểm chứng `PB-18` (`TC-PB-18-01..04`).
  2. `testStudentTrackPersonalApplicationsAndPrivacy()`: Kiểm chứng `PB-19.1` (`TC-PB-19.1-01..04`).
  3. `testUpdateAndCancelApplication()`: Kiểm chứng `PB-19.2` (`TC-PB-19.2-01..04`).
  4. `testClubManagerListApplicationsAndScopeSecurity()`: Kiểm chứng `PB-20.1` (`TC-PB-20.1-01..04`).
  5. `testApproveApplicationLifecycle()`: Kiểm chứng `PB-20.2` (`TC-PB-20.2-01..04`).
  6. `testRejectApplicationLifecycleAndCooldown()`: Kiểm chứng `PB-20.3` (`TC-PB-20.3-01..04`).
- **Hợp đồng OpenAPI & Catalog:** `ContractDocumentsTest` pass 3/3.
