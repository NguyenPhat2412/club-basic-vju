# Quyết định Nghiệp vụ Giai đoạn 3 & 4 (Sprint 3–4) — Product Owner (`PB-57`, `PB-58`, `PB-59`, `PB-60`, `PB-61`)

- **Dự án:** Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật (`club-basic-vju`)
- **Giai đoạn:** Phase 3 & Phase 4 (Sự kiện, Cộng tác viên CTV, Nhiệm vụ & Subtask, Điểm danh Hậu kiểm, Thông báo theo Tài nguyên, Thống kê Tổng quan, Ẩn danh Tài khoản & Đo tải Hiệu năng)
- **Người chốt quyết định:** Nguyễn Xuân Phát (Product Owner) & Hà Lê Ngọc Thắng (Tester/BA)
- **Ngày xác nhận:** `2026-11-04`
- **Tiêu chí nghiệm thu liên quan:** `DoD-P3-01`, `DoD-P4-01`, `TC-PB-57-01..03`, `TC-PB-58-01..03`, `TC-PB-59-01..03`, `TC-PB-60-01..03`, `TC-PB-61-01..03`

---

## 1. `PB-57` — Vòng đời Sự kiện, Cộng tác viên (`CTV`), Hạn đóng/hủy & Tác động Dây chuyền

### 1.1. Ma trận chuyển trạng thái Sự kiện (`EventStatus`)
Không tự ý bổ sung hệ thống bán vé, đợt xét duyệt sự kiện nhiều cấp hay quota phức tạp ngoài `maxParticipants`:

| Trạng thái hiện tại | Đích hợp lệ | Điều kiện & Hệ quả dữ liệu |
|---|---|---|
| `DRAFT` | `OPEN_REGISTRATION`, `CANCELLED` | `OPEN_REGISTRATION` gửi thông báo in-app tới thành viên CLB/ban phụ trách; `DRAFT` chỉ hiển thị cho người có quyền nội bộ. |
| `OPEN_REGISTRATION` | `CLOSED_REGISTRATION`, `COMPLETED`, `CANCELLED` | Cho phép đăng ký và tự hủy đăng ký khi `now <= registrationDeadline` và chưa chạm `maxParticipants`. |
| `CLOSED_REGISTRATION` | `OPEN_REGISTRATION`, `COMPLETED`, `CANCELLED` | Chặn đăng ký mới và chặn tự hủy đăng ký; cho phép ghi nhận điểm danh khi `now >= startTime - 2h`. |
| `COMPLETED` | *(Trạng thái cuối)* | Ghi nhận `completed_at = now()`; chặn đăng ký mới; **không** tự động đánh dấu có mặt cho người chỉ đăng ký; chỉ cho phép điều chỉnh điểm danh có lý do trong cửa sổ hậu kiểm. |
| `CANCELLED` | *(Trạng thái cuối)* | Chặn mọi đăng ký và điểm danh; **giữ nguyên** lịch sử `event_registrations` & `event_attendances`; tự động chuyển các nhiệm vụ đang mở (`TODO`, `IN_PROGRESS`) thuộc sự kiện sang `CANCELLED` kèm thông báo idempotent. |

### 1.2. Quy tắc Thời gian & Ví dụ Biên tại Múi giờ Chuẩn (`Asia/Ho_Chi_Minh`, `UTC+07:00`)
Toàn bộ cột thời gian lưu dưới dạng `TIMESTAMPTZ` (ISO-8601) và đối chiếu qua `java.time.Clock`:
- Điều kiện hợp lệ để đăng ký hoặc tự hủy đăng ký: `event.status == OPEN_REGISTRATION` **và** `!now.isAfter(registrationDeadline)` (`now <= registrationDeadline`).
- **Ví dụ minh họa (`registrationDeadline = 2026-11-10T17:00:00+07:00`):**
  1. **Trước hạn (`16:59:59+07:00`):** Đăng ký / hủy đăng ký **Thành công (`201` / `200`)**.
  2. **Đúng thời điểm hạn (`17:00:00+07:00`):** Đăng ký / hủy đăng ký **Thành công (`201` / `200`)**.
  3. **Sau hạn 1 giây (`17:00:01+07:00`):** Bị từ chối với **`400 REGISTRATION_CLOSED`**.

