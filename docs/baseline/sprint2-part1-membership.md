# Báo cáo Bàn giao Sprint 2 (Phần 1/3) — Thành viên, Phân ban & Vòng đời Membership

- **Dự án:** `club-basic-vju` — Hệ thống Quản lý Câu lạc bộ Trường Đại học Việt Nhật
- **Giai đoạn:** Sprint 2 (Part 1/3)
- **Người phụ trách:** **Đoàn Kinh Quốc** (Backend Dev & Database)
- **Mã PR:** PR 1 (`feat/sprint2-membership-and-departments`)
- **Đối chiếu Backlog:** `PB-11`, `PB-16.2`, `PB-16.3`, `PB-17.2`, `PB-17.3`, `PB-35.1`
- **Tiêu chí DoD liên quan:** `DoD-P2-06`, `DoD-P2-07`, `DoD-P2-08`, `DoD-P2-11`

---

## 1. Danh mục User Story & Acceptance Criteria thực thi

### 1.1. `PB-11` (3 SP) — Khám phá & Lọc CLB theo lĩnh vực
- **API:**
  - `GET /api/v1/public/clubs`: Tìm kiếm theo từ khóa (`query`), lọc theo lĩnh vực (`category`), phân trang (`offset`, `limit`).
  - `GET /api/v1/public/clubs/categories`: Danh mục lĩnh vực thực tế từ các CLB đang hoạt động (`ACTIVE`).
- **Acceptance Criteria:**
  - `TC-PB-11-01`: Danh mục hiển thị các CLB được phép khám phá, có phân trang.
  - `TC-PB-11-02`: Tìm theo tên/mã kết hợp lọc lĩnh vực trả đúng tập dữ liệu.
  - `TC-PB-11-03`: Không khớp kết quả trả danh sách rỗng, không lỗi.
  - `TC-PB-11-04`: CLB `INACTIVE` hoặc bị ẩn không bao giờ bị lộ ra ngoài.

### 1.2. `PB-16.2` (3 SP) — Tạm ngưng (`SUSPENDED`) hoặc khôi phục (`ACTIVE`) Membership
- **API:** `PATCH /api/v1/memberships/{id}` (`{"status": "SUSPENDED" | "ACTIVE"}`)
- **Acceptance Criteria:**
  - `TC-PB-16.2-01`: Chuyển trạng thái theo ma trận chuyển tiếp hợp lệ (`ACTIVE <-> SUSPENDED`).
  - `TC-PB-16.2-02`: Khi `SUSPENDED`, view `effective_user_permissions` tự động loại bỏ mọi quyền cấp `CLUB` và `DEPARTMENT` của thành viên tại CLB đó.
  - `TC-PB-16.2-03`: Khôi phục `ACTIVE` yêu cầu cả CLB và tài khoản User phải đang `ACTIVE` (nếu không trả `409 CLUB_INACTIVE` / `409 USER_INACTIVE`).
  - `TC-PB-16.2-04`: Ghi nhật ký kiểm toán bất biến `MEMBER_STATUS_CHANGED`.

### 1.3. `PB-16.3` (3 SP) — Rời CLB (`LEFT`) & Bảo toàn lịch sử
- **API:** `DELETE /api/v1/memberships/{id}` hoặc `PATCH /api/v1/memberships/{id}` (`{"status": "LEFT"}`)
- **Acceptance Criteria:**
  - `TC-PB-16.3-01`: Đặt trạng thái `LEFT`, lưu thời điểm `left_at = now()`.
  - `TC-PB-16.3-02`: Tự động xóa sạch phân công ban chuyên môn trong `department_members`.
  - `TC-PB-16.3-03`: Tự động thu hồi mọi vai trò và quyền hạn cấp CLB/ban (`user_roles`, `user_permissions`).
  - `TC-PB-16.3-04`: Cấm sửa bản ghi cũ đã `LEFT` trở lại `ACTIVE` (`409 MEMBERSHIP_ALREADY_LEFT`). Khi tham gia lại sẽ tạo bản ghi mới để bảo toàn dòng lịch sử cũ.

