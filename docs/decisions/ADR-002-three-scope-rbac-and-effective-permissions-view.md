# ADR-002: Mô hình RBAC 3 phạm vi (`GLOBAL > CLUB > DEPARTMENT`), View `effective_user_permissions` và ranh giới `Actor`

## Status
Accepted

## Date
2026-10-29 (mở rộng ủy quyền cấp CLB tại `V26` ngày `2026-11-15`)

## Context
Tổ chức CLB tại Trường Đại học Việt Nhật có cấu trúc phân cấp thực tế 3 tầng: Quản trị viên toàn trường (`GLOBAL`), Ban Chủ nhiệm từng CLB (`CLUB`) và Trưởng các ban chuyên môn thuộc từng CLB (`DEPARTMENT` — ví dụ Ban Truyền thông, Ban Chuyên môn, Ban Hậu cần). Ngoài ra:
- Người dùng có thể vừa giữ vai trò (`roles`), vừa được cấp quyền lẻ trực tiếp (`user_permissions`), ở nhiều CLB khác nhau cùng lúc.
- Khi thành viên bị tạm đình chỉ tư cách (`memberships.status = 'SUSPENDED'`), toàn bộ quyền cấp CLB và cấp Ban tại CLB đó phải tự động tạm ngưng mà không làm mất lịch sử gán vai trò, và không ảnh hưởng quyền của người đó tại một CLB khác mà họ vẫn `ACTIVE`.
- Tầng nghiệp vụ (`service/impl`) cần kiểm thử đơn vị nhanh mà không phải khởi tạo `SecurityContext` phức tạp của Spring Security.

## Decision
1. **Phân cấp 3 phạm vi kế thừa một chiều (`DEPARTMENT < CLUB < GLOBAL`):**
   - Ràng buộc bằng trigger PostgreSQL (`trg_user_permissions_grant_scope`, `trg_user_roles_grant_scope`, `trg_role_permissions_scope`): một quyền có thể được cấp ở đúng phạm vi mặc định của nó hoặc rộng hơn, nhưng không bao giờ được cấp hẹp hơn (`400 PERMISSION_SCOPE_MISMATCH`).
   - Tại `V26__club_permissions_and_document_module.sql`, mở phạm vi `CLUB` cho nhóm quyền ủy quyền nội bộ (`permission.view/assign/revoke`, `role.view`) và phạm vi `DEPARTMENT` cho quyền điều hành tài liệu/sự kiện/chat để Chủ nhiệm và Trưởng ban tự vận hành trong đúng ranh giới đơn vị mình.
2. **Tập trung hóa tính toán quyền qua SQL View `effective_user_permissions` (`V5`, `V20`):**
   - Hợp nhất cả quyền cấp trực tiếp (`DIRECT`) lẫn quyền từ vai trò đang hoạt động (`ROLE`), đồng thời tự động loại trừ mọi quyền cấp `CLUB`/`DEPARTMENT` tại CLB mà người dùng đang ở trạng thái membership `SUSPENDED` hoặc `LEFT`.
3. **Tách `Actor` khỏi Spring Security & Kiểm tra quyền khai báo (`@RequirePermission`):**
   - Controller giải mã người gọi thành record bất biến `Actor` qua `ActorArgumentResolver` và truyền tường minh vào tầng Service.
   - Sử dụng `@RequirePermission(value = "...", clubId = "...", departmentId = "...")` kết hợp `RequirePermissionAspect` và kiểm định tĩnh bằng `RequirePermissionUsageTest`.

## Alternatives Considered

### Dùng Spring Security `@PreAuthorize("hasRole(...)")` mặc định
- **Ưu điểm:** Có sẵn trong Spring Security.
- **Nhược điểm:** `hasRole` phẳng không biểu diễn tự nhiên được ngữ cảnh đa CLB/đa Ban trên từng tham số `clubId`/`departmentId`, buộc mọi unit test của Service phải dựng `SecurityContextHolder`.
- **Lý do loại bỏ:** Khó bảo trì và dễ sót điều kiện đình chỉ theo từng CLB (`SUSPENDED`).

### Tính toán hợp quyền bằng vòng lặp Java trong bộ nhớ
- **Ưu điểm:** Không phụ thuộc SQL view.
- **Nhược điểm:** Dễ lệch logic giữa luồng kiểm tra quyền (`PermissionAuthorizationService`) và luồng hiển thị quyền hiệu lực cho UI (`GET /api/v1/users/me/effective-permissions`).
- **Lý do loại bỏ:** Một SQL view duy nhất đảm bảo Backend và Frontend luôn nhìn thấy cùng một tập quyền hiệu lực.

## Consequences
- Mọi thay đổi trạng thái membership (`SUSPENDED`, `LEFT`) hoặc thu hồi vai trò có hiệu lực tức thì trên toàn hệ thống mà không cần xóa cache thủ công phức tạp.
- **Lưu ý quan trọng (Gotchas) khi viết Service:**
  1. **AOP Self-Invocation:** `@RequirePermission` chạy qua Spring AOP proxy, nên **không kích hoạt** nếu phương thức A gọi nội bộ `this.methodB()` trong cùng một class. Trường hợp đó hoặc khi phải truy vấn entity từ DB rồi mới biết `clubId`/`departmentId`, bắt buộc gọi trực tiếp `permissionAuthorizationService.require(actor, ...)`.
  2. **Kiểm tra tên tham số:** Mọi chuỗi `clubId` / `departmentId` khai báo trong `@RequirePermission` được `RequirePermissionUsageTest` đối chiếu với tên tham số method lúc chạy test — đổi tên tham số method mà quên cập nhật annotation sẽ làm trượt test ngay lập tức.