### 1.3. Đối tượng `MEMBER` vs `CTV` và Xử lý khi Rời Sự kiện
1. **Phân loại tự động tại nguồn:** Khi đăng ký sự kiện, nếu người dùng có `Membership == ACTIVE` tại CLB tổ chức thì `participantType = MEMBER`; nếu không phải thành viên CLB và sự kiện bật `allowCtv = true` thì `participantType = CTV` (nếu `allowCtv = false` trả `403 PERMISSION_DENIED`).
2. **Cách ly quyền hạn:** Bản ghi `CTV` hoặc `eventRole` (ví dụ `"CTV Hậu cần"`, `"Điều phối sân khấu"` cập nhật qua `PATCH /api/v1/events/{eventId}/registrations/{registrationId}`) **không** tạo `Membership` CLB và **không** cấp bất kỳ quyền quản trị RBAC nào.
3. **Không mất trách nhiệm nhiệm vụ khi hủy đăng ký (`PB-23.2`, `PB-24.2`):** Khi thành viên hoặc CTV tự hủy đăng ký trước hạn (hoặc bị ban tổ chức chuyển trạng thái đăng ký sang `CANCELLED`), mọi nhiệm vụ đang mở (`TODO`, `IN_PROGRESS`) gắn với sự kiện đó đang giao cho người này được **tự động hoàn trả về người giao việc (`assigner`)** ở trạng thái `TODO`, ghi `audit_logs` và gửi thông báo cho `assigner` để phân công lại.

---

## 2. `PB-58` — Mô hình Nhiệm vụ, Task Con (`Subtask`), Giao việc cho `CTV` & Nhãn Quá hạn (`Overdue`)

### 2.1. Số người phụ trách & Quy tắc Cha/Con (`parentTaskId`)
1. **Một người chịu trách nhiệm chính (`assigneeId`):** Mỗi task có đúng 1 `assignee` chịu trách nhiệm cập nhật tiến độ để tránh đùn đẩy trách nhiệm; khi cần chia nhỏ công việc cho nhiều người, Trưởng ban hoặc người quản lý tạo các **task con (`parentTaskId`)**.
2. **Ràng buộc cây nhiệm vụ (`PB-26.2`):**
   - Task con phải thuộc **cùng `club_id`** với task cha (`404 PARENT_TASK_NOT_FOUND` nếu khác CLB), không được trỏ vào chính mình và không tạo chu kỳ hoặc lồng quá cấp cho phép (`400 TASK_INVALID_HIERARCHY`).
   - `deadline` của task con không được vượt quá `deadline` của task cha (`400 SUBTASK_DEADLINE_EXCEEDS_PARENT`).
   - **Không tự động đánh dấu task cha `DONE`:** Khi toàn bộ task con xong, người phụ trách task cha chủ động rà soát và báo cáo `DONE`. Ngược lại, không thể nghiệm thu (`verify -> COMPLETED`) task cha khi vẫn còn task con ở trạng thái `TODO` hoặc `IN_PROGRESS` (`409 SUBTASKS_INCOMPLETE`).

