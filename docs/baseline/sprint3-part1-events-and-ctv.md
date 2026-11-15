# Báo cáo Bàn giao Sprint 3 (Phần 1/2) — Vòng đời Sự kiện, Cổng CTV & Quản lý Người tham gia

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật
- **Giai đoạn:** Sprint 3 (Part 1/2 — Vòng đời Sự kiện & Cổng CTV)
- **Người phụ trách:** **Đoàn Kinh Quốc** (Backend Dev & Database)
- **Nhánh Git:** `feat/sprint3-event-lifecycle-and-ctv`
- **Đối chiếu Backlog:** `PB-44` (phần sự kiện/CTV), `PB-21.1`, `PB-21.2`, `PB-21.3`, `PB-21.5`, `PB-22.1`, `PB-22.2`, `PB-23.1`, `PB-23.2`, `PB-24.1`, `PB-24.2`, `PB-25.1`, `PB-25.2`
- **Tiêu chí DoD liên quan:** `DoD-P3-02`, `DoD-P3-04`, `DoD-P3-05`, `DoD-P3-06`, `DoD-P3-07`

---

## 1. Danh mục User Story & Acceptance Criteria thực thi

### 1.1. `PB-21.1`, `PB-21.2`, `PB-21.3`, `PB-21.5` — Khởi tạo, Cập nhật, Hủy & Khám phá Sự kiện (`DoD-P3-04`)
- **API:**
  - `POST /api/v1/clubs/{clubId}/events`: Khởi tạo sự kiện mới (yêu cầu quyền `event.create` tại CLB).
  - `PATCH /api/v1/clubs/{clubId}/events/{eventId}`: Cập nhật thông tin sự kiện hoặc trạng thái (`CANCELLED`, `CLOSED_REGISTRATION`).
  - `GET /api/v1/clubs/{clubId}/events`: Danh sách sự kiện CLB có bộ lọc theo `status`, `departmentId`.
  - `GET /api/v1/public/events`: Danh sách sự kiện công khai trên Landing Page dành cho sinh viên.
- **Ràng buộc nghiệp vụ & Acceptance Criteria:**
  - `AC01`: Bắt buộc kiểm tra `startTime < endTime` và `registrationDeadline <= startTime` (trả về HTTP 400 `INVALID_ARGUMENT` nếu vi phạm).
  - `AC02`: Phân loại sự kiện nội bộ (`allowCtv = false`) và sự kiện mở cho Cộng tác viên ngoài CLB (`allowCtv = true`).
  - `AC03`: Khi sự kiện bị hủy (`CANCELLED`), hệ thống chặn toàn bộ lượt đăng ký mới, cập nhật trạng thái sự kiện hiển thị đã hủy và ghi audit log.
  - `AC04`: Hỗ trợ khám phá sự kiện công khai không đòi hỏi đăng nhập hoặc quyền membership.

### 1.2. `PB-22.1`, `PB-22.2`, `PB-23.1`, `PB-23.2` — Vòng đời Đăng ký Sự kiện & Thành viên CLB (`DoD-P3-05`)
- **API:**
  - `POST /api/v1/events/{eventId}/registrations`: Đăng ký tham gia sự kiện.
  - `PATCH /api/v1/events/{eventId}/registrations/me/cancel`: Hủy đăng ký trước hạn.
- **Ràng buộc nghiệp vụ & Acceptance Criteria:**
  - `AC01`: Đăng ký sự kiện chỉ hợp lệ khi sự kiện ở trạng thái `OPEN_REGISTRATION` và thời điểm đăng ký chưa vượt quá `registrationDeadline`.
  - `AC02`: Chống đăng ký trùng lặp: Thành viên cố tình gửi đăng ký lần 2 bị từ chối với HTTP 409 (`DUPLICATE_REGISTRATION`).
  - `AC03`: Kiểm soát sức chứa (`maxParticipants`): Khi số người đăng ký hợp lệ đạt giới hạn, lượt đăng ký tiếp theo trả về HTTP 409 `EVENT_FULL`.
  - `AC04`: Cho phép thành viên tự nguyện hủy đăng ký trước hạn chót (`registrationDeadline`), chuyển trạng thái đăng ký sang `CANCELLED` và giải phóng slot cho người khác.

