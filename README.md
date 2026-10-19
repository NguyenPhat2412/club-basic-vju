# Kiểm thử và đảm bảo chất lượng

Nhánh `testcase/qa` tập trung xác nhận các luồng nghiệp vụ của hệ thống quản lý câu lạc bộ sinh viên VJU hoạt động đúng theo đặc tả và hợp đồng API. Nhánh này tiếp nhận thay đổi từ `backend`, `frontend` và các nhánh tính năng, ghi nhận kết quả kiểm thử, lỗi phát hiện được và điều kiện cần trước khi tích hợp vào `main`.

> **Phạm vi tài liệu:** README tổng quan mô tả ứng dụng hiện có và cách chạy; README backend mô tả lệnh build/test; tài liệu đặc tả là căn cứ nghiệp vụ cho testcase. Các luồng sự kiện và nhiệm vụ trong đặc tả không được README tổng quan xác nhận là đã triển khai, vì vậy cần đánh dấu là chưa sẵn sàng kiểm thử tích hợp cho đến khi nhánh tính năng cung cấp phần triển khai tương ứng.

## 1. QA đã và sẽ làm như thế nào

### Căn cứ kiểm thử

QA đối chiếu kết quả với ba nguồn, theo thứ tự phù hợp với loại kiểm thử:

1. **Đặc tả nghiệp vụ**: vai trò, tiền điều kiện, luồng chính, luồng thay thế, lỗi ngoại lệ và hậu điều kiện trong `tai-lieu-dac-ta-he-thong-clb-vju.md`.
2. **Hợp đồng API**: `docs/api/openapi.yaml` và catalog API; dùng để xác nhận route, dữ liệu vào/ra và lỗi API.
3. **Hành vi đã triển khai**: README tổng quan, README backend và mã nguồn đang được tích hợp. Nếu code và đặc tả không khớp, tạo issue/bug để nhóm xác nhận yêu cầu thay vì tự xem khác biệt là hành vi đúng.

### Phương pháp

- Chuyển mỗi use case thành các ca kiểm thử có mã, tiền điều kiện, dữ liệu, bước thực hiện, kết quả mong đợi và kết quả thực tế.
- Bao phủ luồng thành công, dữ liệu không hợp lệ, trạng thái biên, quyền truy cập sai phạm vi và lỗi không tìm thấy tài nguyên.
- Kiểm tra phân quyền theo vai trò và scope (`GLOBAL`, `CLUB`, `DEPARTMENT`); bao gồm trường hợp truy cập CLB/ban khác phạm vi.
- Kiểm tra tính toàn vẹn và tác dụng phụ nghiệp vụ: duyệt đơn tạo membership, rời CLB gỡ thành viên khỏi ban, cập nhật liên quan được thực hiện nhất quán, thông báo/audit được ghi theo yêu cầu.
- Khi API thay đổi, đối chiếu contract với triển khai và kiểm tra mã HTTP, payload thành công/lỗi (RFC 7807), phân trang và xác thực/CSRF nếu áp dụng.
- Tách lỗi sản phẩm khỏi lỗi môi trường; lưu bước tái hiện, dữ liệu đầu vào, kết quả mong đợi/thực tế và log cần thiết. Không đưa secret, token hay dữ liệu cá nhân thật vào báo cáo.

### Các luồng nghiệp vụ trong đặc tả

| Nhóm | Mã testcase | Nội dung cần xác nhận |
|---|---|---|
| Khám phá và đăng ký CLB | `TC01`–`TC04` | Tìm/xem CLB; gửi đơn; quản lý duyệt hoặc từ chối; người gửi huỷ đơn; trạng thái và membership phát sinh đúng |
| Sự kiện | `TC05`–`TC07` | Tạo sự kiện và mở đăng ký; đăng ký tham gia; đóng đăng ký và điểm danh |
| Nhiệm vụ | `TC08`–`TC10` | Tạo/giao task; assignee cập nhật tiến độ; xác nhận hoàn tất hoặc xử lý quá hạn |

