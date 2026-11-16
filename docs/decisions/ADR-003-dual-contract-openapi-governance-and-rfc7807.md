# ADR-003: Quản trị hợp đồng kép OpenAPI 3.1 (`156` operations), `ApiPaths` tập trung và chuẩn lỗi RFC 7807 chống dò ID

## Status
Accepted

## Date
2026-10-31 (mở rộng lên `156` HTTP operations trên `21` module ngày `2026-11-15`)

## Context
Khi nhiều thành viên cùng phát triển song song Backend Spring Boot và Frontend Next.js qua 4 giai đoạn (tăng từ 45 lên **156 HTTP endpoints**), hai rủi ro lớn thường xuyên xảy ra (ghi nhận thực tế tại `BUG-P2-06` và `BUG-P2-07`):
1. Đường dẫn URL hoặc kiểu dữ liệu trả về giữa Controller Java, tài liệu `openapi.yaml` và client TypeScript bị lệch nhau âm thầm.
2. Kẻ tấn công không có quyền có thể truyền thử các UUID ngẫu nhiên vào endpoint quản trị để phân biệt tài nguyên tồn tại (`403`) với không tồn tại (`404`).

## Decision
1. **Hằng số đường dẫn tập trung duy nhất (`common/ApiPaths.java`):** Cấm viết chuỗi route trực tiếp trong các `@RestController`; mọi đường dẫn phải tham chiếu hằng số từ `ApiPaths.java`.
2. **Hợp đồng kép có kiểm định tự động (`docs/api/tests/test_contract.py` — 16 cổng kiểm tra):**
   - Duy trì nguồn chuẩn tại `docs/api/openapi.yaml` (OpenAPI 3.1 thuần, không dùng từ khóa `nullable` của 3.0) và `docs/api/catalog.yml`, đồng bộ bản sao runtime vào `backend/springboot/src/main/resources/api/` (`phase1-openapi.yaml` và `catalog.yml`).
   - Bộ kiểm thử Python `test_contract.py` đối chiếu chéo 3 bên: `openapi.yaml` ↔ `catalog.yml` ↔ mã nguồn Java (`@RestController`, `ApiPaths.java`, DTO `record`), đảm bảo khớp 100% đường dẫn, HTTP status (`201` cho tạo mới, `204` cho xóa), cấu trúc phân trang `{ items, total, offset, limit }` và tài liệu hóa mã lỗi `401`/`403`.
3. **Chuẩn lỗi RFC 7807 (`application/problem+json`) & Chính sách chống dò ID:**
   - Mọi ngoại lệ nghiệp vụ kế thừa `ApiException` mang mã `code` ổn định (ví dụ `409 EVENT_CAPACITY_FULL`, `403 PERMISSION_SCOPE_MISMATCH`) để Frontend dịch thông báo thân thiện sang VI/EN/JA.
   - Với ID tài nguyên không tồn tại, chỉ tài khoản có quyền ở phạm vi `GLOBAL` mới nhận `404`; các tài khoản khác nhận `403 PERMISSION_DENIED` nhằm ngăn hành vi dò quét UUID giữa các CLB.

## Alternatives Considered

### Chỉ dùng OpenAPI sinh tự động lúc chạy (`springdoc-openapi` code-first)
- **Ưu điểm:** Không phải cập nhật file YAML khi thêm endpoint.
- **Nhược điểm:** Hợp đồng API thay đổi ngầm khi lập trình viên sửa DTO Java mà không có bước rà soát thiết kế; Frontend không thể kiểm tra hợp đồng ngoại tuyến trong dưới 1 giây nếu không khởi động toàn bộ Spring Boot + PostgreSQL.
- **Lý do loại bỏ:** Không đáp ứng cổng chất lượng CI nhanh (`0.5s`) và quy trình chốt hợp đồng trước khi ghép nối UI.

## Consequences
- Cổng kiểm định `python3 -m unittest discover -s docs/api/tests -v` chạy trong `< 1 giây` và chặn ngay mọi PR làm lệch route, thiếu mã lỗi `401`/`403` hoặc lệch trường Java `record`.
- **Quy trình bắt buộc khi thêm/sửa bất kỳ REST API nào:**
  1. Khai báo hằng số đường dẫn trong `ApiPaths.java`.
  2. Cập nhật `docs/api/openapi.yaml` và `docs/api/catalog.yml`, sau đó đồng bộ sang `backend/springboot/src/main/resources/api/phase1-openapi.yaml` và `backend/springboot/src/main/resources/api/catalog.yml`.
  3. Cập nhật bảng tổng hợp tại `docs/api/README.md` và chạy pass `16/16` bài test trong `docs/api/tests`.
