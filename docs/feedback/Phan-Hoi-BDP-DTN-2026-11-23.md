# Tổng Hợp Phản Hồi Ban Điều Phối & Đoàn Thanh Niên (23/11/2026) — Truy Vết Product Backlog (`PB-84` .. `PB-93`)

> **Nguồn tài liệu gốc:** [Feedback-BDP-2026-11-23.pdf](./Feedback-BDP-2026-11-23.pdf) *(bản sao lưu từ `Feedback BĐP.pdf`)*
> **Bản Word hành chính lưu trên Google Drive:** [Bao-Cao-Tiep-Nhan-Va-Phan-Tich-Feedback-BDP-2026-11-23.docx](./Bao-Cao-Tiep-Nhan-Va-Phan-Tich-Feedback-BDP-2026-11-23.docx)
> **Đặc tả kỹ thuật triển khai chi tiết:** [sprint4-bdp-refinement-and-drl-spec.md](../baseline/sprint4-bdp-refinement-and-drl-spec.md)
> **Ngày phản hồi:** Hà Nội, ngày 23 tháng 11 năm 2026
> **Trạng thái đồng bộ Backlog:** Đã ánh xạ đầy đủ vào `Product Backlog - Sprint 3.xlsx` (`136 PBI` / `522 TC-PB-*` / `Impediment Row 15`)

---

## 1. Thông Tin Đoàn Phản Hồi & Định Hướng Cốt Lõi

### 1.1. Đại diện phản hồi (Đoàn Thanh niên — ĐTN Trường ĐH Việt Nhật)

| Họ và tên | Chức vụ / Đơn vị |
| :--- | :--- |
| **Lê Văn Thái An** | Trưởng Ban Sự kiện (BSK), Đoàn Thanh niên (ĐTN) |
| **Mỗ Bùi Hải Yến** | Trưởng Ban Truyền thông (BTT), Đoàn Thanh niên (ĐTN) |
| **Lê Thế Hùng** | Phó Ban Thiết kế, Đoàn Thanh niên (ĐTN) |

### 1.2. Kết luận định hướng xuyên suốt của ĐTN / BĐP
> *"Trang web này nên hướng đến mục tiêu chính là một **hệ thống quản lý hoạt động CLB và CLB với sinh viên/CTV**. Các chức năng chính của nó chủ yếu là **thống kê, theo dõi, báo cáo và kiểm tra hoạt động thành viên**, còn các chức năng phụ khác nên **tinh giản tối đa**."*

---

## 2. Lưu Trữ Nguyên Văn Phản Hồi Theo Từng Mục

### 2.1. Góp ý theo các mục trong Báo cáo ngày 22/11/2026

| Mục báo cáo | Nội dung trình bày trong báo cáo | Góp ý chi tiết từ BĐP / ĐTN | Mã PBI truy vết |
| :--- | :--- | :--- | :---: |
| **Mục I**<br>Mục tiêu & Định hướng sau họp 20/11 | • Đưa Đoàn Thanh niên vào hệ thống như Câu lạc bộ thứ 13<br>• Phân tách giai đoạn ưu tiên ngay và giai đoạn mở rộng sau học kỳ | • Ở **Giai đoạn 2**, mọi người cố gắng chuẩn bị hạ tầng để xây dựng **hệ thống tính Điểm Rèn Luyện (ĐRL) mới** hướng tới thực chất, hiệu quả hơn *(Tham khảo hệ thống ĐRL của **NEU** và **FTU**)*. | **`PB-84`**<br>**`PB-93`** |
| **Mục II**<br>Sơ đồ phân cấp 5 tầng & quyền hạn | • Tầng 1: Kỹ thuật · Tầng 2: Đoàn & Ban Điều phối CLB<br>• Tầng 3: BCN 12 CLB · Tầng 4: Trưởng các ban hoạt động<br>• Tầng 5: Thành viên CLB & SV/CTV ngoài CLB | • Có thể **bỏ Tầng số 4 (Trưởng ban hoạt động trong CLB)** mà chỉ cấp cho **mỗi CLB, ĐTN (2–3 acc/đơn vị)**.<br>• Có **truy vết chỉnh sửa, IP thiết bị, chữ ký số và xác thực 2 yếu tố (2FA)** để ngăn chặn tự ý sửa đổi. | **`PB-84`** *(sửa)*<br>**`PB-88`** *(sửa)*<br>**`PB-91`** *(mới)* |
| **Mục III**<br>Luồng thực hiện của Sinh viên | • Nhánh A: Tham gia sự kiện mở (không cần vào CLB), quét QR, nhận việc<br>• Nhánh B: Ứng tuyển vào CLB, theo dõi trên Hồ sơ cá nhân | • **Phần Khám phá CLB:** chỉ cần trình bày thật ngắn gọn, súc tích, giới thiệu CLB như **1 trang giới thiệu (Portfolio)** và **link đến trang mạng xã hội** của mỗi đơn vị thay vì dàn trải nhiều như hiện nay.<br>• **Phần Sự kiện:** trình bày gọn lại, chỉ hiện vắn tắt thông tin, địa điểm, thời gian… và **có phần lọc cho từng CLB**. | **`PB-89`** *(mới)*<br>**`PB-87`** *(sửa)* |

