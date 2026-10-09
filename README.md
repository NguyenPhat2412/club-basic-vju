# club-basic-vju

Hệ thống quản lý câu lạc bộ (CLB) cho Trường Đại học Việt Nhật (VJU): quản lý tài khoản, câu lạc bộ, ban, thành viên và phân quyền chi tiết theo phạm vi.

> **Trạng thái:** Phase 2 đã hoàn thiện luồng khám phá CLB → đăng ký → xét duyệt → membership → phân ban → thông báo và audit. Backend có automated unit/integration/acceptance tests; frontend Next.js có các màn hình student và management tương ứng.

## Mục lục

- [Tính năng](#tính-năng)
- [Công nghệ](#công-nghệ)
- [Cấu trúc thư mục](#cấu-trúc-thư-mục)
- [Bắt đầu nhanh](#bắt-đầu-nhanh)
- [Cấu hình](#cấu-hình)
- [Tổng quan API](#tổng-quan-api)
- [Phân quyền](#phân-quyền)
- [Quy ước API](#quy-ước-api)
- [Cơ sở dữ liệu](#cơ-sở-dữ-liệu)
- [Kiểm thử](#kiểm-thử)
- [Docker và CI](#docker-và-ci)
- [Quy trình phát triển](#quy-trình-phát-triển)
- [Tài liệu liên quan](#tài-liệu-liên-quan)

## Tính năng

- **Xác thực:** đăng ký, đăng nhập, đăng xuất, đổi mật khẩu. Hệ thống dùng JWT access token (15 phút) kèm refresh token (30 ngày) được xoay vòng sau mỗi lần dùng và chỉ lưu dạng hash.
- **Người dùng:** xem và sửa hồ sơ cá nhân, tìm kiếm và sắp xếp danh sách người dùng, khoá hoặc mở tài khoản. Tài khoản bị khoá mất quyền truy cập ngay lập tức.
- **Câu lạc bộ:** tạo, sửa, tìm kiếm, bật/tắt hoạt động. Mã CLB là duy nhất, không phân biệt hoa thường.
- **Ban:** mỗi CLB có nhiều ban. Tên ban là duy nhất trong phạm vi một CLB.
- **Thành viên:** thêm thành viên vào CLB, tạm ngưng, cho rời CLB. Hệ thống lưu **lịch sử** tham gia: mỗi lần tham gia là một membership riêng, người đã rời có thể được thêm lại. Khi rời CLB, thành viên tự động bị gỡ khỏi mọi ban.
- **Thành viên ban:** xếp thành viên vào ban, chuyển ban, gỡ khỏi ban. Chỉ xếp được thành viên đang hoạt động vào ban cùng CLB.
- **Phân quyền:** 35 quyền, mỗi quyền được cấp theo một trong ba phạm vi `GLOBAL`, `CLUB` hoặc `DEPARTMENT`. Mọi lần cấp và thu hồi đều được ghi audit log.
- **Vai trò:** vai trò là nhóm quyền ứng với một chức vụ. Có 5 vai trò hệ thống (Quản trị hệ thống, Chủ nhiệm, Phó chủ nhiệm, Trưởng ban, Thành viên); admin có thể tạo thêm vai trò tuỳ chỉnh. Vai trò được gán theo cùng cơ chế scope như quyền.
- **Audit log:** mọi thao tác nghiệp vụ quan trọng (khoá/mở tài khoản, tạo/sửa CLB và ban, thêm/xoá thành viên, cấp/thu hồi quyền và vai trò…) đều được ghi lại, kèm người thực hiện, thời điểm và giá trị trước/sau. Tra cứu qua `GET /audit-logs`.
- **Bảo vệ:** giới hạn tần suất (rate limit) cho các endpoint đăng nhập/đăng ký/làm mới token. Mọi lỗi trả về theo định dạng RFC 7807. Người không có quyền không thể dò xem một ID có tồn tại hay không.

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Backend | Java 21, Spring Boot 4.1.1 (Web MVC, Security, OAuth2 Resource Server, Data JPA, Validation) |
| Cơ sở dữ liệu | PostgreSQL 16, Flyway |
| Xác thực | JWT HS256 (Nimbus), BCrypt |
| Tài liệu API | OpenAPI 3.1, springdoc / Swagger UI |
| Frontend | Next.js 16, React 19, TypeScript, pnpm |
| Kiểm thử | JUnit 5, Mockito, Spring MockMvc trên PostgreSQL thật (Testcontainers); Python `unittest` cho contract |
| Hạ tầng | Docker, Docker Compose, GitHub Actions |

## Cấu trúc thư mục

```text
.
├── backend/springboot/          # Backend Spring Boot (dịch vụ duy nhất)
│   ├── src/main/java/com/vju/club/
│   │   ├── modules/             # Mỗi tính năng một module (xem cấu trúc module bên dưới)
│   │   │   ├── auth/            # Đăng ký, đăng nhập, JWT, refresh token
│   │   │   ├── user/            # Hồ sơ và quản trị người dùng
│   │   │   ├── club/            # Câu lạc bộ
│   │   │   ├── clubapplication/ # Đơn xin vào CLB, duyệt/từ chối
│   │   │   ├── department/      # Ban
│   │   │   ├── membership/      # Thành viên CLB
│   │   │   ├── departmentmember/# Thành viên ban
│   │   │   ├── permission/      # Cấp/thu hồi quyền, quyền hiệu lực
│   │   │   ├── role/            # Vai trò và gán vai trò
│   │   │   ├── notification/    # Thông báo
│   │   │   └── audit/           # Ghi và tra cứu audit log
│   │   ├── security/            # Kiểm tra quyền, rate limit, filter trạng thái tài khoản
│   │   ├── config/              # Cấu hình ứng dụng: security, JWT, CORS, OpenAPI (không chứa DTO)
│   │   ├── error/               # Xử lý lỗi chung (ProblemDetail)
│   │   ├── common/              # Phân trang (PageResponse, OffsetLimitRequest)
│   │   ├── bootstrap/           # Admin ban đầu và dữ liệu demo (chỉ profile local)
│   │   └── rest/                # API catalog, phục vụ file OpenAPI
│   ├── src/main/resources/
│   │   ├── db/migration/        # Flyway: V1–V6 nền tảng, V7 club applications, V8 notifications
│   │   └── api/                 # Bản copy runtime của OpenAPI và catalog
│   ├── src/test/                # Unit test + integration test
│   └── Dockerfile
├── frontend/nextjs/             # Frontend Next.js: discovery, applications, memberships, management, notifications
├── docs/
│   ├── api/                     # OpenAPI contract (nguồn gốc), catalog, test contract
│   ├── database/                # Hướng dẫn database
│   └── superpowers/             # Spec và kế hoạch thiết kế
├── inf/                         # Chỗ dành cho cấu hình docker/nginx/postgres (chưa dùng)
├── docker-compose.yml           # PostgreSQL cho phát triển (cổng 5432)
├── docker-compose.test.yml      # PostgreSQL cho kiểm thử (cổng 55432, dữ liệu trên tmpfs)
└── .github/workflows/backend.yml
```

Mỗi module trong `modules/` theo cùng một khuôn:

```text
modules/<module>/
├── controller/          # REST controller: chỉ nhận và trả DTO, không bao giờ để lộ entity
├── service/             # Interface service (API của module)
│   └── impl/            # XxxServiceImpl: nghiệp vụ, kiểm tra quyền, audit
├── dto/
│   ├── request/         # Java record cho request body, kèm Bean Validation
│   └── response/        # Java record cho response, bất biến và không phụ thuộc entity
├── mapper/              # MapStruct: entity → DTO, code sinh lúc compile
├── entity/              # JPA entity, chỉ dùng bên trong service/repository
├── enums/               # Enum dùng chung cho entity, DTO và controller
├── repository/          # Spring Data repository
├── specification/       # JPA Specification cho tìm kiếm động (nếu có)
├── annotation/          # Annotation validation riêng của module
└── common/              # Hằng số của module
```

Quy ước:
- **Chỉ làm việc với DTO ở ranh giới API.** Controller và interface service chỉ nhận/trả `record` trong `dto/`. Entity chỉ tồn tại bên trong service và repository.
- **DTO là Java `record`**: ngắn gọn, bất biến, không có logic. Response DTO không biết đến entity.
- **Chuyển entity → DTO bằng MapStruct** (`mapper/`), không dùng ModelMapper hay ObjectMapper. Mapper được sinh lúc compile và là Spring bean. Build được cấu hình `unmappedTargetPolicy=ERROR`, nên nếu thêm một trường vào DTO mà quên map thì compile sẽ báo lỗi ngay, thay vì lặng lẽ trả `null`.
- **Validation** đặt trên request DTO: `@NotBlank` cho chuỗi bắt buộc, `@NotNull` cho UUID/enum/số và collection được phép rỗng, `@NotEmpty` cho collection phải có phần tử, `@Size`/`@Pattern`/`@URL` để giới hạn độ dài và định dạng. Mật khẩu dùng `@ValidPassword` (8 ký tự trở lên, tối đa 72 byte UTF-8 theo giới hạn của BCrypt).

- **Service không phụ thuộc Spring Security:** controller nhận tham số `Actor` (người đang gọi, lấy từ JWT qua `ActorArgumentResolver`) và truyền xuống service. Nhờ vậy service unit test được bằng một `Actor` giả, không cần dựng security context.
- **Kiểm tra quyền** nằm trong service và dùng chung `PermissionAuthorizationService`, vốn đọc view `effective_user_permissions` (gộp quyền trực tiếp và quyền từ vai trò).
- **Truy vấn** đều nằm trong repository: JPQL cho truy vấn thường, SQL gốc khi cần view của PostgreSQL. Phân trang dùng `OffsetLimitRequest`.

## Bắt đầu nhanh

### Yêu cầu

- JDK 21
- Docker + Docker Compose
- Node.js 20+ và pnpm (nếu chạy frontend)
- Python 3 + PyYAML (nếu chạy test contract)

### 1. Khởi động PostgreSQL

```bash
docker compose up -d postgres
```

### 2. Chạy backend

Profile `local` cung cấp sẵn một JWT secret dùng cho phát triển:

```bash
cd backend/springboot
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Flyway tự chạy migration khi khởi động. Backend lắng nghe ở `http://localhost:8080`.

### 3. Tạo tài khoản admin đầu tiên

Migration chỉ seed danh mục quyền và vai trò hệ thống, không tạo người dùng nào. Để tự tạo admin mang vai trò `SYSTEM_ADMIN` (phạm vi `GLOBAL`), chạy profile `local` kèm hai biến môi trường. Thao tác này an toàn khi chạy lại nhiều lần.

```bash
BOOTSTRAP_ADMIN_EMAIL=admin@vju.local BOOTSTRAP_ADMIN_PASSWORD='ChangeMe123!' ./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

### 4. Dữ liệu demo (tuỳ chọn)

Đặt thêm `DEMO_USER_PASSWORD` khi chạy profile `local`, backend sẽ tạo sẵn một bộ dữ liệu demo. Việc này chỉ diễn ra một lần: nếu CLB VJUA đã tồn tại thì bỏ qua.

| Dữ liệu | Chi tiết |
|---|---|
| CLB | `VJUA` (CLB Học thuật VJU) |
| 4 ban | Ban Truyền thông, Ban Chuyên môn, Ban Hậu cần, Ban Đối ngoại |
| `demo.a@vju.local` | Chủ nhiệm VJUA (vai trò `CLUB_PRESIDENT`), thuộc Ban Chuyên môn |
| `demo.b@vju.local` | Trưởng Ban Truyền thông (vai trò `DEPARTMENT_HEAD`) |
| `demo.c@vju.local` | Thành viên Ban Truyền thông, được cấp trực tiếp `club.view` và `member.view` |
| `demo.student@vju.local` | Sinh viên ACTIVE chưa là thành viên, dùng để thử gửi và theo dõi đơn tuyển thành viên |

Cả 4 user dùng chung mật khẩu `DEMO_USER_PASSWORD`. Dữ liệu demo không bao giờ được tạo ngoài profile `local`.

### 5. Thử API

- Swagger UI: http://localhost:8080/swagger-ui.html. Đăng nhập qua `POST /api/v1/auth/login`, copy `tokens.accessToken`, rồi bấm **Authorize** để gọi các route cần xác thực.
- OpenAPI sinh tự động: http://localhost:8080/v3/api-docs
- Contract giai đoạn 1: http://localhost:8080/api-docs/phase1.yaml
- Danh mục API: http://localhost:8080/api/v1/api-catalog

```bash
curl -s -X POST localhost:8080/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"email":"admin@vju.local","password":"ChangeMe123!"}'
```

Dùng `tokens.accessToken` trong kết quả làm header `Authorization: Bearer <token>` cho các request tiếp theo.

### 6. Chạy frontend (tuỳ chọn)

```bash
cd frontend/nextjs
pnpm install
pnpm dev
```

Frontend chạy ở `http://localhost:3000`. Đây cũng là origin duy nhất mà CORS của backend cho phép.

## Cấu hình

Backend đọc cấu hình từ biến môi trường:

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `JWT_SECRET` | *(không có, bắt buộc)* | Khoá ký JWT, tối thiểu 32 byte. Thiếu biến này thì app **không khởi động**. Profile `local` có sẵn giá trị dùng cho phát triển. |
| `JWT_ACCESS_TOKEN_TTL` | `15m` | Thời hạn access token |
| `JWT_REFRESH_TOKEN_TTL` | `30d` | Thời hạn refresh token |
| `DB_URL` | `jdbc:postgresql://localhost:5432/club` | Chuỗi kết nối PostgreSQL |
| `DB_USERNAME` / `DB_PASSWORD` | `club` / `club_local` | Tài khoản database |
| `SERVER_PORT` | `8080` | Cổng HTTP |
| `RATE_LIMIT_ENABLED` | `true` | Bật/tắt rate limit |
| `RATE_LIMIT_MAX_REQUESTS` | `60` | Số request tối đa trong một cửa sổ, tính theo từng IP và từng endpoint |
| `RATE_LIMIT_WINDOW` | `1m` | Độ dài cửa sổ rate limit |
| `FORWARD_HEADERS_STRATEGY` | `native` | Chỉ tin `X-Forwarded-For` đến từ proxy có IP nội bộ/loopback, để rate limit thấy đúng IP người dùng khi chạy sau nginx |
| `REFRESH_TOKEN_CLEANUP_CRON` | `0 30 3 * * *` | Lịch chạy job dọn refresh token |
| `REFRESH_TOKEN_CLEANUP_RETENTION` | `7d` | Thời gian giữ lại refresh token đã chết trước khi xoá |
| `BOOTSTRAP_ADMIN_EMAIL` / `BOOTSTRAP_ADMIN_PASSWORD` | trống | Tạo admin ban đầu (chỉ có tác dụng ở profile `local`) |
| `DEMO_USER_PASSWORD` | trống | Mật khẩu của 3 user demo; có giá trị thì tạo dữ liệu demo (chỉ profile `local`) |
| `DEMO_DATA_ENABLED` | `true` | Tắt hẳn việc tạo dữ liệu demo |

Các biến `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT` dùng để tuỳ chỉnh container trong `docker-compose.yml`.

## Tổng quan API

Mọi route nghiệp vụ nằm dưới `/api/v1`. Chỉ các route đăng ký, đăng nhập, làm mới token, API catalog và tài liệu API là công khai; mọi route còn lại cần Bearer token.

| Nhóm | Route |
|---|---|
| **Auth** | `POST /auth/register` · `POST /auth/login` · `POST /auth/refresh-token` · `POST /auth/logout` · `POST /auth/change-password` · `GET /auth/me` |
| **Users** | `GET /users/me` · `PATCH /users/me` · `GET /users` · `GET /users/{userId}` · `PATCH /users/{userId}/status` |
| **Clubs** | `GET /clubs` · `POST /clubs` · `GET /clubs/{clubId}` · `PATCH /clubs/{clubId}` · `PATCH /clubs/{clubId}/status` |
| **Departments** | `GET /clubs/{clubId}/departments` · `POST /clubs/{clubId}/departments` · `GET /departments/{id}` · `PATCH /departments/{id}` · `PATCH /departments/{id}/status` |
| **Memberships** | `GET /clubs/{clubId}/memberships` (lọc `?status=`) · `POST /clubs/{clubId}/memberships` · `GET /memberships/{id}` · `PATCH /memberships/{id}` · `DELETE /memberships/{id}` |
| **Department members** | `GET /departments/{id}/members` · `POST /departments/{id}/members` · `PATCH /departments/{id}/members/{membershipId}` (chuyển ban) · `DELETE /departments/{id}/members/{membershipId}` |
| **Permissions** | `GET /permissions` · `GET /users/me/permissions` · `GET /users/{userId}/permissions` · `POST /users/{userId}/permissions` · `DELETE /users/{userId}/permissions/{permissionId}` · `GET /users/me/effective-permissions` · `GET /users/{userId}/effective-permissions` · `GET /permissions/groups` · `PUT /users/{userId}/permissions` |
| **Roles** | `GET /roles` · `POST /roles` · `GET /roles/{roleId}` · `PATCH /roles/{roleId}` · `GET /users/me/roles` · `GET /users/{userId}/roles` · `POST /users/{userId}/roles` · `DELETE /users/{userId}/roles/{assignmentId}` |
| **Audit** | `GET /audit-logs` (lọc theo `resourceType`, `resourceId`, `actorUserId`, `clubId`, `action`) |
| **Khác** | `GET /api-catalog` · `GET /api-docs/phase1.yaml` |

Chi tiết request/response nằm trong [docs/api/openapi.yaml](docs/api/openapi.yaml).

## Phân quyền

### Phạm vi và cơ chế kế thừa

Mỗi quyền được khai báo với một phạm vi mặc định. Khi cấp cho người dùng, quyền có thể được cấp ở **đúng phạm vi đó hoặc một phạm vi rộng hơn**, theo thứ tự `DEPARTMENT` < `CLUB` < `GLOBAL`:

- Cấp một quyền cấp ban (ví dụ `department.update`) ở phạm vi `CLUB` thì quyền đó áp dụng cho **mọi ban của CLB ấy**.
- Cấp ở phạm vi `GLOBAL` thì quyền áp dụng trên toàn hệ thống.
- Cấp hẹp hơn phạm vi mặc định bị từ chối với lỗi `PERMISSION_SCOPE_MISMATCH`.

Khi kiểm tra quyền, hệ thống xét lần lượt grant cấp ban, rồi grant cấp CLB, rồi grant global. Mỗi grant có thể là **quyền cấp trực tiếp** hoặc **quyền đến từ một vai trò** đang được gán. Quyền hoặc vai trò bị thu hồi hay vô hiệu hoá mất hiệu lực ngay lập tức.

`GET /users/me/effective-permissions` trả toàn bộ quyền người dùng đang thực sự có (kèm nguồn `DIRECT`/`ROLE`), để frontend ẩn/hiện chức năng.

### Vai trò

Vai trò là một nhóm quyền. Mỗi vai trò có phạm vi hẹp nhất có thể gán; vai trò chỉ được chứa các quyền có phạm vi bằng hoặc hẹp hơn phạm vi của nó. Ví dụ, vai trò cấp CLB không chứa được `user.view`.

| Vai trò hệ thống | Phạm vi | Quyền |
|---|---|---|
| `SYSTEM_ADMIN` | GLOBAL | Tất cả |
| `CLUB_PRESIDENT` | CLUB | `club.view`, `club.update`, mọi quyền `department.*`, `member.*`, `department.member.*` |
| `CLUB_VICE_PRESIDENT` | CLUB | `club.view`, `department.view`, `member.view`, `member.view_detail`, `member.add`, `member.update`, `department.member.*` |
| `DEPARTMENT_HEAD` | DEPARTMENT | `department.update`, `department.member.*` |
| `CLUB_MEMBER` | CLUB | `club.view`, `department.view`, `member.view` |

Vai trò hệ thống không sửa được qua API. Vai trò tuỳ chỉnh (tạo bằng quyền `role.manage`) có thể sửa tập quyền hoặc tắt đi, và thay đổi có hiệu lực ngay với mọi người đang giữ vai trò đó. Gán và thu hồi vai trò cần `permission.assign`/`permission.revoke`, và cũng được ghi audit log.

### Danh mục quyền

| Module | Quyền (phạm vi mặc định) |
|---|---|
| user | `user.view`, `user.update`, `user.active`, `user.inactive` (GLOBAL) |
| club | `club.create` (GLOBAL); `club.view`, `club.update`, `club.active`, `club.inactive` (CLUB) |
| department | `department.view`, `department.create` (CLUB); `department.update`, `department.activate`, `department.inactive` (DEPARTMENT) |
| member | `member.view`, `member.view_detail`, `member.add`, `member.update`, `member.remove` (CLUB) |
| department.member | `department.member.view`, `department.member.add`, `department.member.remove` (DEPARTMENT) |
| permission | `permission.view`, `permission.assign`, `permission.revoke` (GLOBAL) |
| role | `role.view`, `role.manage` (GLOBAL) |
| audit | `audit.view` (GLOBAL) |

Chuyển thành viên sang ban khác cần `department.member.remove` ở ban nguồn **và** `department.member.add` ở ban đích.

## Quy ước API

### Định dạng lỗi

Mọi lỗi trả về `application/problem+json` kèm trường `code` ổn định để frontend xử lý:

```json
{ "title": "CLUB_CODE_ALREADY_EXISTS", "status": 409, "detail": "Club code is already used", "code": "CLUB_CODE_ALREADY_EXISTS" }
```

| HTTP | Mã lỗi thường gặp |
|---|---|
| 400 | `VALIDATION_ERROR`, `INVALID_SORT`, `CURRENT_PASSWORD_INVALID`, `PERMISSION_SCOPE_MISMATCH`, `INVALID_PERMISSION_SCOPE`, `ROLE_SCOPE_MISMATCH`, `ROLE_PERMISSION_SCOPE_MISMATCH`, `INVALID_SCOPE_TARGET`, `ROLE_INACTIVE`, `CROSS_CLUB_ASSIGNMENT`, `CROSS_CLUB_MOVE`, `SAME_DEPARTMENT`, `AMBIGUOUS_PERMISSION_GRANT` |
| 401 | `UNAUTHORIZED`, `AUTH_TOKEN_EXPIRED` (access token hết hạn, nên gọi refresh), `INVALID_CREDENTIALS`, `INVALID_REFRESH_TOKEN` |
| 403 | `PERMISSION_DENIED`, `ACCOUNT_INACTIVE` |
| 404 | `NOT_FOUND` (route không tồn tại), `USER_NOT_FOUND`, `CLUB_NOT_FOUND`, `DEPARTMENT_NOT_FOUND`, `MEMBERSHIP_NOT_FOUND`, `CLUB_APPLICATION_NOT_FOUND`, … |
| 405 / 415 | `METHOD_NOT_ALLOWED`, `UNSUPPORTED_MEDIA_TYPE` |
| 409 | `EMAIL_ALREADY_EXISTS`, `STUDENT_CODE_ALREADY_EXISTS`, `CLUB_CODE_ALREADY_EXISTS`, `DEPARTMENT_NAME_ALREADY_EXISTS`, `MEMBERSHIP_ALREADY_EXISTS`, `ALREADY_CLUB_MEMBER`, `APPLICATION_ALREADY_PENDING`, `APPLICATION_ALREADY_REVIEWED`, `APPLICATION_CANNOT_BE_CANCELLED`, `DUPLICATE_MEMBERSHIP`, `CLUB_INACTIVE`, `USER_INACTIVE`, `DEPARTMENT_INACTIVE`, `MEMBERSHIP_NOT_ACTIVE`, `MEMBERSHIP_ALREADY_LEFT`, `PERMISSION_ALREADY_GRANTED`, `ROLE_ALREADY_ASSIGNED`, `ROLE_CODE_ALREADY_EXISTS`, `SYSTEM_ROLE_IMMUTABLE` |
| 429 | `RATE_LIMIT_EXCEEDED`, kèm các header `Retry-After`, `X-RateLimit-Limit` và `X-RateLimit-Remaining` |
| 500 | `INTERNAL_ERROR` (lỗi được ghi log ở server) |

Một số hành vi cần lưu ý:
- Khi hai request đồng thời cùng vi phạm ràng buộc duy nhất, request thua nhận 409 với cùng mã lỗi như lúc kiểm tra thông thường, không bao giờ ra 500.
- Với ID không tồn tại, chỉ người giữ quyền ở phạm vi `GLOBAL` nhận 404; người khác nhận 403. Nhờ vậy không ai dò được ID nào có thật.
- Đăng nhập sai mật khẩu và dùng email không tồn tại cho ra cùng một phản hồi. Lỗi `ACCOUNT_INACTIVE` chỉ hiện khi người đăng nhập nhập đúng mật khẩu.

### Phân trang

Các endpoint danh sách nhận `offset` (≥ 0, mặc định 0) và `limit` (1–100, mặc định 20). Giá trị ngoài khoảng bị trả 400. Kết quả có dạng:

```json
{ "items": [ ... ], "total": 42, "offset": 0, "limit": 20 }
```

`GET /users` nhận thêm `query`, `orderBy` (`email` | `fullName` | `createdAt` | `status`) và `orderType` (`asc` | `desc`).

## Cơ sở dữ liệu

Flyway quản lý schema tại `backend/springboot/src/main/resources/db/migration/`:

| Migration | Nội dung |
|---|---|
| `V1__create_phase1_schema.sql` | 8 bảng `users`, `clubs`, `departments`, `memberships`, `department_members`, `permissions`, `user_permissions`, `permission_audit_logs`; seed 25 quyền |
| `V2__create_refresh_tokens.sql` | Bảng `refresh_tokens` (chỉ lưu SHA-256 của token) |
| `V3__harden_constraints_and_indexes.sql` | Chuyển các ràng buộc nghiệp vụ xuống tầng DB và bổ sung index (chi tiết bên dưới) |
| `V4__membership_history.sql` | Lưu lịch sử tham gia: mỗi user chỉ có tối đa một membership chưa kết thúc cho mỗi CLB |
| `V5__roles.sql` | Bảng `roles`, `role_permissions`, `user_roles`; view `effective_user_permissions`; seed 5 vai trò hệ thống và 2 quyền `role.*` |
| `V6__audit_log_and_membership_timestamps.sql` | Bảng `audit_logs` (chỉ được thêm, không sửa/xoá), `created_at`/`updated_at` cho membership, quyền `audit.view` |
| `V7__club_applications.sql` | Bảng đơn đăng ký CLB, giới hạn trạng thái/nội dung, partial unique index cho đơn PENDING, 7 quyền application và audit resource `APPLICATION` |

Ràng buộc được đặt ngay ở tầng database, nên dữ liệu sai bị chặn kể cả khi ghi bằng SQL trực tiếp hoặc khi nhiều request chạy đồng thời:
- **Duy nhất, không phân biệt hoa thường:** email, mã sinh viên, mã CLB, và tên ban trong một CLB (unique index trên `lower(...)`). Mỗi user chỉ có tối đa một membership **chưa kết thúc** trong một CLB; các membership đã `LEFT` được giữ làm lịch sử.
- **Thành viên ban luôn cùng CLB:** `department_members.club_id` được ràng buộc bằng khoá ngoại ghép tới cả `departments(id, club_id)` lẫn `memberships(id, club_id)`, nên không thể xếp người vào ban của CLB khác.
- **CHECK** cho các cột trạng thái; cho quan hệ scope ↔ `club_id`/`department_id`; cho quy tắc `left_at` có giá trị **khi và chỉ khi** membership ở trạng thái `LEFT`; cho `permission_key = module.action`; và cho quy tắc `revoked_by` chỉ có khi đã có `revoked_at`.
- **Partial unique index** để một quyền hoặc vai trò không thể được cấp trùng khi grant cũ vẫn còn hiệu lực.
- **Trigger phạm vi:** grant quyền hoặc gán vai trò hẹp hơn phạm vi cho phép bị từ chối; vai trò không chứa được quyền rộng hơn phạm vi của nó.
- **Audit log bất biến:** không xoá được CLB hoặc ban đã có lịch sử phân quyền. Hệ thống chỉ khoá mềm bằng cột `status`.
- **Index:** mọi cột khoá ngoại đều có index; có index `(club_id, joined_at)` và `(department_id, joined_at)` cho các danh sách; và tìm theo email/mã CLB dùng được index nhờ truy vấn qua `lower(...)`.
- **Trigger `updated_at`:** cột này luôn được cập nhật, kể cả khi sửa dữ liệu ngoài ứng dụng.

Refresh token đã hết hạn hoặc bị thu hồi được một job dọn mỗi ngày lúc 03:30, sau khi giữ lại 7 ngày. Có thể chỉnh bằng `REFRESH_TOKEN_CLEANUP_CRON` và `REFRESH_TOKEN_CLEANUP_RETENTION`.

Khi chạy, Hibernate chỉ `validate` schema chứ không tự sửa. Mọi thay đổi schema phải đi qua một migration mới, và không được sửa migration đã chạy. Xem thêm [docs/database/README.md](docs/database/README.md).

## Kiểm thử

```bash
# 382 test backend: unit + integration (cần Docker đang chạy)
cd backend/springboot && ./mvnw test

# Kiểm tra OpenAPI contract (từ thư mục gốc)
python3 -m unittest discover -s docs/api/tests
```

- **Unit test:** kiểm tra logic auth, JWT, cấu hình secret/issuer, kiểm tra quyền, rate limit, bootstrap admin, và báo lỗi khi bản copy OpenAPI trong code lệch với bản trong `docs/`.
- **Integration test** (`src/test/java/com/vju/club/integration`): gọi API thật qua MockMvc trên PostgreSQL thật. Mỗi lần chạy dùng một schema riêng; base class `ApiIntegrationTest` dựng sẵn user `admin` (có mọi quyền) và `member` (không có quyền nào), cùng các CLB A/B và ban A1/A2/B1. Bộ test phủ:
  - Mọi endpoint, bao gồm các trường hợp biên và phân trang.
  - Phân quyền theo phạm vi.
  - Nhiều request đồng thời (race condition).
  - Token giả mạo hoặc hết hạn.
  - SQL injection.
  - Rate limit.

Integration test tự bật một container PostgreSQL 16 bằng **Testcontainers** (dùng chung cho cả lượt chạy, tự xoá khi xong), nên chỉ cần Docker đang chạy. Muốn dùng một database có sẵn, ví dụ `docker compose -f docker-compose.test.yml up -d` (cổng 55432), thì đặt `TEST_DB_URL=jdbc:postgresql://localhost:55432/club_test`, cùng `TEST_DB_USERNAME`/`TEST_DB_PASSWORD` nếu khác mặc định.

## Docker và CI

Build và chạy image backend:

```bash
docker build -t club-backend backend/springboot
docker run -p 8080:8080 \
  -e JWT_SECRET='<ít nhất 32 ký tự ngẫu nhiên>' \
  -e DB_URL=jdbc:postgresql://host.docker.internal:5432/club \
  club-backend
```

Container chạy bằng user thường (uid 10001), không dùng root.

GitHub Actions ([.github/workflows/backend.yml](.github/workflows/backend.yml)) chạy mỗi khi push lên `main` và cho mọi pull request. Workflow gồm: toàn bộ test backend (PostgreSQL 16 qua Testcontainers), kiểm tra contract bằng Python, và build Docker image.

## Quy trình phát triển

- **Đổi API:** sửa [docs/api/openapi.yaml](docs/api/openapi.yaml) và [docs/api/catalog.yml](docs/api/catalog.yml) trước, rồi copy sang `backend/springboot/src/main/resources/api/` (`phase1-openapi.yaml`, `catalog.yml`). Cả test Java lẫn test Python đều báo lỗi nếu hai bản lệch nhau.
- **Đổi schema:** thêm migration Flyway mới, không sửa migration đã chạy.
- **Thêm endpoint có kiểm tra quyền:** khai báo tham số `Actor actor` trong controller, rồi trong service gọi `PermissionAuthorizationService.require(actor, ...)`. Truyền cả `clubId` lẫn `departmentId` khi có để cơ chế kế thừa phạm vi hoạt động. Với ID không tồn tại, dùng `missingResource(...)`.
- **Trước khi push:** chạy `./mvnw test` và bộ test contract.

## Phase 2: Tuyển thành viên

Phase 2 bổ sung luồng:

`Student -> xem CLB ACTIVE -> gửi đơn -> theo dõi/hủy đơn -> reviewer theo scope CLB duyệt/từ chối -> APPROVED tạo Membership ACTIVE -> phân vào Department`.

Endpoint chính:

- `POST /api/v1/clubs/{clubId}/applications` tạo đơn `PENDING`.
- `GET /api/v1/users/me/applications` và `GET /api/v1/users/me/applications/{applicationId}` xem đơn của mình.
- `PATCH /api/v1/users/me/applications/{applicationId}/cancel` hủy đơn đang `PENDING`.
- `GET /api/v1/clubs/{clubId}/applications` xem đơn theo scope CLB.
- `POST /api/v1/clubs/{clubId}/applications/{applicationId}/approve` hoặc `/reject` xử lý đơn. Approve tạo Membership trong cùng transaction với cập nhật application.
- `GET /api/v1/users/me/memberships` xem lịch sử membership cá nhân.

Quyền mới gồm `application.view`, `application.view_detail`, `application.create`, `application.cancel`, `application.review`, `application.approve`, và `application.reject`; quyền quản lý đơn dùng scope `CLUB`. Applicant dùng ownership cho các thao tác cá nhân. Approval/rejection tạo thông báo in-app trong cùng transaction; người dùng đọc qua `/api/v1/users/me/notifications` và đánh dấu đã đọc qua `PATCH /api/v1/users/me/notifications/{notificationId}/read`.

Migration `V7__club_applications.sql` tạo bảng application, partial unique index ngăn hai đơn `PENDING` trùng user/CLB, seed permission, và mở rộng audit resource type `APPLICATION`. Migration `V8__notifications.sql` tạo bảng thông báo, index theo user/thời gian và trigger `updated_at`.

## Tài liệu liên quan

- [Backend README](backend/springboot/README.md): chi tiết chạy và kiểm thử backend
- [API inventory và Swagger contract](docs/api/README.md)
- [OpenAPI 3.1 contract](docs/api/openapi.yaml)
- [Hướng dẫn database](docs/database/README.md)
- [Thiết kế và kế hoạch giai đoạn 1](docs/superpowers/specs/)
