# Quyết định Nghiệp vụ Giai đoạn 2 (Sprint 2) — Product Owner (`PB-55`, `PB-56`)

- **Dự án:** Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật (`club-basic-vju`)
- **Giai đoạn:** Phase 2 / Sprint 2 (Tuyển thành viên, Vòng đời Membership, Phân ban & Thông báo)
- **Người chốt quyết định:** Nguyễn Xuân Phát (Product Owner) & Hà Lê Ngọc Thắng (Tester/BA)
- **Ngày xác nhận:** `2026-11-01`
- **Tiêu chí nghiệm thu liên quan:** `DoD-P2-01`, `TC-PB-55-01..03`, `TC-PB-56-01..03`

---

## 1. `PB-55` — Quy tắc Vòng đời Thành viên CLB & Phân ban Chuyên môn

### 1.1. Ma trận chuyển trạng thái Membership (`MembershipStatus`)

| Trạng thái hiện tại | Đích hợp lệ | API thực hiện | Quyền yêu cầu | Hệ quả dữ liệu & phân quyền |
|---|---|---|---|---|
| *(Chưa có bản ghi chưa kết thúc)* | `ACTIVE` | `POST /api/v1/clubs/{clubId}/memberships` hoặc `POST /api/v1/clubs/{clubId}/applications/{id}/approve` | `member.add` hoặc `application.approve \| application.review` | Tạo bản ghi `memberships` mới (`joined_at = now()`, `left_at = null`); tự động gán vai trò `granted_on_join` (`CLUB_MEMBER`); kiểm tra `Club == ACTIVE`, `User == ACTIVE`, `maxActiveClubs`, và không tồn tại đơn `PENDING` xung đột khi thêm trực tiếp. |
| `ACTIVE` | `SUSPENDED` | `PATCH /api/v1/memberships/{membershipId}` (`{"status":"SUSPENDED"}`) | `member.update` (scope `CLUB`/`GLOBAL`) | Thu hồi vai trò `granted_on_join`; giữ nguyên bản ghi `department_members` để bảo toàn cơ cấu ban khi khôi phục, nhưng **tạm ngưng toàn bộ quyền hiệu lực cấp `CLUB` và `DEPARTMENT` tại CLB đó** thông qua view `effective_user_permissions` (`V20`). |
| `SUSPENDED` | `ACTIVE` | `PATCH /api/v1/memberships/{membershipId}` (`{"status":"ACTIVE"}`) | `member.update` (scope `CLUB`/`GLOBAL`) | Yêu cầu `Club == ACTIVE` và `User == ACTIVE` (nếu vi phạm trả `409 CLUB_INACTIVE` / `409 USER_INACTIVE`); khôi phục vai trò `granted_on_join` và hiệu lực quyền trong CLB. |
| `ACTIVE` hoặc `SUSPENDED` | `LEFT` | `DELETE /api/v1/memberships/{membershipId}` hoặc `PATCH /api/v1/memberships/{membershipId}` (`{"status":"LEFT"}`) | `member.remove` (khi đi qua `PATCH` cần đồng thời `member.update` + `member.remove`) | Đặt `left_at = now()`; xóa toàn bộ `department_members` thuộc membership này; thu hồi mọi `user_roles` và `user_permissions` cấp `CLUB` và `DEPARTMENT` của user trong CLB đó; ghi `audit_logs` bất biến. |
| `LEFT` | `ACTIVE` / `SUSPENDED` | *(Không cho phép sửa bản ghi cũ)* | — | Trả `409 MEMBERSHIP_ALREADY_LEFT`. Muốn tham gia lại phải nộp đơn mới hoặc được thêm mới tạo **bản ghi `memberships` mới** (bảo toàn lịch sử tham gia theo `uq_memberships_user_club_current`). |
| Bất kỳ | Trùng trạng thái hiện tại hoặc `INACTIVE` | `PATCH /api/v1/memberships/{membershipId}` | — | Trả `409 INVALID_MEMBERSHIP_STATUS_TRANSITION`. Trạng thái vận hành chính thức chỉ dùng `ACTIVE`, `SUSPENDED`, `LEFT`. |

### 1.2. Quy tắc Tạm đình chỉ (`SUSPENDED`) đối với Quản trị & Phân ban

1. **Đình chỉ hiệu lực quyền tức thời:** Khi membership ở trạng thái `SUSPENDED`, view `effective_user_permissions` (`V20__sprint2_membership_application_notification_hardening.sql`) loại bỏ mọi quyền từ `user_permissions` và `user_roles` có `scope IN ('CLUB', 'DEPARTMENT')` thuộc CLB đó. Quyền `GLOBAL` (như `SYSTEM_ADMIN`) không bị ảnh hưởng.
2. **Chặn cấp quyền/chức danh mới:** Không thể gán vai trò CLB/ban, chức danh lãnh đạo, quyền trực tiếp CLB/ban, hoặc thêm/chuyển ban cho thành viên đang `SUSPENDED` (`409 MEMBERSHIP_NOT_ACTIVE`).
3. **Ẩn khỏi cơ cấu lãnh đạo hiệu lực:** `UserRoleRepository.findActiveLeadershipInClub` loại bỏ các thành viên `SUSPENDED` khỏi danh sách người giữ chức vụ đang hoạt động.