### 2.2. Phạm vi Quyền Trưởng ban (`DEPARTMENT`) và Điều kiện Giao việc cho `CTV` (`PB-27.1`, `PB-28.1`, `PB-28.2`)
1. **Trưởng ban chỉ có scope `DEPARTMENT`:** Chỉ được giao task/subtask thuộc ban mình cho thành viên đang thuộc ban đó (`403 PERMISSION_SCOPE_MISMATCH`), kể cả khi tách việc từ một task cha cấp CLB được giao cho Trưởng ban.
2. **Giao việc cho `CTV`:**
   - Chỉ task gắn với sự kiện (`eventId != null`, sự kiện chưa `CANCELLED`/`COMPLETED`) mới được phép giao cho tài khoản `CTV` đang có bản ghi `event_registrations.status = 'REGISTERED'` tại đúng sự kiện đó (`409 ASSIGNEE_NOT_ELIGIBLE_FOR_EVENT_TASK` nếu chưa đăng ký sự kiện).
   - Task nội bộ không gắn sự kiện (`eventId == null`) bắt buộc người nhận có `Membership == ACTIVE` tại CLB (`409 ASSIGNEE_NOT_MEMBER`).
   - `CTV` chỉ xem và cập nhật tiến độ được đúng task giao cho mình; thử truy cập `GET /api/v1/tasks/{otherTaskId}` hoặc `PATCH /api/v1/tasks/{otherTaskId}/progress` của sự kiện/người khác bị chặn với `403 PERMISSION_DENIED`.
3. **Mở lại task `DONE`:** Khi task đang ở `DONE` (chưa được nghiệm thu `COMPLETED`), người thực hiện hoặc người có quyền `task.update`/`task.verify` có thể chuyển lại `IN_PROGRESS` để bổ sung kết quả; task đã `COMPLETED` hoặc `CANCELLED` là trạng thái đóng, không mở lại.

### 2.3. Biểu diễn Quá hạn Không Ghi đè `IN_PROGRESS` (`PB-29`)
- **Quyết định chốt:** Cờ `overdue` là thuộc tính dẫn xuất thời gian thực:
  $$\text{overdue} = (\text{status} \in \{\text{TODO}, \text{IN\_PROGRESS}\}) \land (\text{now} > \text{deadline})$$
- Tiến trình định kỳ `markOverdueTasks()` chỉ ghi dấu `overdue_notified_at = now()` để gửi thông báo nhắc hạn đúng 1 lần (idempotent) và ghi `audit_logs`, **tuyệt đối giữ nguyên `status = IN_PROGRESS` hoặc `TODO`** để người quản lý biết nhiệm vụ đang được làm dở hay chưa bắt đầu.
- Ví dụ: Task `"Dựng khung backdrop"` có `status = IN_PROGRESS` (`60%`) và `deadline = 10:00`. Lúc `10:05`, API trả `status: "IN_PROGRESS", overdue: true, progressPercent: 60`; người nhận vẫn cập nhật tiếp lên `100%` (`DONE`) bình thường.

---

## 3. `PB-59` — Chính sách Xóa vs Ẩn danh Dữ liệu Cá nhân (`PII`) Tài khoản (`PB-38`)

### 3.1. Phân loại Xử lý khi Quản trị viên gọi `DELETE /api/v1/users/{userId}`
Chỉ người có quyền `user.delete` (`GLOBAL`) thực hiện được; luôn chặn tự xóa chính mình (`409 CANNOT_DELETE_SELF`), chặn xóa quản trị viên hệ thống cuối cùng (`409 LAST_SYSTEM_ADMIN`), và chặn người không phải `SYSTEM_ADMIN` tác động lên `SYSTEM_ADMIN`.

