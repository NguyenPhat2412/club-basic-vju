# ADR-006: Kiến trúc Next.js 16 giới hạn `≤ 400` dòng/tệp, bảng màu 60/30/10 kiểm định bằng test và cổng dịch AI có cache PostgreSQL

## Status
Accepted

## Date
2026-11-15

## Context
Giao diện của `CLUB-BASIC-VJU` phục vụ đồng thời sinh viên Việt Nam, sinh viên/giảng viên Nhật Bản và sinh viên quốc tế tại 2 cơ sở Hòa Lạc & Mỹ Đình với hơn 21 tuyến màn hình (từ trang chủ công khai đến không gian làm việc đa tab, quản trị RBAC, chat thời gian thực và kho tài liệu). Hai thách thức chất lượng mã nguồn Frontend từng xuất hiện ở đầu dự án:
1. Các tệp màn hình quản trị dễ phình lên trên 1.000 dòng, pha trộn màu sắc tùy tiện và lặp lại nhãn `(tuỳ chọn)` thủ công không nhất quán giữa các biểu mẫu.
2. Nội dung tĩnh trên giao diện có thể dùng từ điển chuỗi, nhưng nội dung nghiệp vụ động do các CLB tự nhập (tên/mô tả sự kiện, giới thiệu CLB, tên ban) không thể dịch tay sang tiếng Anh (`en`) và tiếng Nhật (`ja`), trong khi gọi trực tiếp LLM ở mỗi lượt tải trang sẽ chậm và tốn hạn mức API.

## Decision
1. **Giới hạn kích thước module nghiêm ngặt (`≤ 400` dòng/tệp) & Zero Mock Data:**
   - Tách bạch rõ `src/app/` (routing mỏng), `src/components/<domain>/` (UI chia nhỏ theo ngăn kéo/modal/tab), `src/hooks/<domain>/` (state & TanStack Query), `src/api/` (gọi REST thật) và `src/forms/` (schema & metadata biểu mẫu).
   - Cấm hoàn toàn dữ liệu giả lập (`mock data`) trên giao diện sản phẩm.
2. **Kiểm định tự động Hệ màu 60/30/10 & Chuẩn hóa Biểu mẫu (`frontend/tests/`):**
   - Toàn bộ màu sắc phải đi qua biến token thiết kế trong `src/styles/globals.css`; unit test quét trực tiếp toàn bộ cây mã nguồn `frontend/src` để chặn mọi class màu Tailwind lệch chuẩn (`purple`, `indigo`, `cyan`, `pink`...) hoặc mã hex viết cứng.
   - Tập trung quy tắc chỉ báo trường nhập liệu vào `src/forms/form-field-meta.ts` (`*` cho trường bắt buộc, tự động gắn `(Tuỳ chọn)` cho trường không bắt buộc, ẩn trên trường `readOnly`/bộ lọc) kèm test chống lặp nhãn.
3. **Kiến trúc Đa ngôn ngữ 2 lớp + Bộ nhớ đệm PostgreSQL (`V23__i18n_translations_cache.sql`):**
   - **Lớp 1 (Chuỗi giao diện tĩnh & mẫu câu chuẩn):** Tra cứu tức thời trong bộ từ điển `src/i18n/` (`phrases-en*.ts`, `phrases-ja*.ts`, `translator.ts`).
   - **Lớp 2 (Nội dung động từ CSDL):** Gửi gom lô qua `POST /api/v1/public/i18n/translate-batch` tới `I18nTranslationServiceImpl` kết nối cổng AI tương thích OpenAI (**9router**), băm nội dung gốc (`SHA-256`) và lưu bền vững vào bảng `i18n_translations` (`UNIQUE(source_hash, target_locale)`). Khi cổng AI không khả dụng, hệ thống tự động hiển thị an toàn văn bản gốc mà không làm gãy trang.

## Alternatives Considered

### Lưu bản dịch đa ngôn ngữ thành nhiều cột (`name_vi`, `name_en`, `name_ja`) trên từng bảng nghiệp vụ
- **Nhược điểm:** Buộc Chủ nhiệm CLB và sinh viên phải nhập tay 3 thứ tiếng mỗi khi tạo sự kiện hoặc nhiệm vụ mới; làm phình gấp ba số cột văn bản trên hàng chục bảng.
- **Lý do loại bỏ:** Gây cản trở thao tác thực tế của sinh viên và khó mở rộng thêm ngôn ngữ.

### Chỉ kiểm tra quy ước giao diện (số dòng, bảng màu) bằng review thủ công
- **Nhược điểm:** Dễ bị bỏ sót khi nhiều thành viên và công cụ AI cùng chỉnh sửa giao diện nhanh.
- **Lý do loại bỏ:** Đưa thẳng thành các bài test tự động trong `pnpm test` (`36/36 Pass` trong `~1.2s`) giúp chặn vi phạm ngay từ dưới máy cá nhân và CI.

## Consequences
- Trước khi mở PR chạm vào `frontend/`, lập trình viên hoặc agent bắt buộc chạy `pnpm --dir frontend test`: bất kỳ tệp nào vượt `400` dòng (trong phạm vi kiểm định), dùng class màu ngoài bảng token 60/30/10, ghi cứng trùng `(tuỳ chọn)` hoặc để sót chuỗi tiếng Việt trong bản dịch trang chủ EN/JA đều sẽ báo đỏ tức thì.