### 1.3. Quy tắc Chuyển ban (`PB-17.2`) & Gỡ khỏi ban (`PB-17.3`)

1. **Điều kiện tiên quyết:** Thành viên phải có `Membership == ACTIVE` tại CLB chứa ban (`409 MEMBERSHIP_NOT_ACTIVE`), ban đích phải `ACTIVE` và thuộc **cùng CLB** với ban nguồn (`400 CROSS_CLUB_MOVE`), ban đích khác ban nguồn (`400 SAME_DEPARTMENT`), và thành viên chưa thuộc ban đích (`409 DEPARTMENT_MEMBER_ALREADY_EXISTS`).
2. **Phân quyền:**
   - Gỡ khỏi ban (`DELETE /api/v1/departments/{departmentId}/members/{membershipId}`): yêu cầu `department.member.remove` tại ban nguồn (hoặc cấp `CLUB`/`GLOBAL`).
   - Chuyển ban (`PATCH /api/v1/departments/{departmentId}/members/{membershipId}`): yêu cầu đồng thời `department.member.remove` tại ban nguồn **và** `department.member.add` tại ban đích.
3. **Thu hồi quyền theo ban cũ:** Khi gỡ khỏi ban hoặc chuyển từ ban A sang ban B, hệ thống tự động thu hồi toàn bộ `user_roles` (ví dụ `DEPARTMENT_HEAD`) và `user_permissions` có `scope = 'DEPARTMENT'` tại ban A của thành viên đó, đồng thời ghi `permission_audit_logs` và `audit_logs`. Tư cách `Membership` cấp CLB của thành viên được giữ nguyên.

### 1.4. Ví dụ minh họa `PB-55`

- **Ví dụ 1 (Tạm đình chỉ Trưởng ban):** Sinh viên B đang là `ACTIVE` và giữ vai trò `DEPARTMENT_HEAD` tại Ban Truyền thông. Chủ nhiệm gọi `PATCH /memberships/{id}` sang `SUSPENDED` → B lập tức nhận `403 PERMISSION_DENIED` khi thử thêm người vào Ban Truyền thông. Khi Chủ nhiệm khôi phục `ACTIVE`, B hoạt động trở lại bình thường.
- **Ví dụ 2 (Chuyển ban):** Thành viên C (kiêm Trưởng ban Truyền thông) được chuyển sang Ban Hậu cần qua `PATCH /departments/{truyenThongId}/members/{membershipId}` → C rời Ban Truyền thông, gia nhập Ban Hậu cần, và vai trò `DEPARTMENT_HEAD` tại Ban Truyền thông tự động bị thu hồi (`revoked_at != null`).
- **Ví dụ 3 (Rời CLB và gia nhập lại):** Thành viên D rời CLB (`LEFT`, `left_at` được ghi nhận). Sau đó D nộp đơn tuyển mới và được `APPROVED` → tạo bản ghi `memberships` mới (`ACTIVE`), trang `/memberships` hiển thị đầy đủ cả dòng lịch sử `LEFT` trước đó và dòng `ACTIVE` hiện tại.

---

## 2. `PB-56` — Quy tắc Tuyển Thành viên, Xét duyệt, Giới hạn & Bảo mật Ghi chú

### 2.1. Luồng trạng thái Đơn đăng ký (`ClubApplicationStatus`)

- **4 trạng thái chuẩn (không có bước phỏng vấn riêng trên hệ thống ở Phase 2):**
  - `PENDING` → `APPROVED` (qua `POST /api/v1/clubs/{clubId}/applications/{id}/approve`)
  - `PENDING` → `REJECTED` (qua `POST /api/v1/clubs/{clubId}/applications/{id}/reject`, hoặc tự động khi CLB bị chuyển sang `INACTIVE`)
  - `PENDING` → `CANCELLED` (qua `PATCH /api/v1/users/me/applications/{id}/cancel` bởi chính chủ đơn)
- **Tính bất biến của trạng thái cuối:** `APPROVED`, `REJECTED`, `CANCELLED` là các trạng thái kết thúc; mọi thao tác duyệt lại / từ chối lại trả `409 APPLICATION_ALREADY_REVIEWED`, hủy lại trả `409 APPLICATION_CANNOT_BE_CANCELLED`.
- **Chống lách luồng xét duyệt qua API cập nhật:** `PUT /api/v1/clubs/{clubId}/applications/{id}` chỉ cho phép cập nhật thông tin hồ sơ và ghi chú; mọi request truyền `status` khác trạng thái hiện tại bị chặn với `409 APPLICATION_STATUS_TRANSITION_NOT_ALLOWED`.
- **Cấm xóa cứng (No Hard Delete):** Các endpoint xóa cứng đơn đăng ký đã bị loại bỏ hoàn toàn trên cả Backend, OpenAPI và Frontend nhằm bảo toàn lịch sử xét duyệt/audit và ngăn sinh viên xóa đơn `REJECTED` để lách thời gian chờ nộp lại (`reapplyCooldownDays`).

