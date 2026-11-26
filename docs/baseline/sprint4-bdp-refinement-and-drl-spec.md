# Đặc Tả Cải Tiến Sprint 4 & Kiến Trúc Điểm Rèn Luyện Giai Đoạn 2 (`PB-84` .. `PB-93`)

- **Phiên bản tài liệu:** `1.0` — Chốt ngày `23/11/2026` (Trước khi triển khai code đợt cập nhật Sprint 4)
- **Căn cứ tổng hợp 3 nguồn khảo sát & phản hồi thực tế:**
  1. *Phiếu phỏng vấn thực địa CLB ARC & CLB VAC* (`17/11/2026` → `PB-76..PB-78`)
  2. *Báo cáo cuộc họp khách hàng Đoàn trường, Ban Điều phối & các CLB* (`20/11/2026` → `PB-84..PB-88`, `BUG-P3-12`)
  3. *Phiếu góp ý & phản hồi báo cáo dự án từ Đoàn Thanh niên (`Feedback BĐP.pdf`)* (`23/11/2026` → Tinh chỉnh `PB-69, PB-84, PB-87, PB-88` & bổ sung `PB-89..PB-93`)

---

## 1. Triết Lý Sản Phẩm & Mô Hình Phân Cấp 4 Tầng Tinh Gọn (`PB-84`, `PB-88`)

### 1.1. Định vị hệ thống
Theo thống nhất với Đoàn Thanh niên (ĐTN) và Ban Điều phối CLB (BĐP), **VJU ClubHub** được định vị là **Hệ thống Quản lý Hoạt động CLB & Sinh viên/CTV** (mang tính thực dụng, chuẩn mực tương tự Cổng Đào tạo đại học):
- **Trọng tâm 80%:** Thống kê hoạt động, theo dõi lịch trình/sự kiện, điểm danh minh chứng, báo cáo thành viên và truy vết trách nhiệm.
- **Tinh giản tối đa:** Lược bỏ các khối giới thiệu dàn trải, hộp tìm kiếm trùng lặp trên thanh tiêu đề hoặc các tầng phân quyền trung gian ít dùng trong thực tế.

### 1.2. Chuyển đổi từ Sơ đồ 5 tầng sang 4 tầng vận hành thực tế

| Tầng | Tên tầng vận hành | Quy mô tài khoản & Quyền hạn chuẩn | Nguyên tắc bảo mật & Dữ liệu |
| :---: | :--- | :--- | :--- |
| **Tầng 1** | **Quản trị Kỹ thuật Hệ thống** (`SYSTEM_ADMIN`) | 1–2 tài khoản kỹ thuật được Nhà trường/ĐTN giao nhiệm vụ. | Khởi tạo danh mục 13 đơn vị, cấu hình SMTP/hệ thống, tra cứu Audit toàn cục; không can thiệp duyệt đơn nội bộ CLB. |
| **Tầng 2** | **Đoàn Thanh niên (`DOANVJU` — Đơn vị thứ 13) & Ban Điều phối** | **2–3 tài khoản cá nhân `@st.vju.ac.vn`** (Chủ nhiệm Đoàn & Thường trực BĐP). | Quản trị trọn vẹn đơn vị `DOANVJU`, đăng sự kiện cấp trường, theo dõi Timeline Gantt 13 đơn vị, xem thống kê & hậu kiểm bảng điểm danh. |
| **Tầng 3** | **Ban Chủ nhiệm 12 Câu lạc bộ** (`CLUB_PRESIDENT` / `CLUB_VICE_PRESIDENT`) | **2–3 tài khoản cá nhân `@st.vju.ac.vn` / CLB** (Chủ nhiệm & Phó Chủ nhiệm). | Toàn quyền quản lý thành viên, mở tuyển quân, tổ chức sự kiện công khai/nội bộ, điểm danh QR, xuất báo cáo và kho tài liệu của đúng CLB mình. |
| **Tầng 4** | **Thành viên CLB, Cộng tác viên (CTV) & Sinh viên toàn trường** | Toàn bộ sinh viên đăng nhập SSO `@st.vju.ac.vn`. | Khám phá Portfolio 13 đơn vị, ứng tuyển CLB trên trang riêng, đăng ký sự kiện mở, quét QR điểm danh, cập nhật tiến độ việc được giao và đánh giá sự kiện. |

> **Lưu ý kỹ thuật về bảng `departments`:** Không xoá bảng `departments` khỏi PostgreSQL vì vẫn cần dùng để lưu danh sách **Các ban hoạt động** (phục vụ sinh viên chọn nguyện vọng ban khi ứng tuyển ở `PB-90` và gắn nhãn công việc). Tuy nhiên, trên giao diện cấp quyền chuẩn sẽ **ngưng sử dụng tầng quản trị trung gian Trưởng ban (`DEPARTMENT_HEAD`)** để gom đầu mối trách nhiệm về đúng 2–3 tài khoản BCN mỗi CLB.

