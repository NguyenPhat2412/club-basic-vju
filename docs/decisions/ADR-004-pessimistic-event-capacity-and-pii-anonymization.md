# ADR-004: Khóa bi quan chống vượt chỉ tiêu sự kiện, cô lập Cộng tác viên (CTV), Subtask 1 cấp và ẩn danh PII bảo toàn lịch sử

## Status
Accepted

## Date
2026-11-04

## Context
Giai đoạn 3 và 4 đưa hệ thống vào các nghiệp vụ vận hành thực tế có tranh chấp đồng thời cao và yêu cầu bảo toàn lịch sử kiểm toán chặt chẽ (`docs/baseline/phase3-4-po-decisions.md`):
1. Khi CLB mở cổng đăng ký sự kiện giới hạn số chỗ (`capacity`), hàng chục sinh viên có thể bấm đăng ký vào đúng suất cuối cùng cùng một thời điểm.
2. Sinh viên ngoài CLB đăng ký làm Cộng tác viên (`CTV`) cần nhận nhiệm vụ sự kiện nhưng tuyệt đối không được leo thang thành thành viên nội bộ CLB.
3. Khi xóa tài khoản người dùng từng tham gia CLB, nộp đơn, điểm danh hoặc thực hiện thao tác quản trị, xóa vật lý (`DELETE CASCADE` hoặc xóa cứng) sẽ làm sai lệch số liệu thống kê lịch sử và phá vỡ tính bất biến của nhật ký kiểm toán (`audit_logs`).

## Decision
1. **Khóa bi quan (`PESSIMISTIC_WRITE`) khi đăng ký sự kiện (`PB-44`, `PB-57`):**
   - Trong giao dịch đăng ký sự kiện (`EventServiceImpl`), khóa dòng bản ghi `events` bằng `SELECT ... FOR UPDATE` trước khi đếm số đăng ký hợp lệ so với `capacity`. Các luồng đồng thời vượt trần nhận chính xác `409 EVENT_CAPACITY_FULL` thay vì vượt chỉ tiêu hoặc lỗi `500`.
2. **Cô lập tuyệt đối vai trò Cộng tác viên (`CTV` — `PB-24.1`, `PB-57`):**
   - Đăng ký diện `CTV` chỉ ghi vào `event_registrations` (`participant_type = 'CTV'`, `event_role`), **không** tạo `Membership` và **không** sinh bất kỳ bản ghi nào trong `user_roles` / `user_permissions`. Quyền xem/báo cáo tiến độ task sự kiện của CTV được kiểm tra nghiêm ngặt theo `task.assigneeId == actor.id()`.
3. **Phân rã Subtask tối đa 1 cấp & Cờ quá hạn không ghi đè trạng thái (`PB-26.2`, `PB-29`, `PB-58`):**
   - Bảng `tasks` dùng khóa ngoại tự tham chiếu `parent_task_id` nhưng chặn tạo subtask của subtask (`≥ 2` cấp) để tránh cây đệ quy phức tạp; nhiệm vụ quá hạn giữ nguyên trạng thái `TODO`/`IN_PROGRESS` kèm cờ động `overdue = true` và dấu thời gian cảnh báo `overdue_notified_at`.
4. **Khóa lạc quan cho hậu kiểm điểm danh (`PB-31`, `PB-60`):**
   - Điểm danh sau khi sự kiện `COMPLETED` chỉ được sửa trong cửa sổ `system_settings.attendance_edit_window_hours` (mặc định `48h`), bắt buộc nhập `edit_reason` và dùng `@Version` (`event_attendances.version`) chống ghi đè chéo giữa hai cán bộ tổ chức.
5. **Xóa thông minh: Xóa vật lý tài khoản trắng vs. Ẩn danh PII tại chỗ (`PB-38`, `PB-59`):**
   - Toàn bộ khóa ngoại lịch sử (`club_applications`, `event_registrations`, `event_attendances`, `tasks`, `documents`, `chat_messages`, `audit_logs`) đặt `ON DELETE RESTRICT` (`V21`).
   - Nếu tài khoản chưa phát sinh bất kỳ bản ghi lịch sử nào: xóa vật lý (`USER_DELETED`). Nếu đã có lịch sử: tự động tẩy trắng PII tại chỗ (`deleted+<uuid>@anonymized.vju.local`, xóa tên thật/MSSV/SĐT/avatar/`google_subject`, đặt `status = INACTIVE`, `anonymized_at = now()`, thu hồi mọi phiên) và giữ nguyên 100% khóa ngoại thống kê lịch sử (`USER_ANONYMIZED`).

## Alternatives Considered

### Khóa lạc quan (`@Version`) trên bảng `events` cho đăng ký sự kiện
- **Nhược điểm:** Khi 20 sinh viên cùng bấm đăng ký lúc còn 10 chỗ trống, khóa lạc quan khiến 19 sinh viên bị lỗi xung đột phiên bản dù sự kiện vẫn còn chỗ, buộc người dùng bấm lại nhiều lần.
- **Lý do loại bỏ:** Khóa bi quan xếp hàng tuần tự trong vài mili-giây trên dòng `events` giúp lấp đầy đúng 10 chỗ hợp lệ một cách mượt mà.

### Xóa mềm đơn thuần (`is_deleted = true`) nhưng giữ nguyên email/MSSV gốc
- **Nhược điểm:** Không thực sự xóa thông tin định danh cá nhân (PII) và chặn sinh viên đăng ký lại nếu cần giải phóng email/MSSV.
- **Lý do loại bỏ:** Ẩn danh PII tại chỗ vừa giải phóng định danh cá nhân vừa bảo toàn trọn vẹn các khóa ngoại lịch sử.

## Consequences
- Đạt `100%` độ chính xác trong các bài kiểm thử đồng thời đa luồng (`PhaseThreeAcceptanceTest`, `PhaseFourAcceptanceTest`, `FlowHardeningApiTest`).
- Tài khoản đã ẩn danh (`anonymized_at IS NOT NULL`) bị chặn kích hoạt lại vĩnh viễn với mã lỗi `409 ACCOUNT_ANONYMIZED`.
