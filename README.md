# Kiểm thử và đảm bảo chất lượng

Nhánh `testcase/qa` tập trung xác nhận các luồng nghiệp vụ của hệ thống quản lý câu lạc bộ sinh viên VJU hoạt động đúng theo đặc tả và hợp đồng API. Nhánh này tiếp nhận thay đổi từ `backend`, `frontend` và các nhánh tính năng, ghi nhận kết quả kiểm thử, lỗi phát hiện được và điều kiện cần trước khi tích hợp vào `main`.

> **Phạm vi tài liệu (Cập nhật 18/11/2026 — đồng bộ commit `3f874a1` trên `main`):** Toàn bộ **122 PBI** và **466 ca kiểm thử (`TC-PB-*`)** đã được **chia tách thành 4 thư mục Sprint độc lập** tại [`testcases/`](./testcases/README.md) (`sprint-1`: 41 PBI / 157 TC; `sprint-2`: 20 PBI / 77 TC; `sprint-3`: 23 PBI / 86 TC; `sprint-4`: 38 PBI / 146 TC — đạt **454 Pass**, 12 TC của `PB-76..PB-78` thuộc lộ trình Sprint 4) kèm Postman Collection, Bug Log (**35/35 mã lỗi `BUG-P1-01` → `BUG-P3-11` đã đóng 100%**) và bộ chạy test nhanh `./testcases/run-sprint-tests.sh` cho từng Sprint.

## 0. Truy cập & Chạy Test Nhanh Theo Từng Thư mục Sprint

| Thư mục Sprint | Quy mô & Kết quả | Cụm Module con | Postman API | Lệnh chạy test nhanh (< 1 giây) |
| :--- | :--- | :---: | :---: | :--- |
| [**`testcases/sprint-1/`**](./testcases/sprint-1/README.md) | 41 PBI · **157/157 Pass** · 14 Bug đã đóng | 5 file trong `modules/` | [`sprint-1.postman.json`](./testcases/sprint-1/sprint-1.postman.json) | `./testcases/run-sprint-tests.sh sprint-1` |
| [**`testcases/sprint-2/`**](./testcases/sprint-2/README.md) | 20 PBI · **77/77 Pass** · 9 Bug đã đóng | 5 file trong `modules/` | [`sprint-2.postman.json`](./testcases/sprint-2/sprint-2.postman.json) | `./testcases/run-sprint-tests.sh sprint-2` |
| [**`testcases/sprint-3/`**](./testcases/sprint-3/README.md) | 23 PBI · **86/86 Pass** · 11 Bug đã đóng | 4 file trong `modules/` | [`sprint-3.postman.json`](./testcases/sprint-3/sprint-3.postman.json) | `./testcases/run-sprint-tests.sh sprint-3` |
| [**`testcases/sprint-4/`**](./testcases/sprint-4/README.md) | 38 PBI · **134 Pass**, 12 Chờ Sprint 4 · 1 Bug đã đóng | 5 file trong `modules/` | [`sprint-4.postman.json`](./testcases/sprint-4/sprint-4.postman.json) | `./testcases/run-sprint-tests.sh sprint-4` |

```bash
# Chạy toàn bộ OpenAPI 3.1 Contract Tests + cả 4 thư mục Sprint cùng lúc:
./testcases/run-sprint-tests.sh all

# Chạy kèm Live HTTP Smoke Test lên môi trường đang chạy (Local / Staging / Production):
./testcases/run-sprint-tests.sh sprint-3 --live https://api.vju-club.all1.vn
```

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

| Nhóm | Mã testcase | Nội dung xác nhận & Trạng thái (`main @ 3f874a1`) |
|---|---|---|
| Nền tảng Xác thực, CLB, Ban, RBAC & Audit (Sprint 1) | `TC-PB-01` → `TC-PB-37` (157 TC) | Đăng ký/Đăng nhập Session + Google OAuth `@st.vju.ac.vn`, Hồ sơ, CLB, Ban, RBAC 3 tầng, Audit bất biến — **157/157 Pass** |
| Khám phá CLB, Tuyển quân & Thành viên (Sprint 2) | `TC01`–`TC04` / `TC-PB-55` → `TC-PB-35.1` (77 TC) | Tìm/xem CLB (Table \| Cards), Form động, xét duyệt đơn atomic, vòng đời SUSPENDED/LEFT, chuyển ban, thông báo — **77/77 Pass** |
| Sự kiện, Cộng tác viên (CTV) & Nhiệm vụ / Subtask 1 cấp (Sprint 3) | `TC05`–`TC10` / `TC-PB-57` → `TC-PB-29` (86 TC) | Vòng đời sự kiện, cổng CTV khóa bi quan chống vượt chỗ, giao task/subtask 1 cấp `parentTaskId`, cờ quá hạn — **86/86 Pass** |
| Mở rộng Thực tế & Sprint 4 (`PB-62` → `PB-79`) | `TC11`–`TC18` / `TC-PB-59` → `TC-PB-79` (146 TC) | Điểm danh 48h, Ẩn danh PII, Kho tài liệu 3 tầng, Chat STOMP V30/V31, Đa ngữ AI VI/EN/JA, DataTable, Security, Quên mật khẩu OTP & Cấu hình SMTP/Gmail V33 (`PB-75`, `PB-79`) — **134 Pass, 12 Chưa chạy (`PB-76..78`)** |

Toàn bộ **35/35 bản ghi lỗi (`BUG-P1-01` → `BUG-P3-11`)** đã được khắc phục, kiểm thử xác nhận (retest) và đóng trạng thái trên cả `Product Backlog - Sprint 3.xlsx` và `bo_tai_lieu_testcase.md` (đạt **67/67 Frontend Unit Tests Pass** & **16/16 OpenAPI Contract Tests Pass**).

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
- Tài liệu đặc tả hệ thống: vai trò, quy trình nghiệp vụ và testcase `TC01`–`TC18` và bộ 466 ca kiểm thử chi tiết tại `bo_tai_lieu_testcase.md`.
- API contract: `docs/api/openapi.yaml`, catalog và contract tests trong `docs/api/`.
