# Báo cáo Bàn giao Sprint 3 (Phần 2/2) — Phân cấp Nhiệm vụ, Giao việc CTV & Quản lý Quá hạn

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật
- **Giai đoạn:** Sprint 3 (Part 2/2 — Quản lý Nhiệm vụ, Subtask & Quá hạn)
- **Người phụ trách:** **Đoàn Kinh Quốc** (Backend Dev & Database)
- **Nhánh Git:** `feat/sprint3-task-hierarchy-and-tracking`
- **Đối chiếu Backlog:** `PB-26.1`, `PB-26.2`, `PB-27.1`, `PB-27.2`, `PB-28.1`, `PB-28.2`, `PB-29`, `PB-45`
- **Tiêu chí DoD liên quan:** `DoD-P3-08`, `DoD-SYS-06`, `DoD-SYS-08`

---

## 1. Danh mục User Story & Acceptance Criteria thực thi

### 1.1. `PB-26.1`, `PB-26.2` — Khởi tạo Nhiệm vụ & Phân cấp Task con (Subtask) (`DoD-P3-08`)
- **API:**
  - `POST /api/v1/clubs/{clubId}/tasks`: Tạo nhiệm vụ cấp CLB/Ban hoặc Task con (`parentTaskId`).
  - `GET /api/v1/clubs/{clubId}/tasks`: Tra cứu danh sách công việc theo bộ lọc CLB, Ban, người nhận việc.
- **Ràng buộc nghiệp vụ & Acceptance Criteria:**
  - `AC01`: Ban chủ nhiệm hoặc Trưởng ban được cấp quyền khởi tạo nhiệm vụ với đầy đủ tiêu đề, mô tả, mức độ ưu tiên (`LOW`, `MEDIUM`, `HIGH`, `URGENT`) và hạn hoàn thành (`deadline`).
  - `AC02`: **Giới hạn phân cấp 1 tầng (Max Depth = 1):** Task con chỉ được gán vào Task cha trực tiếp (`parentTask.parentTask == null`). Cố tình tạo task lồng nhiều tầng bị chặn với HTTP 400 `TASK_INVALID_HIERARCHY`.
  - `AC03`: **Ràng buộc thời hạn cha - con:** Hạn chót của task con không được vượt quá hạn chót của task cha (`subtask.deadline <= parentTask.deadline`), vi phạm trả về HTTP 400 `SUBTASK_DEADLINE_EXCEEDS_PARENT`.
  - `AC04`: Task con không được gán cha thuộc CLB khác (`404 PARENT_TASK_NOT_FOUND`).

### 1.2. `PB-27.1`, `PB-27.2` — Phân công Người thực hiện & Điều kiện Giao việc CTV Sự kiện (`DoD-P3-08`, `DoD-SYS-06`)
- **API:**
  - `PATCH /api/v1/tasks/{taskId}`: Đổi người phụ trách, cập nhật mức ưu tiên, hạn hoàn thành hoặc mở lại nhiệm vụ.
- **Ràng buộc phân quyền & Acceptance Criteria:**
  - `AC01`: **Phân định đối tượng nhận việc:** Nhiệm vụ nội bộ thường kỳ bắt buộc người nhận phải là thành viên `ACTIVE` của CLB (người ngoài nhận việc bị từ chối với HTTP 409 `ASSIGNEE_NOT_MEMBER`).
  - `AC02`: **Giao việc cho Cộng tác viên (CTV):** Cho phép phân công nhiệm vụ sự kiện (`eventId != null`) cho sinh viên ngoài CLB đã đăng ký tham gia sự kiện diện CTV (`allowCtv = true`). Sinh viên chưa đăng ký sự kiện bị chặn với HTTP 409 `ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK`.
  - `AC03`: **Cửa sổ thời hạn sự kiện:** Hạn hoàn thành của nhiệm vụ sự kiện không được vượt quá thời điểm kết thúc sự kiện cộng thêm 7 ngày (`event.endTime + 7 days`), trả về HTTP 400 `TASK_DEADLINE_OUTSIDE_EVENT_WINDOW`.