### 1.3. Giải pháp Kiêm nhiệm đa đơn vị: 1 Tài khoản + Unit Context Switcher (`PB-84` AC04)
- **Quy tắc bắt buộc:** Mỗi cá nhân chỉ sử dụng **1 tài khoản `@st.vju.ac.vn` duy nhất** (không dùng 2 tài khoản rời và không dùng tài khoản tập thể chung mật khẩu).
- **Trải nghiệm chuyển đổi vị trí (kiểu Facebook Business Partner):**
  - Khi một sinh viên vừa giữ vai trò tại `DOANVJU` (VD: *Phó ban Thiết kế ĐTN*) vừa giữ vai trò tại một CLB (VD: *Phó Chủ nhiệm CLB VAC*), thanh công cụ quản lý hiển thị **Bộ chuyển đổi đơn vị làm việc (`UnitSwitcher`)** kèm nhãn chức vụ hiện tại ở từng đơn vị.
  - Chuyển đơn vị làm thay đổi tức thời ngữ cảnh dữ liệu (`activeClubId`), quyền thao tác (`canInClub`) và nhật ký kiểm toán (`club_id` trong `audit_logs`) mà không cần đăng xuất.

---

## 2. Đặc Tả Tinh Giản Giao Diện & Luồng Sinh Viên (`PB-87`, `PB-89`, `PB-90`)

### 2.1. Loại bỏ thanh tìm kiếm thừa & Xoá chồng chéo điều hướng (`PB-87`)
1. **Trên `Topbar.tsx`:** Gỡ bỏ hoàn toàn nút/hộp `Tìm trang...` (`QuickActionCenter`) vì thanh điều hướng bên trái (`SidebarNav.tsx`) đã phân nhóm tường minh.
2. **Tách rõ 2 mục sự kiện/lịch trên Sidebar:**
   - **`Sự kiện các CLB` (`/events`):** Cổng tra cứu danh sách sự kiện vắn tắt (Thời gian, Tên sự kiện, Đơn vị tổ chức, Địa điểm, Đối tượng, Thao tác) kèm **Dropdown lọc theo từng CLB (`Tất cả 13 đơn vị / CLB`)**.
   - **`Công việc & Lịch cá nhân` (`/schedule`):** Chỉ hiển thị các nhiệm vụ được giao cho cá nhân đang đăng nhập và lịch tổng hợp của riêng cá nhân đó (sự kiện đã đăng ký + hạn chót task + lịch phỏng vấn).
3. **Trang chủ (`/home`):** Giữ bố cục cô đọng gồm Hero (*"Tìm nơi bạn thuộc về"* — nút `"Ứng tuyển CLB"` có khối nền đặc nổi bật) và khu vực *"Khoảnh khắc đáng nhớ tại CLB VJU"*; người dùng đã đăng nhập có lối vào thẳng Bảng điều khiển thống kê & lịch trình.

### 2.2. Trang Portfolio CLB (`/clubs/[clubId]`) & Trang Ứng tuyển riêng (`/clubs/[clubId]/apply`)
- **Trang Portfolio CLB (`PB-89`):**
  - Trình bày gọn trên 1 màn hình: Ảnh bìa & Logo, Slogan/Mô tả súc tích, Danh sách đại diện Ban Chủ nhiệm, **Liên kết chính thức tới Fanpage Facebook / Mạng xã hội của đơn vị** (đồng bộ từ `club_facebook_pages`), nút CTA **`"Ứng tuyển CLB"`** có nền nổi bật và nút **`"← Quay lại Bảng điều khiển"`**.
- **Trang Ứng tuyển độc lập (`PB-90`):**
  - Thay thế hoàn toàn ngăn kéo hẹp `ClubRecruitmentDrawer.tsx` bằng trang riêng `/clubs/[clubId]/apply`:
    1. **Khối Đầu trang (Thông tin đợt tuyển & JD Phân ban):** Hiển thị tiêu đề, thời hạn đóng đơn, bài viết giới thiệu (Caption) của CLB và danh sách các **Tệp mô tả vị trí / công việc (JD)** từng phân ban để sinh viên tải/xem trực tiếp.
    2. **Khối Biểu mẫu Ứng tuyển:** Điền thông tin cá nhân, chọn nguyện vọng phân ban 1 & 2, trả lời bộ câu hỏi động của CLB và đính kèm CV/Portfolio.