### 2.2. Cấu hình Giới hạn Hệ thống (`/api/v1/system-settings` — `V19`)

| Tham số | Giá trị mặc định (`V19`) | Phạm vi cấu hình | Quy tắc áp dụng |
|---|---:|---|---|
| `maxPendingApplications` | `3` | `0..100` (`0` = không giới hạn) | Số đơn `PENDING` tối đa của một sinh viên trên toàn hệ thống tại cùng một thời điểm. Vượt ngưỡng trả `409 APPLICATION_PENDING_LIMIT`. |
| `reapplyCooldownDays` | `7` | `0..365` (`0` = nộp lại ngay) | Số ngày phải chờ tính từ `reviewedAt` của đơn **`REJECTED`** gần nhất tại cùng CLB trước khi sinh viên tự nộp lại (`409 APPLICATION_REAPPLY_TOO_SOON`). Đơn **`CANCELLED`** hoặc cựu thành viên **`LEFT`** được nộp lại ngay lập tức (không chịu cooldown). |
| `maxActiveClubs` | `0` | `0..100` (`0` = không giới hạn) | Số CLB tối đa mà một sinh viên có membership chưa kết thúc (`ACTIVE`/`SUSPENDED`). Kiểm tra ở cả lúc nộp đơn, lúc duyệt đơn `approve`, và lúc thêm thành viên trực tiếp (`409 MEMBERSHIP_LIMIT_REACHED`). |

> [!NOTE]
> Khi quản lý CLB tạo hồ sơ đơn hộ ứng viên (`applicantId` khác người gọi), bắt buộc phải có quyền `application.create` tại CLB đó (`403 PERMISSION_DENIED` nếu chỉ là thành viên thường).

### 2.3. Tách biệt Ghi chú Phản hồi (`reviewNote`) và Ghi chú Nội bộ (`internalNote`)

1. **`reviewNote` (`VARCHAR(1000)`):** Phản hồi chính thức gửi cho ứng viên. Ứng viên xem được trên màn hình `/applications` và trong thông báo kết quả xét duyệt. Khi duyệt đơn (`APPROVED`), `reviewNote` là tùy chọn (có thể để trống).
2. **`internalNote` (`VARCHAR(1000)`, bổ sung tại `V20`):** Ghi chú đánh giá nội bộ chỉ dành cho người có quyền xem/duyệt đơn của CLB (`GET /api/v1/clubs/{clubId}/applications`, `GET /api/v1/clubs/{clubId}/applications/{id}`).
3. **Bảo vệ quyền riêng tư tuyệt đối:** Mọi API phía ứng viên (`POST /clubs/{clubId}/applications`, `GET /users/me/applications/{id}`, `PUT /users/me/applications/{id}`, `PATCH /users/me/applications/{id}/cancel`) luôn ẩn `internalNote = null` và `reviewedBy = null`.

### 2.4. Phân ban khi Duyệt đơn (`skipDepartmentAssignment`)

- Khi reviewer chọn một ban chuyên môn cụ thể (`departmentId` hợp lệ, đang `ACTIVE` và thuộc đúng CLB): ứng viên được tạo `Membership ACTIVE` **và** xếp vào `department_members` trong cùng một transaction.
- Khi reviewer chủ động chọn **"Chưa phân ban (vào CLB chung)"** (`skipDepartmentAssignment = true` và `departmentId = null`): hệ thống chỉ tạo `Membership ACTIVE` mà **không** tự động lấy `preferredDepartmentId` của ứng viên.
- Khi `skipDepartmentAssignment` không bật (`false`/`null`) và không truyền `departmentId`: nếu đơn có nguyện vọng 1 (`preferredDepartmentId`) đang `ACTIVE`, hệ thống tự động xếp vào ban nguyện vọng 1.

### 2.5. Độ tin cậy Thông báo Kết quả (`PB-34.1`, `PB-34.2`, `PB-46`)

- Duyệt đơn (`APPROVED`), từ chối đơn (`REJECTED`), hoặc vô hiệu hóa CLB làm tự động từ chối các đơn `PENDING` đều sinh thông báo in-app gắn `referenceType = 'CLUB_APPLICATION'`, `referenceId = application.id`, và khóa chống trùng `eventKey = 'CLUB_APPLICATION:' || application.id || ':' || status`.
- Partial unique index `uq_notifications_user_event_key (user_id, event_key)` kết hợp kiểm tra idempotent đảm bảo mỗi sự kiện kết quả đơn chỉ gửi **đúng 1 thông báo duy nhất** cho đúng ứng viên, kể cả khi retry hoặc có xung đột đồng thời; nếu transaction duyệt đơn bị rollback thì thông báo cũng rollback hoàn toàn.