### 2.2. Góp ý về Giao diện (UI/UX), Tính năng & Vận hành

| Nhóm | Nội dung góp ý nguyên văn | Mã PBI truy vết |
| :--- | :--- | :---: |
| **Giao diện & Trải nghiệm (UI/UX)** | • **Layout Trang chủ (`/home`):** Đang bị dồn quá nhiều thông tin; chỉ nên có những thông tin vắn tắt tóm gọn VD như mục *“Tìm nơi bạn thuộc về”*, *“Khoảnh khắc đáng nhớ tại CLB VJU”* để gây ấn tượng về đa dạng các hoạt động của VJU.<br>• **Thanh điều hướng:** Mục **Sự kiện & CTV** và mục **Lịch sự kiện** đang khá giống nhau và có thể chồng chéo chức năng với nhau.<br>• **Nút `"Ứng tuyển CLB"`:** Nên thêm một **shape (khối nền) dưới chữ** để làm nền cho sinh viên dễ nhận biết hơn. | **`PB-87`** *(sửa)*<br>**`PB-89`** *(mới)* |
| **Tính năng & Nghiệp vụ** | • **Thanh Search trên cùng (`Topbar`):** Nên loại bỏ thanh search ở trên cùng ở mục Bảng điều khiển vì các tab đã nằm ở danh sách bên trái rồi nên thanh này hơi thừa.<br>• **Luồng bấm `"Ứng tuyển CLB"`:** Khi bấm vào chỉ nhảy đến **trang riêng** để điền thông tin cá nhân, trả lời câu hỏi của CLB; ở đầu trang thêm khu vực để **CLB viết caption và đính kèm file mô tả vị trí, công việc (JD) ở từng phân ban** (không nên chỉ hiện một khung nhỏ ở bên phải). | **`PB-69`** *(ghi chú)*<br>**`PB-87`** *(sửa)*<br>**`PB-90`** *(mới)* |
| **Khác (Thống kê, Gantt & Kiêm nhiệm)** | • Hướng đến như một **hệ thống quản lý hoạt động CLB và CLB–Sinh viên** (giống web đào tạo): hạn chế giới thiệu màu mè, đi sâu vào thống kê, lịch trình…<br>• Phần giới thiệu các CLB, Chủ nhiệm, BCN chuyển về phần Khám phá — mỗi CLB link đến **1 trang Portfolio** và có liên kết để quay lại Dashboard chính.<br>• Bổ sung **biểu đồ, bảng biểu thống kê mức độ tham gia**, **biểu mẫu khảo sát mức độ hài lòng**, **biểu đồ GANTT cho ĐTN** để theo dõi timeline sự kiện chung & timeline sự kiện các CLB chính xác.<br>• Nếu 1 người vừa là **Phó ban bên ĐTN** vừa kiêm **Phó chủ nhiệm ở 1 CLB** thì cầm 2 acc hay có **tính năng đổi qua lại giữa 2 vị trí** (giống tính năng Partner của Facebook)? | **`PB-89`** *(mới)*<br>**`PB-92`** *(mới)*<br>**`PB-84`** *(sửa)* |