Trước khi chạy một nhóm testcase tích hợp, QA xác nhận chức năng, API và dữ liệu nền tương ứng đã có trên nhánh cần kiểm thử. README tổng quan hiện mô tả luồng khám phá CLB → đăng ký → xét duyệt → membership → phân ban → thông báo/audit; chưa xác nhận các module sự kiện và nhiệm vụ. Không báo các testcase này là pass nếu chưa có triển khai để kiểm tra.

## 2. Cách triển khai kiểm thử

### Điều kiện môi trường

- JDK 21 và Docker Desktop đang chạy.
- Backend: Spring Boot, PostgreSQL 16; integration test sử dụng Testcontainers.
- Python 3 và PyYAML cho API contract tests.
- Node.js 20+ và pnpm nếu cần kiểm thử giao diện frontend.
- Có thể kiểm thử API thủ công qua Swagger UI hoặc Postman CLI theo tài liệu backend.

### Chạy kiểm tra tự động

Chạy từ thư mục gốc repository:

```bash
# Backend unit và integration tests (Docker cần hoạt động)
cd backend/springboot
./mvnw test
```

Trên Windows PowerShell:

```powershell
cd backend/springboot
.\mvnw.cmd test
```

Chạy kiểm tra contract từ thư mục gốc:

```bash
python3 -m unittest discover -s docs/api/tests
```

Có thể chạy riêng một test backend để điều tra nhanh:

```bash
cd backend/springboot
./mvnw test -Dtest=AuthApiTest
```

Integration tests tự khởi tạo PostgreSQL 16 bằng Testcontainers. Nếu dùng DB test sẵn có, khởi động `docker-compose.test.yml` (cổng 55432) và cấu hình `TEST_DB_URL`, `TEST_DB_USERNAME`, `TEST_DB_PASSWORD` theo README backend.

### Kiểm thử API và giao diện

1. Khởi động PostgreSQL dev và backend theo hướng dẫn trong README tổng quan/backend; Flyway áp dụng migration khi backend khởi động.
2. Dùng Swagger UI (`http://localhost:8080/swagger-ui.html`) hoặc Postman CLI để gọi API.
3. Với endpoint cần đăng nhập, tạo phiên theo hướng dẫn auth/CSRF của backend; không chia sẻ cookie, token hoặc mật khẩu trong log/báo cáo.
4. Nếu kiểm thử frontend, chạy frontend theo README tổng quan, thực hiện luồng trên giao diện và đối chiếu request/response với API contract.
5. Ghi kết quả cho từng testcase; bug cần có môi trường, nhánh/commit, dữ liệu tối thiểu, bước tái hiện, kết quả mong đợi và thực tế, mức độ ảnh hưởng.

### Điều kiện đạt

- Các kiểm tra bắt buộc của nhánh chạy thành công; lỗi môi trường được ghi riêng và không tính là pass.
- Không còn lỗi chặn luồng chính hoặc lỗi phân quyền/tính toàn vẹn dữ liệu chưa được xử lý.
- API contract, frontend và backend thống nhất về route, payload và trạng thái nghiệp vụ.
- Kết quả testcase gắn với commit được kiểm tra để có thể tái hiện.

GitHub Actions được README tổng quan mô tả là chạy backend tests, API contract tests và build Docker image khi push lên `main` hoặc khi có pull request. QA nên kiểm tra kết quả CI của PR trước khi chấp nhận tích hợp.

## 3. Cách các nhánh khác làm việc với `testcase/qa`

README tổng quan và tài liệu backend không ghi lại quy ước merge nhánh hiện tại. Phần dưới đây là luồng phối hợp đề xuất dựa trên các nhánh xuất hiện trong repository/ảnh và các kiểm tra CI đã mô tả; nhóm có thể điều chỉnh cho khớp quy trình thực tế.