---

## 3. Đặc Tả Gia Cố Truy Vết, 2FA, Khoá Sổ Điểm Danh & GANTT ĐTN (`PB-91`, `PB-92`)

### 3.1. Truy vết IP / Thiết bị, OTP 2FA & Khoá sổ điểm danh (`PB-91`)
- **Mở rộng bảng `audit_logs` (Flyway Migration mới):**
  ```sql
  ALTER TABLE audit_logs
      ADD COLUMN IF NOT EXISTS ip_address VARCHAR(64),
      ADD COLUMN IF NOT EXISTS user_agent VARCHAR(512);
  ```
  - Trích xuất IP thực qua `HttpServletRequest` (tôn trọng `X-Forwarded-For` từ loopback Nginx đã cấu hình `forward-headers-strategy=native`).
- **Xác thực 2 yếu tố (OTP 2FA) cho tài khoản quản trị (Tầng 1–3):**
  - Khi tài khoản có role quản trị (`SYSTEM_ADMIN`, `CLUB_PRESIDENT`, `CLUB_VICE_PRESIDENT` tại 12 CLB hoặc ĐTN) đăng nhập hoặc thực hiện thao tác trọng yếu (chốt khoá sổ điểm danh / thay đổi phân quyền), hệ thống hỗ trợ yêu cầu xác nhận mã OTP 6 chữ số qua email `@st.vju.ac.vn` (tận dụng hạ tầng `OtpMailService` sẵn có ở `V33`).
- **Khoá sổ xác nhận điện tử (`Digital Sign-off SHA-256`):**
  - Khi sự kiện kết thúc, BCN/ĐTN bấm **"Chốt & Ký xác nhận bảng điểm danh"**: hệ thống tính mã băm `SHA-256` trên danh sách `(userId, studentCode, status, checkedAt)` đã sắp xếp chuẩn tắc, lưu `attendance_locked_at`, `attendance_locked_by`, `attendance_signature_sha256` và in mã xác thực này lên chân trang báo cáo PDF/Excel xuất ra.

### 3.2. Thống kê tham gia, Biểu đồ GANTT Sự kiện 13 đơn vị & Khảo sát sau sự kiện (`PB-92`)
- **Chế độ xem GANTT / Timeline Sự kiện cho ĐTN:** Hiển thị trục thời gian ngang theo tuần/tháng của học kỳ, mỗi dòng là một đơn vị (`DOANVJU` + 12 CLB), mỗi thanh ngang là một sự kiện (`startTime` → `endTime`, màu sắc theo trạng thái *Dự kiến / Đang mở ĐK / Đã hoàn thành*) giúp ĐTN phát hiện ngay các sự kiện trùng khung giờ hoặc hội trường.
- **Khảo sát mức độ hài lòng sau sự kiện:** Bảng gọn `event_feedbacks (id, event_id, user_id, rating INT CHECK 1..5, comment VARCHAR(1000), created_at, UNIQUE(event_id, user_id))` — chỉ mở cho người có bản ghi điểm danh `PRESENT` hoặc `LATE`.

---

## 4. Định Hướng Kiến Trúc Điểm Rèn Luyện (ĐRL) Giai Đoạn 2 — Tham Khảo NEU & FTU (`PB-93`)

| Thành phần | Mô hình tham chiếu (NEU / FTU) | Thiết kế chuẩn bị sẵn trên VJU ClubHub |
| :--- | :--- | :--- |
| **Đơn vị thời gian chuẩn** | Quản lý điểm theo từng Học kỳ (`2026-1`, `2026-2`). | Chuẩn hoá cột `academic_term VARCHAR(16)` trên bảng `events` (tự động suy ra từ `start_time` hoặc chọn học kỳ). |
| **Phân nhóm tiêu chí cộng điểm** | Tách điểm **Tham dự sự kiện**, **Thành viên BTC / CTV hoàn thành nhiệm vụ**, và **Cán bộ Đoàn / BCN CLB xuất sắc**. | Hệ thống đã tách sẵn: `event_attendances` (`PRESENT` qua QR) + `event_registrations.participant_type / event_role` + `tasks` (`VERIFIED`) + `user_roles`. |
| **Quy trình đối soát minh chứng** | Không nộp ảnh chụp thủ công; trích xuất tự động theo Mã sinh viên (`MSSV`) có xác nhận của CLB & Đoàn Trường. | Xuất báo cáo tổng hợp hoạt động học kỳ theo `student_code` kèm mã khoá sổ `SHA-256` (`PB-91`) để kết nối trực tiếp vào phân hệ chấm ĐRL ở Giai đoạn 2. |