| Trường hợp tài khoản | Hành động thực thi | Dữ liệu xóa / làm sạch | Dữ liệu giữ lại nguyên vẹn |
|---|---|---|---|
| **1. Tài khoản chưa phát sinh lịch sử nghiệp vụ** *(0 đơn ứng tuyển, 0 đăng ký/điểm danh sự kiện, 0 nhiệm vụ, 0 tài liệu tải lên)* | **Xóa vật lý có kiểm soát (`USER_DELETED`)** | Xóa dòng `users`, `memberships` nháp, `user_roles`, `user_permissions`, hủy toàn bộ phiên `spring_session`. | `audit_logs` và `permission_audit_logs` (không gắn `ON DELETE CASCADE`). |
| **2. Tài khoản đã có lịch sử nghiệp vụ** *(có đơn ứng tuyển, đăng ký/điểm danh sự kiện, nhiệm vụ, tin nhắn hoặc tài liệu)* | **Ẩn danh PII tại chỗ (`USER_ANONYMIZED`)** | Thay `email -> deleted+<uuid>@anonymized.vju.local`, `fullName -> "Tài khoản đã ẩn danh"`, xóa trắng `studentCode`, `phone`, `avatarUrl`, `googleSub`, vô hiệu hóa `passwordHash`, đặt `status = INACTIVE`, `anonymized_at = now()`, thu hồi phiên + quyền, đóng `memberships` đang mở sang `LEFT`. | Giữ nguyên 100% bản ghi `club_applications`, `event_registrations`, `event_attendances`, `tasks`, `documents`, `audit_logs`, `permission_audit_logs` — không gãy khóa ngoại (`ON DELETE RESTRICT`) và không làm sai lệch số liệu thống kê lịch sử. |

### 3.2. Quy trình Kiểm thử & Sao lưu An toàn
- Mọi kiểm thử xóa/ẩn danh chạy hoàn toàn trên cơ sở dữ liệu cô lập (PostgreSQL 16 Testcontainers) hoặc bản sao thử nghiệm qua `deploy/backup-db.sh` & `deploy/restore-db.sh`; tuyệt đối không thử nghiệm trên dữ liệu thật.

---

## 4. `PB-60` — Quy tắc Điểm danh Hậu kiểm & Tập Người nhận Thông báo

### 4.1. Danh mục Trạng thái & Quyền Sửa Điểm danh (`PB-30`, `PB-31`, `PB-32`)
1. **4 trạng thái điểm danh hợp lệ:** `PRESENT` (Có mặt), `LATE` (Đến muộn), `ABSENT` (Vắng mặt), `EXCUSED` (Vắng có phép).
2. **Tách quyền ghi nhận ban đầu và quyền hiệu chỉnh:**
   - Ghi nhận điểm danh lần đầu (khi sự kiện mở điểm danh từ `startTime - 2h` và chưa `COMPLETED`): yêu cầu quyền `event.attendance` hoặc `event.attendance_edit` trong phạm vi CLB/Ban.
   - **Sửa bản ghi điểm danh đã tồn tại** hoặc **ghi/sửa sau khi sự kiện đã `COMPLETED`**: bắt buộc có quyền **`event.attendance_edit`**, phải truyền **`reason` (lý do điều chỉnh không rỗng)**, và phải nằm trong cửa sổ `attendanceEditWindowHours` (mặc định `48` giờ kể từ `completedAt`, cấu hình động tại `system_settings`). Quá hạn trả `409 ATTENDANCE_EDIT_WINDOW_EXPIRED`.
3. **Chống ghi đè đồng thời:** Bảng `event_attendances` có cột `@Version version`; nếu hai người quản lý cùng sửa một bản ghi với `expectedVersion` cũ hoặc giao dịch chồng lấn, hệ thống trả `409 ATTENDANCE_VERSION_CONFLICT` / `409 OPTIMISTIC_LOCK_CONFLICT` thay vì ghi đè âm thầm.