---

## 3. Ma Trận Truy Vết Codebase Hiện Tại ↔ Chỉnh Sửa / Bổ Sung Backlog

| Mã PBI | Loại tác động | Hiện trạng trong Codebase | Thay đổi thiết kế đã chốt trong Backlog (`Sprint 4`) | Mã Test Case đối chứng |
| :---: | :---: | :--- | :--- | :--- |
| **`PB-69`** | Ghi chú truy vết | `Topbar.tsx` đang gắn `QuickActionCenter.tsx` (`Tìm trang...`). | Giữ thanh đa tab `WorkspaceTabBar`, ghi chú chuyển việc gỡ hộp tìm kiếm header thừa sang `PB-87`. | `TC-PB-69-01..04` (`Pass`) |
| **`PB-84`** | **Chỉnh sửa AC** | Đã định nghĩa `DOANVJU` = CLB thứ 13 theo mô hình 5 tầng cũ. | **Tinh gọn còn 4 tầng quản trị** (ngưng cấp role quản trị Tầng 4 Trưởng ban; mỗi CLB & ĐTN cấp quyền cho **2–3 tài khoản cá nhân `@st.vju.ac.vn`**) + bổ sung **Bộ chuyển đổi tư cách đơn vị (Unit/Role Context Switcher)** cho người kiêm nhiệm ĐTN ⇄ CLB trên cùng **1 tài khoản**. | `TC-PB-84-01..04` |
| **`PB-87`** | **Chỉnh sửa Story & AC** | Menu 5 nhóm; `/home` còn 4 khối dài; `/events` chưa có dropdown lọc theo CLB. | (1) Gỡ thanh search trên `Topbar.tsx`; (2) Phân tách rõ tên & vai trò **`Sự kiện các CLB`** (`/events` gọn + thêm **Bộ lọc theo từng CLB**) vs **`Công việc & Lịch cá nhân`** (`/schedule`); (3) Thu gọn `/home` tối giản + thêm khối nền (button shape) cho nút `"Ứng tuyển CLB"`. | `TC-PB-87-01..04` |
| **`PB-88`** | **Chỉnh sửa AC04** | Case 2 cũ cho phép Trưởng ban tự mở đợt tuyển quân. | Chuẩn hoá thẩm quyền đăng tuyển theo mô hình **4 tầng tinh gọn** (chỉ tài khoản BCN CLB / ĐTN có `application.manage_form` + `notification.send` mới mở đợt tuyển). | `TC-PB-88-01..04` |
| **`PB-89`** | **Bổ sung mới (`3 SP`)** | Đã có `ClubsDiscoveryView.tsx` & module Fanpage FB (`V35`/`V38`). | Xây dựng **Trang Portfolio súc tích cho từng CLB (`/clubs/[clubId]`)** kèm nút dẫn thẳng Fanpage/MXH của đơn vị, CTA `"Ứng tuyển CLB"` nổi bật và nút quay về Dashboard chính. | `TC-PB-89-01..04` |
| **`PB-90`** | **Bổ sung mới (`5 SP`)** | Nút ứng tuyển đang mở ngăn kéo hẹp bên phải (`ClubRecruitmentDrawer.tsx`); DB đã có `description` & `FORM_TEMPLATE`. | Chuyển sang **Trang ứng tuyển độc lập (`/clubs/[clubId]/apply`)**: đầu trang hiển thị **Caption đợt tuyển + File JD mô tả vị trí/công việc từng phân ban**, dưới là form thông tin cá nhân & câu hỏi động của CLB. | `TC-PB-90-01..04` |
| **`PB-91`** | **Bổ sung mới (`5 SP`)** | `audit_logs` lưu `actor/action/old/new`, chưa lưu IP & thiết bị; đã có OTP mail (`V33`). | Bổ sung **`ip_address` + `user_agent` vào `audit_logs`**, bật **xác thực 2 yếu tố (OTP 2FA)** cho tài khoản quản trị Tầng 1–3, và cơ chế **khoá sổ xác nhận điện tử (`SHA-256`)** bảng điểm danh chống tự ý sửa đổi. | `TC-PB-91-01..04` |
| **`PB-92`** | **Bổ sung mới (`5 SP`)** | Đã có thống kê cơ bản (`StatisticsServiceImpl`) & xuất CSV/PDF (`PB-82`). | Bổ sung **biểu đồ tỷ lệ tham gia thành viên**, chế độ xem **GANTT Timeline sự kiện 13 đơn vị cho ĐTN**, và **khảo sát mức độ hài lòng nhanh (1–5 sao)** sau sự kiện cho người đã check-in. | `TC-PB-92-01..04` |
| **`PB-93`** | **Bổ sung mới (`2 SP`)** | Đã có dữ liệu gốc `memberships`, `event_attendances` (QR), `tasks` (`VERIFIED`). | Chuẩn hoá nhãn **Học kỳ (`academic_term`)** trên sự kiện/báo cáo và hoàn thiện đặc tả kiến trúc **Điểm Rèn Luyện (ĐRL) Giai đoạn 2** tham khảo mô hình **NEU & FTU**. | `TC-PB-93-01..04` |

