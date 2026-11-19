# Kịch Bản Phỏng Vấn Câu Lạc Bộ — Cải Thiện VJU ClubHub

> **Mục đích:** Tìm hiểu quy trình vận hành thực tế của các Câu lạc bộ tại Trường Đại học Việt Nhật (VJU), phát hiện điểm nghẽn (pain points) và xác định các cải tiến ưu tiên cho nền tảng **VJU ClubHub** ([https://vju-club.all1.vn](https://vju-club.all1.vn)).
> **Thời lượng dự kiến:** 25 – 35 phút

---

## Phần 1. Thông Tin Buổi Phỏng Vấn

| Hạng mục | Ghi chú |
| :--- | :--- |
| **Tên Câu lạc bộ** | |
| **Nhóm lĩnh vực CLB** | ☐ Học thuật & Nghiên cứu &nbsp;&nbsp; ☐ Văn hoá – Nghệ thuật &nbsp;&nbsp; ☐ Thể thao &nbsp;&nbsp; ☐ Tình nguyện – Xã hội &nbsp;&nbsp; ☐ Truyền thông – Sự kiện |
| **Người trả lời & Chức vụ** | *(VD: Chủ nhiệm / Phó chủ nhiệm / Trưởng ban Truyền thông / Thành viên)* |
| **Quy mô thành viên hiện tại** | *(Tổng số thành viên active + số lượng Ban chuyên môn)* |
| **Ngày phỏng vấn** | |

### Lưu ý nhanh trước khi hỏi (1 phút mở đầu)
- **Đặt tâm thế thoải mái:** *"Hôm nay mình không kiểm tra hay bán phần mềm đâu, mình chỉ muốn nghe cách CLB đang vận hành thực tế để sửa web cho sát nhu cầu sinh viên VJU nhất."*
- **Hỏi về chuyện đã xảy ra:** Luôn hỏi về **đợt tuyển quân gần nhất** hoặc **sự kiện gần nhất**, tránh hỏi giả định *"Nếu có tính năng X bạn có dùng không?"*.
- **Cuối buổi (5 phút cuối):** Mới mở [vju-club.all1.vn](https://vju-club.all1.vn) đưa họ tự bấm thử để không làm lệch câu trả lời ở 9 câu đầu.

---

## Phần 2. 10 Câu Hỏi Phỏng Vấn Trọng Tâm

### Câu 1. Bức tranh công cụ hiện tại & điểm đứt gãy
- **Câu hỏi chính:** *"Hiện tại để vận hành CLB trong một tuần bình thường, BCN đang phải mở những công cụ/app nào cùng lúc (Zalo, Messenger, Google Sheets, Drive, Notion…)? Khâu nào đang làm mọi người mất thời gian chuyển qua lại hoặc dễ sót thông tin nhất?"*
- **Hỏi đào sâu (nếu cần):** *"Có bao giờ thông tin chốt ở nhóm chat nhưng quên cập nhật vào danh sách trên Sheet chưa?"*
- **Module liên quan:** Tổng quan Workspace CLB, mức độ phân mảnh công cụ.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 2. Quy trình tuyển thành viên & xét duyệt hồ sơ
- **Câu hỏi chính:** *"Kể lại giúp mình đợt tuyển thành viên gần nhất của CLB: từ lúc mở form, lọc đơn, hẹn phỏng vấn đến lúc chốt danh sách và xếp vào từng ban, CLB đã làm từng bước như thế nào và vướng nhất ở khâu nào?"*
- **Hỏi đào sâu (nếu cần):** *"Mỗi đợt tuyển CLB nhận khoảng bao nhiêu đơn? BCN chấm điểm hay ghi chú nhận xét ứng viên ở đâu?"*
- **Module liên quan:** Biểu mẫu đăng ký tuỳ chỉnh (`Forms`), Duyệt đơn (`Applications`), Ghi chú nội bộ BCN.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 3. Cơ cấu Ban chuyên môn & phân quyền quản trị
- **Câu hỏi chính:** *"Trong CLB hiện có những ban nào và ai được quyền làm gì (duyệt người, đăng thông báo, sửa file, giao việc)? Có bao giờ xảy ra chuyện thành viên lỡ tay sửa/xoá nhầm dữ liệu hoặc Trưởng ban thiếu quyền xử lý chưa?"*
- **Hỏi đào sâu (nếu cần):** *"Ngoài Chủ nhiệm/Phó chủ nhiệm, Trưởng ban chuyên môn cần tự quyết những việc gì trong ban của mình?"*
- **Module liên quan:** Quản lý Ban chuyên môn (`Departments`), Phân quyền 3 tầng (`GLOBAL` / `CLUB` / `DEPARTMENT`).
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 4. Tổ chức sự kiện & điểm danh thực tế
- **Câu hỏi chính:** *"Ở sự kiện hoặc buổi sinh hoạt gần nhất của CLB, mọi người quản lý danh sách đăng ký và điểm danh người tham gia bằng cách nào? Sau sự kiện có phải tổng hợp lại số liệu cho trường hay tính điểm chuyên cần thành viên không?"*
- **Hỏi đào sâu (nếu cần):** *"Lúc đông người đến cùng lúc ở cửa sự kiện, khâu check-in/điểm danh có bị ùn hay sai sót không?"*
- **Module liên quan:** Sự kiện (`Events`), Lịch hoạt động (`Schedule`), Điểm danh (`Attendance`).
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 5. Giao việc (Task) & theo dõi tiến độ CTV / thành viên
- **Câu hỏi chính:** *"Khi chuẩn bị một sự kiện lớn cần chia đầu việc cho Ban Truyền thông, Hậu cần, Đối ngoại…, BCN đang giao deadline và kiểm tra sản phẩm nộp về (link bài viết, ảnh thiết kế) bằng cách nào? Làm sao biết ai đang trễ việc?"*
- **Hỏi đào sâu (nếu cần):** *"BCN có dùng bảng theo dõi mức độ đóng góp của từng thành viên cuối kỳ không?"*
- **Module liên quan:** Giao việc (`Tasks`), Tiến độ `%`, Link nộp báo cáo (`reportLink`).
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 6. Giao tiếp nội bộ & bài toán trôi tin nhắn
- **Câu hỏi chính:** *"Trong nhóm chat của CLB hiện tại, khi vừa bàn việc chung vừa chat phiếm, mọi người làm thế nào để thành viên không bỏ lỡ thông báo quan trọng hoặc người vào muộn nắm được nội dung cuộc họp?"*
- **Hỏi đào sâu (nếu cần):** *"CLB đang tách bao nhiêu nhóm chat riêng cho BCN và các ban?"*
- **Module liên quan:** Chat theo kênh CLB / Ban, Ghim tin nhắn, Trạng thái Đã nhận / Đã xem, Cảm xúc & AI tóm tắt hội thoại.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 7. Lưu trữ tài liệu & bàn giao qua các nhiệm kỳ
- **Câu hỏi chính:** *"Các file quan trọng như quy chế, kế hoạch học kỳ, dự trù kinh phí hay mẫu đơn của trường đang để ở đâu? Đợt chuyển giao BCN nhiệm kỳ trước sang nhiệm kỳ này có bị thất lạc file hoặc nhầm bản nháp cũ - mới không?"*
- **Hỏi đào sâu (nếu cần):** *"Có tài liệu nào chỉ dành riêng cho BCN xem mà không muốn toàn bộ thành viên thấy không?"*
- **Module liên quan:** Kho tài liệu (`Document Vault`), Phân quyền hiển thị, Lịch sử phiên bản (`v1`, `v2`…), Bộ lọc bảng tài liệu.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 8. Quảng bá hình ảnh CLB & thu hút tân sinh viên (Đặc thù VJU)
- **Câu hỏi chính:** *"Khi tân sinh viên VJU muốn tìm hiểu về CLB của bạn (hoặc khi có sinh viên quốc tế / giảng viên người Nhật quan tâm), CLB đang giới thiệu thông tin ở đâu và muốn trang hồ sơ CLB thể hiện nổi bật điều gì nhất?"*
- **Hỏi đào sâu (nếu cần):** *"CLB có hay cần giới thiệu hoạt động bằng tiếng Anh hoặc tiếng Nhật không?"*
- **Module liên quan:** Khám phá CLB (`/clubs`), Trang Overview tuỳ biến của CLB, Đa ngôn ngữ `VI / EN / JA`.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 9. Thủ tục hành chính & báo cáo với Nhà trường
- **Câu hỏi chính:** *"Khi CLB cần xin phép tổ chức sự kiện, mượn phòng hoặc nộp báo cáo hoạt động định kỳ cho Phòng Công tác Sinh viên / Đoàn Hội, thủ tục giấy tờ hay số liệu nào đang làm BCN ngại tổng hợp nhất?"*
- **Hỏi đào sâu (nếu cần):** *"Nếu hệ thống tự xuất sẵn file báo cáo hoặc biểu mẫu theo chuẩn trường từ dữ liệu sự kiện/thành viên thì mẫu nào cần nhất?"*
- **Module liên quan:** Thống kê CLB, Văn bản biểu mẫu hệ thống, Xuất dữ liệu báo cáo.
- **Ghi chép câu trả lời:**
  > 
  > 

---

### Câu 10. Trải nghiệm trực tiếp trên VJU ClubHub & rào cản chuyển đổi *(5 phút cuối)*
- **Thao tác:** Mở sẵn [https://vju-club.all1.vn](https://vju-club.all1.vn) trên laptop/điện thoại, nhờ người được phỏng vấn tự lướt trang CLB, bảng thành viên, kho tài liệu, sự kiện và khu chat trong 3 phút.
- **Câu hỏi chính:** *"Nếu tuần tới CLB chuyển thử MỘT mảng việc lên web này trước, bạn chọn mảng nào đầu tiên? Và khi vừa tự bấm thử, có chỗ nào khiến bạn thấy rối hoặc nghĩ các bạn trong CLB sẽ ngại dùng không?"*
- **Module liên quan:** Đánh giá UX thực tế (Mobile/Desktop), xác định tính năng dẫn dắt (Killer Feature) để onboard CLB.
- **Ghi chép câu trả lời & quan sát thao tác:**
  > 
  > 

---

## Phần 3. Tổng Kết Nhanh Ngay Sau Buổi Phỏng Vấn

| Hạng mục đúc kết | Nội dung chốt | Mức ưu tiên (`P0` / `P1` / `P2`) |
| :--- | :--- | :--- |
| **1. Nỗi đau lớn nhất của CLB hiện tại** | | |
| **2. Tính năng CLB sẵn sàng dùng ngay tuần tới** | | |
| **3. Điểm giao diện / UX bị khựng khi dùng thử** | | |
| **4. Tính năng còn thiếu cần bổ sung thêm** | | |
