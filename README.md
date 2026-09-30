# club-basic-vju

Hệ thống quản lý câu lạc bộ cho Trường Đại học Việt Nhật.

## Trạng thái hiện tại

- Backend duy nhất: `backend/springboot` (Spring Boot 4.1.1, Java 21).
- PostgreSQL chạy local bằng Docker Compose.
- Flyway quản lý migration tại `backend/springboot/src/main/resources/db/migration/`.
- API catalog: `GET /api/v1/api-catalog`; toàn bộ 36 route giai đoạn 1 đã `IMPLEMENTED`.
- Database hiện được ghi nhận trong PostgreSQL qua Flyway. Schema đầu tiên gồm tám bảng nghiệp vụ và `flyway_schema_history`.

## Chạy local

```bash
docker compose up -d postgres
cd backend/springboot
./mvnw spring-boot:run -Dspring-boot.run.profiles=local
```

Ngoài profile `local`, backend **bắt buộc** biến môi trường `JWT_SECRET` (tối thiểu 32 byte) và sẽ không khởi động nếu thiếu.

## Kiểm thử

```bash
docker compose -f docker-compose.test.yml up -d
cd backend/springboot && ./mvnw test
python3 -m unittest discover -s docs/api/tests
```

Xem [API inventory và Swagger contract](docs/api/README.md), [OpenAPI 3.1 contract](docs/api/openapi.yaml), [database guide](docs/database/README.md) và [backend README](backend/springboot/README.md).
