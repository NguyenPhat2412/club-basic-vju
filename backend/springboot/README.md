# VJU Clubs backend

Backend Sprint 1 cung cấp vertical slice cho authentication, profile, permission, club và membership.

## PostgreSQL bằng Docker

Từ thư mục gốc repository:

```powershell
docker compose up -d postgres
docker compose ps
```

PostgreSQL chạy tại `localhost:55432` (cổng PostgreSQL trong container vẫn là `5432`) với database `vju_club`, user `vju`, password mặc định `vju_dev_password`. Có thể thay đổi bằng các biến `POSTGRES_DB`, `POSTGRES_USER` và `POSTGRES_PASSWORD`.

## Yêu cầu môi trường

- Java 17+
- Maven 3.9+

## Chạy ứng dụng

```powershell
mvn spring-boot:run
```

API mặc định chạy tại `http://localhost:8080`.

Tài khoản quản lý demo chỉ được tạo khi bật rõ ràng trong môi trường local dùng thử:

```bash
VJU_DEMO_SEED_ENABLED=true \
VJU_DEMO_MANAGER_EMAIL=manager@example.test \
VJU_DEMO_MANAGER_PASSWORD='change-me-locally' \
mvn spring-boot:run
```

Không dùng tài khoản demo hoặc mật khẩu mặc định trong môi trường chia sẻ. Database container đã được cấu hình; dữ liệu nghiệp vụ hiện vẫn lưu trong memory cho đến khi hoàn tất migration repository sang PostgreSQL.

## API chính

- `POST /api/auth/register`
- `POST /api/auth/login`
- `GET/PATCH /api/auth/me`
- `GET/POST /api/clubs`
- `GET/PATCH /api/clubs/{clubId}`
- `GET/POST /api/clubs/{clubId}/members`
- `GET /api/permissions/catalog`
- `GET/POST/DELETE /api/permissions/users/{userId}`

Các API bảo vệ yêu cầu `Authorization: Bearer <accessToken>`. Permission được kiểm tra ở backend theo `GLOBAL`, `CLUB` hoặc `DEPARTMENT`.