### 1.3. `PB-28.1`, `PB-28.2` — Báo cáo Tiến độ, Bàn giao Sản phẩm & Mở lại Task DONE (`DoD-P3-08`)
- **API:**
  - `GET /api/v1/users/me/tasks`: Danh sách công việc được giao cho cá nhân người dùng.
  - `GET /api/v1/tasks/{taskId}`: Xem chi tiết công việc.
  - `PATCH /api/v1/tasks/{taskId}/progress`: Cập nhật tiến độ hoàn thành bởi chính người được giao việc.
  - `PATCH /api/v1/tasks/{taskId}/verify`: Nghiệm thu công việc từ `DONE` sang `COMPLETED` bởi người quản lý.
- **Ràng buộc nghiệp vụ & Acceptance Criteria:**
  - `AC01`: **Bảo mật sở hữu cập nhật tiến độ:** Chỉ duy nhất người được giao việc (`assignee`) có quyền gọi API cập nhật tiến độ; người dùng khác cố tình cập nhật bị từ chối với HTTP 403 `PERMISSION_DENIED`.
  - `AC02`: Cập nhật tiến độ hỗ trợ phần trăm hoàn thành `0..100%`, trạng thái chuyển tiếp (`TODO` -> `IN_PROGRESS` -> `DONE`), ghi chú tiến độ và liên kết nộp sản phẩm (`reportLink`).
  - `AC03`: **Quy trình Mở lại Task DONE (`PB-58`):** Người quản lý được quyền mở lại nhiệm vụ từ `DONE` về `IN_PROGRESS` nếu sản phẩm chưa đạt yêu cầu, kèm theo điều chỉnh ưu tiên và hạn mới.
  - `AC04`: Nghiệm thu (`verify`) chuyển trạng thái từ `DONE` sang `COMPLETED`.

### 1.4. `PB-29` — Quản lý Nhiệm vụ Quá hạn & Tổng hợp Báo cáo (`DoD-P3-08`, `DoD-SYS-08`)
- **API:**
  - `GET /api/v1/clubs/{clubId}/tasks?overdue=true`: Lọc danh sách các nhiệm vụ đang quá hạn.
  - `GET /api/v1/clubs/{clubId}/tasks/summary`: Tổng hợp số lượng công việc theo từng trạng thái và số lượng quá hạn khớp theo bộ lọc.
- **Nguyên tắc phi phá hủy trạng thái thực thi (`DoD-P3-08`, `PB-29 AC03`):**
  - Khi kiểm tra quá hạn (`markOverdueTasks()`), hệ thống **không** ghi đè làm mất nhãn thực thi `IN_PROGRESS` hoặc `TODO` của sinh viên thành chuỗi cứng `OVERDUE`.
  - Trạng thái thực thi vẫn được giữ nguyên để thành viên tiếp tục làm việc và nộp bài, đồng thời cờ quá hạn (`overdue = true`) và thời điểm thông báo `overdue_notified_at` được kích hoạt để hiển thị cảnh báo đỏ và gửi thông báo nhắc việc.

---

## 2. Kiểm thử Tích hợp & Nghiệm thu Chấp thuận

- **Lớp kiểm thử:** `SprintThreeTaskAcceptanceTest.java` (gồm 4 nhóm kiểm thử tích hợp, chạy trên PostgreSQL 16 Testcontainers).
- **Trạng thái:** **Sẵn sàng & Biên dịch thành công 100% (4 / 4 test suites)**.
- **Chi tiết các ca kiểm thử:**
  1. `testTaskCreationAndSubtaskHierarchyConstraints`: Kiểm tra tạo task cha, giới hạn 1 tầng task con, chặn task con vượt hạn cha và chặn parent task sai CLB.
  2. `testAssigneeDelegationAndScopeEnforcement`: Kiểm tra phân quyền giao việc, chặn giao việc nội bộ cho CTV, giao việc sự kiện cho CTV hợp lệ và kiểm tra cửa sổ thời hạn sự kiện.
  3. `testAssigneeProgressTrackingAndReopenWorkflow`: Kiểm tra tra cứu việc cá nhân, bảo mật quyền cập nhật tiến độ (chặn người ngoài), cập nhật link báo cáo, quy trình mở lại task `DONE` và nghiệm thu `COMPLETED`.
  4. `testOverdueTaskDetectionAndSummaryReporting`: Kiểm tra cơ chế quá hạn phi phá hủy trạng thái (`IN_PROGRESS` giữ nguyên kèm cờ overdue), lọc công việc quá hạn và bảng tổng hợp chỉ số summary.