### 4.2. Kênh và Tập Người nhận Thông báo (`PB-33.1..PB-33.4`)
- **Kênh phát hành:** Chỉ sử dụng **thông báo nội bộ trong ứng dụng (`In-App Notification`)**; Email/Push nằm ngoài phạm vi release hiện tại.
- **Tập người nhận chuẩn xác & chống gửi trùng (`uq_notifications_user_event_key`):**
  - Theo CLB / Ban (`POST /api/v1/clubs/{clubId}/notifications`): chỉ gửi cho thành viên có `Membership == ACTIVE` (người `LEFT`/`SUSPENDED` không nhận).
  - Theo Sự kiện (`POST /api/v1/events/{eventId}/notifications`): gửi cho toàn bộ người có `event_registrations.status = 'REGISTERED'` tại sự kiện đó (**bao gồm cả `MEMBER` và `CTV`**, loại trừ người đã `CANCELLED`), gắn `referenceType = 'EVENT'`, `referenceId = eventId`.
  - Theo Nhiệm vụ (`POST /api/v1/tasks/{taskId}/notifications`): chỉ gửi cho `assignee` của task (và các `assignee` của subtask đang mở nếu chọn `includeSubtasks = true`), gắn `referenceType = 'TASK'`, `referenceId = taskId`; khi mở chi tiết task từ thông báo, backend vẫn kiểm tra lại quyền truy cập hiện tại.

---

## 5. `PB-61` — Định nghĩa Chỉ số Thống kê & Ngưỡng Đo tải Tham chiếu (`PB-36.1`, `PB-36.2`, `PB-48`)

### 5.1. Công thức Chỉ số Tổng quan Quản trị Hệ thống (`GET /api/v1/statistics/system`)
- Yêu cầu quyền `user.view` (`GLOBAL`).
- `totalUsers`, `activeUsers`, `lockedUsers`, `inactiveUsers`, `anonymizedUsers`: đếm trên tập khóa chính `users.id` phân biệt (`COUNT(u.id)`), tuyệt đối không nhân bản theo số lượng `memberships`.
- `totalClubs`, `activeClubs`, `inactiveClubs`: đếm trực tiếp trên bảng `clubs`.
- `roleBreakdown`: đếm số lượt gán vai trò đang hiệu lực (`user_roles.revoked_at IS NULL`) theo từng `role`. Không trả bất kỳ biến môi trường, khóa bí mật hay mật khẩu nào.

### 5.2. Công thức Chỉ số Hoạt động CLB (`GET /api/v1/clubs/{clubId}/statistics?from=...&to=...`)
- Yêu cầu quyền `club.view` hoặc `member.view` tại CLB đó. Khi truyền `[from, to]`, bộ lọc áp dụng nhất quán lên các sự kiện có `start_time` nằm trong khoảng `[from, to]`:
  - `uniqueParticipants`: `COUNT(DISTINCT r.user_id)` với `r.status = 'REGISTERED'` thuộc các sự kiện không bị hủy (`e.status <> 'CANCELLED'`).
  - `activeRegistrations`: tổng số bản ghi `r.status = 'REGISTERED'` thuộc sự kiện không bị hủy.
  - `cancelledRegistrations`: tổng số bản ghi `r.status = 'CANCELLED'` (tách riêng, không cộng vào tham gia).
  - `attendedCount`: tổng số bản ghi `event_attendances` có `status IN ('PRESENT', 'LATE')` thuộc các sự kiện không bị hủy (sự kiện `CANCELLED` hoặc người mới chỉ đăng ký chưa điểm danh tuyệt đối **không** được tính vào `attendedCount`).

### 5.3. Quy tắc Đánh giá Hiệu năng (`PB-48`)
- Đo trực tiếp trên các API tra cứu trọng tâm (`/api/v1/public/clubs`, `/api/v1/public/events`, `/api/v1/clubs/{clubId}/events`, `/api/v1/clubs/{clubId}/tasks`, `/api/v1/clubs/{clubId}/statistics`) với tải đồng thời `20` virtual users trên cơ sở dữ liệu PostgreSQL 16 có dữ liệu đại diện.
- Ngưỡng tham chiếu kỹ thuật nội bộ: `p95 < 300 ms`, `error rate = 0%`. Theo đúng `PB-61` AC03 & `PB-48` AC03, báo cáo ghi nhận số đo thực tế làm **kết quả đo tham khảo kỹ thuật trên môi trường thử nghiệm**, không gắn nhãn cam kết SLA hạ tầng thương mại.