### 1.4. `PB-17.2` (3 SP) — Chuyển thành viên giữa 2 ban cùng CLB
- **API:** `PATCH /api/v1/departments/{departmentId}/members/{membershipId}` (`{"targetDepartmentId": "..."}`)
- **Acceptance Criteria:**
  - `TC-PB-17.2-01`: Ban nguồn và ban đích phải cùng thuộc một CLB; ban đích phải đang `ACTIVE`.
  - `TC-PB-17.2-02`: Người thực hiện phải có quyền kép `department.member.remove` tại ban nguồn và `department.member.add` tại ban đích.
  - `TC-PB-17.2-03`: Chuyển ban nguyên tử trong transaction: tự động thu hồi vai trò Trưởng ban/quyền theo ban cũ và gán vào ban mới.
  - `TC-PB-17.2-04`: Chặn chuyển sang ban thuộc CLB khác (`400 CROSS_CLUB_MOVE`) hoặc chuyển sang chính ban hiện tại (`400 SAME_DEPARTMENT`).

### 1.5. `PB-17.3` (2 SP) — Gỡ thành viên khỏi ban chuyên môn
- **API:** `DELETE /api/v1/departments/{departmentId}/members/{membershipId}`
- **Acceptance Criteria:**
  - `TC-PB-17.3-01`: Chỉ người có quyền `department.member.remove` tại đúng ban mới được gỡ.
  - `TC-PB-17.3-02`: Tư cách thành viên CLB (`Membership ACTIVE`) và liên kết các ban khác được giữ nguyên vẹn.
  - `TC-PB-17.3-03`: Quyền riêng của ban cũ được thu hồi; ghi `audit_logs` hành động `DEPARTMENT_MEMBER_REMOVED`.

### 1.6. `PB-35.1` (3 SP) — Lịch sử tham gia CLB cá nhân
- **API:** `GET /api/v1/users/me/memberships` (hỗ trợ lọc `status`, phân trang `offset`, `limit`)
- **Acceptance Criteria:**
  - `TC-PB-35.1-01`: Trả về danh sách CLB của chính tài khoản đăng nhập (lấy `userId` từ JWT).
  - `TC-PB-35.1-02`: Sắp xếp theo `joined_at desc`, hiển thị đầy đủ các ban trực thuộc.
  - `TC-PB-35.1-03`: Hiển thị cả các bản ghi lịch sử đã rời CLB (`LEFT` kèm `left_at`).
  - `TC-PB-35.1-04`: Không nhân đôi bản ghi do join nhiều ban; hỗ trợ lọc chính xác theo `status`.

---

## 2. Kiểm thử Tích hợp Tự động

- **Lớp kiểm thử:** `SprintTwoMembershipAcceptanceTest.java` (`backend/springboot/src/test/java/com/vju/club/integration/SprintTwoMembershipAcceptanceTest.java`)
- **Phương thức kiểm thử đối ứng:**
  1. `testPublicClubDiscoveryAndCategoryFilter()`: Kiểm chứng `PB-11` (AC01..04).
  2. `testMembershipSuspensionAndRestoration()`: Kiểm chứng `PB-16.2` (AC01..04).
  3. `testMemberLeavesClub()`: Kiểm chứng `PB-16.3` (AC01..04).
  4. `testMoveDepartmentMember()`: Kiểm chứng `PB-17.2` (AC01..04).
  5. `testRemoveMemberFromDepartment()`: Kiểm chứng `PB-17.3` (AC01..03).
  6. `testPersonalMembershipHistory()`: Kiểm chứng `PB-35.1` (AC01..04).
- **Hợp đồng OpenAPI:** `ContractDocumentsTest` pass 3/3.