### 1.3. `PB-24.1`, `PB-24.2` — Cổng Đăng ký CTV & Cách ly Bảo mật Quyền hạn (`DoD-P3-06`, `DoD-P3-02`)
- **API:**
  - `POST /api/v1/events/{eventId}/registrations`: Sinh viên ngoài CLB đăng ký tham gia diện CTV khi `allowCtv = true`.
  - `GET /api/v1/users/me/event-registrations`: Tra cứu lịch sử đăng ký sự kiện và vai trò CTV của tôi.
  - `PATCH /api/v1/events/{eventId}/registrations/me/cancel`: CTV hủy đăng ký trước hạn.
- **Ràng buộc bảo mật cốt lõi (`DoD-P3-06`):**
  - Sinh viên chưa là thành viên CLB chỉ được đăng ký các sự kiện có `allowCtv = true`. Nếu cố tình đăng ký sự kiện nội bộ (`allowCtv = false`), hệ thống chặn ngay với HTTP 403 `PERMISSION_DENIED`.
  - **Cách ly Membership & RBAC:** Việc đăng ký diện CTV và nhận vai trò sự kiện **tuyệt đối không phát sinh bản ghi trong bảng `memberships`** và **không cấp bất kỳ quyền CLB/toàn cục nào** (`effective-permissions` hoàn toàn trống).

### 1.4. `PB-25.1`, `PB-25.2` — Danh sách Người đăng ký & Vai trò trong Sự kiện (`DoD-P3-07`)
- **API:**
  - `GET /api/v1/events/{eventId}/registrations`: Xem danh sách người đăng ký sự kiện (yêu cầu quyền quản lý sự kiện).
  - `PATCH /api/v1/events/{eventId}/registrations/{registrationId}`: Cập nhật vai trò sự kiện (`eventRole`, ví dụ: "Điều phối Hậu cần", "Kỹ thuật Âm thanh") và ghi chú.
- **Ràng buộc nghiệp vụ & Acceptance Criteria:**
  - Người dùng không có quyền quản lý sự kiện bị chặn với HTTP 403 `PERMISSION_DENIED`.
  - Thao tác cập nhật vai trò sự kiện được ghi vết đầy đủ vào `audit_logs` với action `EVENT_REGISTRATION_UPDATED`.
  - Việc gán `eventRole` giữ nguyên nguyên tắc cách ly bảo mật: không biến CTV thành thành viên CLB.

---

## 2. Kiểm thử Tích hợp & Nghiệm thu Chấp thuận

- **Lớp kiểm thử:** `SprintThreeEventAcceptanceTest.java` (gồm 4 nhóm kiểm thử tích hợp, chạy trên PostgreSQL 16 Testcontainers).
- **Trạng thái:** **Pass 100% (4 / 4 test suites)**.
- **Chi tiết các ca kiểm thử:**
  1. `testEventCreationLifecycleAndValidation`: Xác thực dữ liệu đầu vào (lỗi đảo thời gian, lỗi deadline sau start time), khởi tạo sự kiện thành công, cập nhật thông tin, khám phá công khai và hủy sự kiện an toàn.
  2. `testEventRegistrationWorkflowAndCapacity`: Kiểm tra đăng ký thành viên, chặn trùng đăng ký, chặn khi hết slot (`EVENT_FULL`), hủy đăng ký trước hạn giải phóng slot và đóng đăng ký sự kiện.
  3. `testCtvRegistrationAndSecurityIsolation`: Đăng ký CTV cho sự kiện mở, chặn sinh viên ngoài vào sự kiện nội bộ, kiểm tra cách ly bảo mật (0 bản ghi membership, 0 quyền RBAC) và hủy đăng ký CTV.
  4. `testParticipantManagementAndEventRoles`: Tra cứu danh sách nhân sự tham gia, phân quyền truy cập, gán vai trò sự kiện (`eventRole`) và kiểm tra vết audit.