---

## 4. Checklist Triển Khai Code Theo Thứ Tự Ưu Tiên (Sau Khi Đã Chốt Tài Liệu)

### Đợt 1 — Ưu tiên P0 (Cốt lõi vận hành & UX theo phản hồi 20/11 + 23/11)
- [ ] **`PB-84` & `PB-85` (`BUG-P3-12`):** Khởi tạo `DOANVJU` (CLB thứ 13), đồng bộ tự động `memberships = ACTIVE` cho mọi chức danh BCN, áp dụng mô hình **4 tầng quản trị** (2–3 acc cá nhân `@st.vju.ac.vn`/đơn vị) + **Unit Context Switcher** (ĐTN ⇄ CLB).
- [ ] **`PB-86`:** Khối lịch sử sự kiện & kết quả điểm danh trực tiếp trên `/profile` + ô tìm kiếm nhanh hậu đóng đơn trong `EventAttendanceDrawer`.
- [ ] **`PB-87`:** Gỡ search trên `Topbar.tsx`, chuẩn hoá menu 5 nhóm không chồng chéo (`Sự kiện các CLB` có lọc theo CLB vs `Công việc & Lịch cá nhân`), thu gọn `/home` và làm nổi khối nền nút `"Ứng tuyển CLB"`.
- [ ] **`PB-89` & `PB-90`:** Mở route Portfolio CLB (`/clubs/[clubId]` gắn link Fanpage MXH + nút về Dashboard) và route Trang ứng tuyển riêng (`/clubs/[clubId]/apply` hiển thị Caption + file JD phân ban).

### Đợt 2 — Ưu tiên P1 (Kiểm soát an toàn dữ liệu & Điều phối cấp Đoàn Trường)
- [ ] **`PB-88`:** Sự kiện phạm vi Nội bộ CLB, Công việc chung toàn CLB, nộp tệp hồ sơ có khóa deadline tự động.
- [ ] **`PB-91`:** Ghi `ip_address` & `user_agent` vào `audit_logs`, xác thực OTP 2FA cho tài khoản quản trị CLB/ĐTN và khoá sổ bảng điểm danh bằng mã băm `SHA-256`.
- [ ] **`PB-92` & `PB-93`:** Biểu đồ tỷ lệ tham gia, trục Timeline Gantt sự kiện 13 đơn vị cho ĐTN, khảo sát hài lòng sau sự kiện (1–5 sao) và gắn trường Học kỳ (`academic_term`) chuẩn bị cho hệ thống ĐRL Giai đoạn 2.
