# Backend – VJU Club

Spring Boot 4 (Java 21) + PostgreSQL 16. Tài liệu này hướng dẫn chạy backend trên **macOS** và **Windows**, từ máy chưa cài gì đến lúc gọi được API.

> Mọi lệnh bên dưới chạy từ thư mục **gốc của repo** (`club-basic-vju/`), trừ khi có ghi `cd backend/springboot`.
> Ở mỗi bước, chọn đúng khối lệnh theo hệ điều hành: **macOS** (Terminal / zsh), **Windows – PowerShell** hoặc **Windows – CMD**.

## Mục lục

1. [Cài đặt công cụ](#1-cài-đặt-công-cụ)
2. [Khởi động PostgreSQL](#2-khởi-động-postgresql)
3. [Tạo file `.env.local`](#3-tạo-file-envlocal)
4. [Chạy backend](#4-chạy-backend)
5. [Kiểm tra backend đã chạy](#5-kiểm-tra-backend-đã-chạy)
6. [Chạy test](#6-chạy-test)
7. [Build file JAR và Docker image](#7-build-file-jar-và-docker-image)
8. [Xử lý sự cố thường gặp](#8-xử-lý-sự-cố-thường-gặp)
9. [Tham khảo](#9-tham-khảo)

## 1. Cài đặt công cụ

| Công cụ | Phiên bản | Dùng để |
|---|---|---|
| JDK | **21** | Biên dịch và chạy backend |
| Docker Desktop | mới nhất | Chạy PostgreSQL, và chạy integration test (Testcontainers) |
| Git | bất kỳ | Lấy mã nguồn |

Maven **không cần cài**: repo đã có Maven Wrapper (`mvnw` cho macOS, `mvnw.cmd` cho Windows). Lần chạy đầu, wrapper sẽ tự tải Maven 3.9.

**macOS** (dùng [Homebrew](https://brew.sh)):

```bash
brew install --cask temurin@21
```

```bash
brew install --cask docker-desktop
```

**Windows – PowerShell** (dùng `winget`, có sẵn trên Windows 10/11):

```powershell
winget install EclipseAdoptium.Temurin.21.JDK
```

```powershell
winget install Docker.DockerDesktop
```

```powershell
winget install Git.Git
```

Trên Windows, Docker Desktop cần **WSL 2**; trình cài đặt sẽ hướng dẫn bật nếu máy chưa có. Sau khi cài xong, **mở lại terminal** để nhận biến `PATH` và `JAVA_HOME` mới.

Kiểm tra (lệnh giống nhau trên mọi hệ điều hành):

```bash
java -version
```

```bash
docker version
```

`java -version` phải hiện `21`. `docker version` phải hiện cả phần **Server**; nếu chỉ thấy Client, nghĩa là Docker Desktop chưa được mở.

## 2. Khởi động PostgreSQL

Mở **Docker Desktop** trước, rồi chạy lệnh dưới đây ở thư mục gốc repo. Lệnh giống nhau trên mọi hệ điều hành:

```bash
docker compose up -d postgres
```

PostgreSQL chạy ở `localhost:5432` (database `club`, user `club`, mật khẩu `club_local`). Dữ liệu được giữ trong volume Docker, nên tắt máy rồi bật lại vẫn còn.

**Nếu cổng 5432 đã bị chiếm** (thường do máy đã cài sẵn PostgreSQL), hãy cho container chạy ở cổng khác, ví dụ 5433. Sau đó khai báo `DB_URL` trong `.env.local` ở bước 3.

**macOS**:

```bash
POSTGRES_PORT=5433 docker compose up -d postgres
```

**Windows – PowerShell**:

```powershell
$env:POSTGRES_PORT="5433"; docker compose up -d postgres
```

**Windows – CMD**:

```bat
set "POSTGRES_PORT=5433" && docker compose up -d postgres
```

Dừng PostgreSQL (dữ liệu vẫn giữ nguyên):

```bash
docker compose stop postgres
```

## 3. Tạo file `.env.local`

Profile `local` tự đọc file `backend/springboot/.env.local`. File này chứa tài khoản admin đầu tiên, mật khẩu cho user demo và (nếu cần) `DB_URL`. Spring Boot đọc file trực tiếp, nên **cách làm giống hệt nhau trên macOS và Windows**, không cần `export` hay `set` biến môi trường.

Tạo file từ bản mẫu:

**macOS**:

```bash
cp backend/springboot/.env.local.example backend/springboot/.env.local
```

**Windows – PowerShell**:

```powershell
Copy-Item backend\springboot\.env.local.example backend\springboot\.env.local
```

**Windows – CMD**:

```bat
copy backend\springboot\.env.local.example backend\springboot\.env.local
```

Mở `backend/springboot/.env.local` và sửa lại các giá trị:

```properties
BOOTSTRAP_ADMIN_EMAIL=admin@vju.local
BOOTSTRAP_ADMIN_PASSWORD=mat-khau-admin-cua-ban
DEMO_USER_PASSWORD=mat-khau-demo-cua-ban
# Bỏ dấu # nếu PostgreSQL chạy ở cổng khác 5432:
# DB_URL=jdbc:postgresql://localhost:5433/club
```

- `.env.local` đã nằm trong `.gitignore`, nên **không bao giờ bị commit**.
- Mật khẩu cần từ 8 ký tự trở lên và tối đa 72 byte (giới hạn của BCrypt; mỗi chữ có dấu chiếm 2–3 byte).
- Biến môi trường thật, nếu có đặt, luôn được ưu tiên hơn giá trị trong `.env.local`.
- Không tạo file này cũng được: backend vẫn chạy, chỉ là không có admin và dữ liệu demo.

## 4. Chạy backend

**macOS**:

```bash
cd backend/springboot
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

**Windows – PowerShell** (bắt buộc đặt tham số `-D...` trong dấu nháy kép; nếu không, PowerShell sẽ cắt tham số ở dấu chấm):

```powershell
cd backend\springboot
.\mvnw.cmd spring-boot:run "-Dspring-boot.run.profiles=local"
```

**Windows – CMD**:

```bat
cd backend\springboot
mvnw.cmd spring-boot:run -Dspring-boot.run.profiles=local
```

Khi log hiện dòng `Started ClubApplication`, backend đã sẵn sàng ở `http://localhost:8080`. Khi khởi động, backend sẽ:

- Tự chạy migration Flyway (`src/main/resources/db/migration`) để tạo hoặc cập nhật schema.
- Tạo admin theo `BOOTSTRAP_ADMIN_*` và gán vai trò `SYSTEM_ADMIN`. Nếu admin đã tồn tại thì bỏ qua.
- Nếu có `DEMO_USER_PASSWORD`: tạo CLB demo `VJUA` cùng 4 ban và các user `demo.a`, `demo.b`, `demo.c`, `demo.student` (`@vju.local`). Việc này chỉ làm một lần.

Dừng backend bằng `Ctrl + C`.

**Vì sao phải dùng profile `local`:** ngoài `local` (và `test`), backend **bắt buộc** biến môi trường `JWT_SECRET` dài ít nhất 32 byte, và sẽ từ chối khởi động nếu thiếu. Profile `local` có sẵn một secret chỉ dùng cho phát triển.

## 5. Kiểm tra backend đã chạy

Mở trình duyệt:

- Swagger UI: <http://localhost:8080/swagger-ui.html>
- Danh mục API: <http://localhost:8080/api/v1/api-catalog>

Cách thử trên Swagger:
1. Gọi `POST /api/v1/auth/login` với email và mật khẩu admin trong `.env.local`.
2. Copy giá trị `tokens.accessToken` trong kết quả.
3. Bấm **Authorize**, dán token vào. Sau đó mọi route khác đều gọi được.

Đăng nhập từ terminal:

**macOS**:

```bash
curl -s -X POST http://localhost:8080/api/v1/auth/login -H "Content-Type: application/json" -d '{"email":"admin@vju.local","password":"mat-khau-admin-cua-ban"}'
```

**Windows – PowerShell**:

```powershell
Invoke-RestMethod -Method Post -Uri http://localhost:8080/api/v1/auth/login -ContentType "application/json" -Body '{"email":"admin@vju.local","password":"mat-khau-admin-cua-ban"}'
```

Trên Windows PowerShell 5, lệnh `curl` thực chất là `Invoke-WebRequest`. Nếu muốn dùng curl thật, gõ `curl.exe`.

Ngoài ra có thể chạy bộ kiểm tra auth/refresh token bằng Postman CLI (`npm install -g postman-cli`), xem `docs/api/postman/`.

## 6. Chạy test

Test cần **Docker Desktop đang chạy**: integration test tự bật một container PostgreSQL 16 qua Testcontainers, rồi tự xoá khi xong. Không cần chạy `docker compose` trước.

**macOS**:

```bash
cd backend/springboot
./mvnw test
```

**Windows – PowerShell**:

```powershell
cd backend\springboot
.\mvnw.cmd test
```

**Windows – CMD**:

```bat
cd backend\springboot
mvnw.cmd test
```

Chạy một lớp test hoặc một test cụ thể (trên PowerShell nhớ đặt trong dấu nháy kép):

```bash
./mvnw test -Dtest=AuthApiTest
```

```powershell
.\mvnw.cmd test "-Dtest=AuthApiTest#refreshRotatesTokensAndOldOneBecomesUseless"
```

Muốn chạy test trên một database có sẵn thay vì Testcontainers, khởi động DB test (`docker compose -f docker-compose.test.yml up -d`, cổng 55432) rồi đặt biến `TEST_DB_URL=jdbc:postgresql://localhost:55432/club_test` trước khi chạy test.

## 7. Build file JAR và Docker image

**macOS**:

```bash
cd backend/springboot
./mvnw package -DskipTests
```

**Windows – PowerShell**:

```powershell
cd backend\springboot
.\mvnw.cmd package "-DskipTests"
```

File JAR được tạo tại `target/club-backend-0.0.1-SNAPSHOT.jar`. Khi chạy JAR **không** dùng profile `local`, phải tự cung cấp `JWT_SECRET` và thông tin database:

**macOS**:

```bash
JWT_SECRET='mot-chuoi-ngau-nhien-dai-it-nhat-32-ky-tu' DB_URL=jdbc:postgresql://localhost:5432/club java -jar target/club-backend-0.0.1-SNAPSHOT.jar
```

**Windows – PowerShell**:

```powershell
$env:JWT_SECRET="mot-chuoi-ngau-nhien-dai-it-nhat-32-ky-tu"; $env:DB_URL="jdbc:postgresql://localhost:5432/club"; java -jar target\club-backend-0.0.1-SNAPSHOT.jar
```

Docker image (lệnh giống nhau trên mọi hệ điều hành, chạy từ thư mục gốc repo):

```bash
docker build -t club-backend backend/springboot
```

## 8. Xử lý sự cố thường gặp

| Triệu chứng | Nguyên nhân và cách xử lý |
|---|---|
| `java: command not found` / `'java' is not recognized` | JDK chưa cài, hoặc terminal được mở trước khi cài. Mở lại terminal. Trên Windows, kiểm tra biến `JAVA_HOME` trỏ đúng thư mục JDK 21. |
| `release version 21 not supported` | Máy đang dùng JDK cũ. `java -version` phải là 21. Trên macOS có thể chọn bằng `export JAVA_HOME=$(/usr/libexec/java_home -v 21)`. |
| `zsh: permission denied: ./mvnw` (macOS) | Chạy `chmod +x mvnw` trong `backend/springboot` một lần. |
| `/bin/sh^M: bad interpreter` khi chạy `./mvnw` | File `mvnw` bị đổi sang kiểu xuống dòng của Windows. Repo đã khai báo trong `.gitattributes` để `mvnw` luôn dùng LF; clone lại hoặc chạy `git checkout -- mvnw`. |
| PowerShell báo `Unknown lifecycle phase ".run.profiles=local"` | Thiếu dấu nháy kép quanh tham số `-D...`. Dùng `"-Dspring-boot.run.profiles=local"`. |
| `Connection to localhost:5432 refused` | PostgreSQL chưa chạy (xem bước 2), hoặc chạy ở cổng khác mà chưa khai báo `DB_URL` trong `.env.local`. |
| `password authentication failed for user "club"` | Cổng 5432 đang là một PostgreSQL khác cài sẵn trên máy, không phải container. Chạy container ở cổng 5433 và đặt `DB_URL` (bước 2 và 3). |
| `Bind for 0.0.0.0:5432 failed: port is already allocated` | Cổng 5432 đã bị chiếm. Xem tiến trình đang dùng cổng: macOS `lsof -nP -iTCP:5432 -sTCP:LISTEN`, Windows `netstat -ano \| findstr :5432`. Hoặc dùng cổng 5433 như ở bước 2. |
| `Port 8080 was already in use` | Một backend khác đang chạy. Tắt nó đi, hoặc thêm `SERVER_PORT=8081` vào `.env.local`. |
| `app.security.jwt.secret is not configured` | Đang chạy mà không bật profile `local`. Thêm `-Dspring-boot.run.profiles=local`, hoặc đặt biến `JWT_SECRET`. |
| Không đăng nhập được bằng tài khoản admin | `.env.local` không nằm đúng chỗ (phải là `backend/springboot/.env.local`), hoặc backend không được chạy từ thư mục `backend/springboot`. Nếu admin đã được tạo trước đó với mật khẩu khác, việc sửa `.env.local` sẽ không đổi mật khẩu cũ. |
| Test báo `Could not find a valid Docker environment` | Docker Desktop chưa mở. Trên Windows, kiểm tra Docker Desktop đang dùng WSL 2 backend. |
| `Validate failed: Migrations have failed validation` | Một file migration đã chạy bị sửa sau đó. Không bao giờ sửa migration cũ; hãy thêm file `V<n>__...sql` mới. Với DB dev có thể xoá làm lại bằng `docker compose down -v` (**mất toàn bộ dữ liệu dev**). |

## 9. Tham khảo

### Biến cấu hình

Có thể đặt trong `.env.local` (chỉ khi chạy profile `local`) hoặc qua biến môi trường.

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DB_URL` / `DB_USERNAME` / `DB_PASSWORD` | `jdbc:postgresql://localhost:5432/club` / `club` / `club_local` | Kết nối PostgreSQL |
| `SERVER_PORT` | `8080` | Cổng HTTP |
| `JWT_SECRET` | có sẵn khi chạy `local`; **bắt buộc** ở mọi môi trường khác | Khoá ký JWT, tối thiểu 32 byte |
| `JWT_ACCESS_TOKEN_TTL` / `JWT_REFRESH_TOKEN_TTL` | `15m` / `30d` | Thời hạn token |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | trống | Admin đầu tiên (chỉ profile `local`) |
| `DEMO_USER_PASSWORD` / `DEMO_DATA_ENABLED` | trống / `true` | Dữ liệu demo VJUA (chỉ profile `local`) |
| `RATE_LIMIT_MAX_REQUESTS` / `RATE_LIMIT_WINDOW` | `60` / `1m` | Giới hạn đăng nhập/đăng ký/refresh theo IP |

### Mô hình lỗi

Mọi lỗi trả về `application/problem+json` kèm trường `code` cố định. Lỗi của framework giữ đúng HTTP status (`NOT_FOUND`, `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE`, `VALIDATION_ERROR`). Khi hai request đồng thời cùng vi phạm ràng buộc duy nhất, request thua nhận `409` với cùng mã lỗi như lúc kiểm tra thông thường (ví dụ `EMAIL_ALREADY_EXISTS`). Người không có quyền global nhận `403` với ID không tồn tại, nên không dò được ID nào có thật.

### Tài liệu khác

- Cấu trúc module, quy ước (DTO, MapStruct, Lombok, `@RequirePermission`) và danh sách API: [README gốc](../../README.md)
- Database và migration: [docs/database/README.md](../../docs/database/README.md)
- OpenAPI contract: [docs/api/openapi.yaml](../../docs/api/openapi.yaml)
