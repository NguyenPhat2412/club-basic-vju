# CLAUDE.md — Quy ước Kỹ thuật & Lưu ý Quan trọng cho `CLUB-BASIC-VJU`

Tệp này tóm tắt các ràng buộc kiến trúc bắt buộc và những điểm dễ sập bẫy (*gotchas*) dành cho lập trình viên và AI agent khi làm việc trên kho mã `club-basic-vju`. Lý do chi tiết của từng quyết định nằm tại [`docs/decisions/`](docs/decisions/README.md).

## 1. Các Lệnh Xác minh Bắt buộc Trước Khi Commit / Mở PR

```bash
# 1. Cổng hợp đồng OpenAPI 3.1 + API Catalog + Controller Java (16/16 tests, < 1s)
python3 -m unittest discover -s docs/api/tests -v

# 2. Cổng Frontend: lint + typecheck + 36 unit tests (màu 60/30/10, <= 400 dòng/tệp, i18n, form)
pnpm --dir frontend run lint && pnpm --dir frontend run typecheck && pnpm --dir frontend test

# 3. Cổng Backend: unit + migration + concurrency + integration trên PostgreSQL 16 Testcontainers
cd backend/springboot && ./mvnw test
```

## 2. Ràng buộc Bất biến Không Được Vi phạm

1. **Zero Mock Data (Kiến trúc 3 tầng nghiêm ngặt):**
   - Giao diện Next.js chỉ hiển thị dữ liệu thật đọc từ REST API / STOMP WebSocket của Spring Boot trên PostgreSQL 16. Cấm đưa mảng dữ liệu giả lập vào component hoặc hook sản phẩm.
2. **Hợp đồng API Kép & `ApiPaths.java` ([ADR-003](docs/decisions/ADR-003-dual-contract-openapi-governance-and-rfc7807.md)):**
   - Cấm viết chuỗi URL trực tiếp trong `@RestController`; bắt buộc khai báo hằng số tại `backend/springboot/src/main/java/com/vju/club/common/ApiPaths.java`.
   - Mọi thay đổi endpoint/DTO phải đồng bộ cả 2 cặp tệp:
     - `docs/api/openapi.yaml` ↔ `backend/springboot/src/main/resources/api/phase1-openapi.yaml` (chuẩn OpenAPI 3.1 thuần, dùng `type: [string, 'null']`, **không** dùng `nullable: true`).
     - `docs/api/catalog.yml` ↔ `backend/springboot/src/main/resources/api/catalog.yml` (cập nhật kèm bảng tại `docs/api/README.md`).
3. **Xác thực Phiên & Thu hồi Tức thời ([ADR-001](docs/decisions/ADR-001-postgresql-stateful-sessions-and-csrf.md)):**
   - Hệ thống dùng phiên `spring_session` (`CLUB_SESSION` HttpOnly cookie) + header `X-XSRF-TOKEN`.
   - **Gotcha:** Bảng `refresh_tokens` từ `V2` đã ngưng dùng từ `V12` — tuyệt đối không viết truy vấn chạm tới `refresh_tokens` trong các luồng xóa/ẩn danh tài khoản.
4. **RBAC 3 Phạm vi & AOP Self-Invocation ([ADR-002](docs/decisions/ADR-002-three-scope-rbac-and-effective-permissions-view.md)):**
   - Mọi kiểm tra quyền đi qua `@RequirePermission` hoặc `PermissionAuthorizationService` (đọc view `effective_user_permissions`, thứ bậc `GLOBAL > CLUB > DEPARTMENT`).
   - **Gotcha:** `@RequirePermission` không chạy khi gọi nội bộ `this.otherMethod()` trong cùng một class Service, và tên tham số `clubId`/`departmentId` trong annotation phải trùng khớp tuyệt đối tên tham số method (được kiểm tra tự động bởi `RequirePermissionUsageTest`).
5. **Toàn vẹn Lịch sử & CSDL (`Flyway V1..V29` — [ADR-004](docs/decisions/ADR-004-pessimistic-event-capacity-and-pii-anonymization.md)):**
   - Không bao giờ sửa tệp migration Flyway đã tồn tại; luôn tạo bản `V<tiếp_theo>__*.sql` mới (tránh dùng khối dollar-quote `$$` nếu bên trong có ký tự dễ đụng bộ phân tích placeholder của Flyway).
   - Không dùng `@Data` của Lombok trên JPA Entity (chỉ dùng `@Getter`/`@Setter`) để tránh lỗi lazy-loading vòng lặp.
   - Cộng tác viên (`CTV`) đăng ký sự kiện **không** được tạo `Membership` hay `user_roles`; tài khoản đã phát sinh lịch sử khi xóa phải ẩn danh PII (`UserAccountPurgeSupport`), không xóa cứng.
6. **Quy tắc Giao diện Frontend ([ADR-006](docs/decisions/ADR-006-modular-nextjs-400-loc-and-cached-ai-i18n.md)):**
   - Giữ các tệp module/component gọn gàng **`≤ 400` dòng/tệp**.
   - Chỉ sử dụng token màu chuẩn 60/30/10 trong `frontend/src/styles/globals.css` (cấm mã màu hex cứng và các lớp Tailwind ngoài bảng màu như `purple`, `indigo`, `cyan`, `pink`, `blue`, `orange`...).
   - Không viết cứng hậu tố `(tuỳ chọn)` lặp trong nhãn `FormField` — cơ chế chỉ báo tự động xử lý qua `frontend/src/forms/form-field-meta.ts`.

## 3. Bản đồ Tài liệu Nhanh

- Kiến trúc tổng thể & luồng thời gian thực: [`docs/archi/README.md`](docs/archi/README.md)
- Sơ đồ ERD (`V1..V29`): [`docs/erd/README.md`](docs/erd/README.md)
- Hồ sơ Quyết định Kiến trúc (`ADR-001`..`ADR-006`): [`docs/decisions/README.md`](docs/decisions/README.md)
- Danh mục `156` REST API & STOMP WebSocket: [`docs/api/README.md`](docs/api/README.md)
- Schema & ràng buộc PostgreSQL: [`docs/database/README.md`](docs/database/README.md)
- Triển khai Stagging/Production & Sao lưu: [`docs/deploy/README.md`](docs/deploy/README.md)
