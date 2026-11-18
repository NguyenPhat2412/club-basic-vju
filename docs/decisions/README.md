# Architecture Decision Records (ADRs) — CLUB-BASIC-VJU

Thư mục này lưu trữ các **Hồ sơ Quyết định Kiến trúc (ADR)** giải thích *vì sao* các quyết định kỹ thuật trọng yếu của hệ thống Quản lý CLB Sinh viên VJU (`CLUB-BASIC-VJU`) được lựa chọn, những phương án thay thế nào đã bị loại bỏ và các hệ quả/ràng buộc mà kỹ sư hoặc AI agent cần tuân thủ khi mở rộng mã nguồn.

## Quy tắc vòng đời ADR

`PROPOSED → ACCEPTED → (SUPERSEDED hoặc DEPRECATED)`

- Không xóa ADR cũ; khi kiến trúc thay đổi (ví dụ chuyển từ JWT + `refresh_tokens` ở `V2` sang `spring_session` ở `V12`), giữ nguyên bối cảnh lịch sử và ghi nhận quyết định thay thế.
- Mọi thay đổi liên quan đến xác thực, mô hình phân quyền, hợp đồng API, giao tiếp thời gian thực hoặc cấu trúc phân tầng phải đối chiếu các ADR dưới đây trước khi sửa mã.

## Danh mục ADR hiện hành

| Mã ADR | Tiêu đề | Trạng thái | Ngày chốt | Liên kết mã nguồn / Migration chính |
|---|---|---|---|---|
| [ADR-001](ADR-001-postgresql-stateful-sessions-and-csrf.md) | Chuyển sang phiên máy chủ lưu trên PostgreSQL (`spring_session`), Cookie `HttpOnly` + CSRF và Google OAuth2 `@st.vju.ac.vn` | Accepted (Supersedes `V2` refresh-token flow) | `2026-10-18` | `V12`, `V15`, `SecurityConfig`, `AccountStatusFilter` |
| [ADR-002](ADR-002-three-scope-rbac-and-effective-permissions-view.md) | Mô hình RBAC 3 phạm vi (`GLOBAL > CLUB > DEPARTMENT`), View `effective_user_permissions` và ranh giới `Actor` | Accepted | `2026-10-29` | `V1`, `V5`, `V20`, `V26`, `PermissionAuthorizationService`, `@RequirePermission` |
| [ADR-003](ADR-003-dual-contract-openapi-governance-and-rfc7807.md) | Quản trị hợp đồng kép OpenAPI 3.1 (`156` operations), `ApiPaths` tập trung và chuẩn lỗi RFC 7807 chống dò ID | Accepted | `2026-10-31` | `docs/api/openapi.yaml`, `docs/api/catalog.yml`, `ApiPaths`, `test_contract.py` |
| [ADR-004](ADR-004-pessimistic-event-capacity-and-pii-anonymization.md) | Khóa bi quan chống vượt chỉ tiêu sự kiện, cô lập CTV, Subtask 1 cấp và ẩn danh PII bảo toàn lịch sử | Accepted | `2026-11-04` | `V21`, `EventServiceImpl`, `TaskServiceImpl`, `UserAccountPurgeSupport` |
| [ADR-005](ADR-005-realtime-stomp-chat-and-three-tier-document-vault.md) | Kênh Chat thời gian thực STOMP WebSocket + HTTP Range Media và Kho tài liệu tập trung 3 tầng | Accepted | `2026-11-15` | `V25`, `V26`, `V28`, `V29`, `ChatWsController`, `ChatPinService`, `DocumentStorage` |
| [ADR-006](ADR-006-modular-nextjs-400-loc-and-cached-ai-i18n.md) | Kiến trúc Next.js 16 giới hạn `≤ 400` dòng/tệp, bảng màu 60/30/10 kiểm định bằng test và cổng dịch AI có cache PostgreSQL | Accepted | `2026-11-15` | `V23`, `V27`, `frontend/src/`, `frontend/tests/` |