```text
backend / feature-backend ─┐
frontend / feature-* ──────┼─> PR hoặc merge vào testcase/qa ─> chạy QA ─> main
fix/* ─────────────────────┘             │
                                         └─> phát hiện lỗi: báo nhánh sở hữu code,
                                             sửa trên nhánh đó rồi cập nhật lại QA
```

| Nhánh | Phần việc đưa sang QA | Trách nhiệm khi phối hợp |
|---|---|---|
| `backend` | API, nghiệp vụ, phân quyền, migration và backend tests | Cung cấp hướng dẫn chạy, thay đổi contract/migration và dữ liệu cần thiết; sửa lỗi backend trên nhánh sở hữu rồi đưa commit mới để QA kiểm tra lại |
| `feature/backend` | Tính năng backend đang phát triển | Nêu rõ phạm vi/tiêu chí nghiệm thu và phụ thuộc; chỉ yêu cầu kiểm thử tích hợp khi API và dữ liệu nền sẵn sàng |
| `frontend` | Màn hình và luồng người dùng | Nêu cấu hình/API phụ thuộc; xác nhận luồng giao diện với API đã tích hợp; sửa lỗi frontend trên nhánh tương ứng |
| `fix/backend-docs-and-db-backup` | Sửa lỗi/tài liệu/hạ tầng database theo phạm vi nhánh | QA xác nhận sửa đổi ảnh hưởng tới hướng dẫn chạy, backup/restore hoặc môi trường kiểm thử; không dùng dữ liệu production trong môi trường QA |
| `draft` | Bản nháp/đề xuất chưa xác nhận | Chưa coi là nguồn triển khai ổn định cho kết quả QA cho đến khi được nhóm chọn và tích hợp |
| `main` | Bản tích hợp chính | Nhận thay đổi sau khi review, CI và tiêu chí QA đạt; QA kiểm tra lại smoke test trên commit/release được chọn |

### Quy trình vòng đời một thay đổi

1. **Nhánh phát triển** mở PR hoặc đưa thay đổi vào `testcase/qa`, ghi phạm vi, tiêu chí nghiệm thu, hướng dẫn cấu hình và liên kết issue.
2. **QA chuẩn bị** đồng bộ nhánh kiểm thử với thay đổi mới nhất, dựng môi trường, áp dụng migration và tạo dữ liệu thử không chứa thông tin nhạy cảm.
3. **QA thực thi** test tự động phù hợp, sau đó chạy testcase nghiệp vụ/API/giao diện có liên quan; lưu kết quả theo commit.
4. **Khi có lỗi**, QA báo lỗi cho nhóm sở hữu phần code. Nhóm đó sửa trên nhánh phát triển/bugfix, cập nhật PR hoặc đưa commit mới vào QA; QA chạy lại testcase lỗi và regression liên quan.
5. **Khi đạt**, ghi tóm tắt phạm vi đã kiểm tra, commit, lệnh/test đã chạy, kết quả và lỗi còn tồn tại; reviewer dùng thông tin đó khi tích hợp vào `main`.
6. **Sau tích hợp**, chạy smoke test trên bản `main`/release nếu môi trường và dữ liệu triển khai sẵn sàng; phản hồi lỗi hồi quy về nhánh sở hữu.

Để tránh nhầm kết quả, luôn ghi rõ tên nhánh và commit SHA được kiểm thử. Không sửa trực tiếp code của nhánh `backend`/`frontend` trong nhánh QA; thay đổi sản phẩm cần được trả về nhánh chịu trách nhiệm và kiểm thử lại sau khi cập nhật.

## 4. Tài liệu tham chiếu

- README tổng quan: kiến trúc, cách chạy ứng dụng, API, test, Docker và CI.
- README backend: cài công cụ, cấu hình `.env.local`, chạy backend, test, build JAR/Docker và kiểm thử API.
- Tài liệu đặc tả hệ thống: vai trò, quy trình nghiệp vụ và testcase `TC01`–`TC10`.
- API contract: `docs/api/openapi.yaml`, catalog và contract tests trong `docs/api/`.
