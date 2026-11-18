# Sprint 4 — Điểm danh 48h, Thống kê, Ẩn danh PII, Kho tài liệu 3 tầng, Chat STOMP V30/V31, AI i18n & Mở rộng

> **Tóm tắt nhanh**: **38 PBI** · **146 Test Cases** (**134 Pass**, 12 Chưa chạy (lộ trình Sprint 4)) · **1/1 Bug Đã đóng** · **52 API Endpoints** trong Postman Collection riêng.

## 1. Chạy Test Nhanh cho riêng Sprint 4

```bash
# 1) Chạy kiểm tra tự động Testcase + OpenAPI Contract + Postman của riêng Sprint 4 (< 1 giây)
./testcases/run-sprint-tests.sh sprint-4
# hoặc chạy trực tiếp bằng Python unittest:
python3 -m unittest discover -s testcases/sprint-4 -p "test_*.py" -v

# 2) Chạy thêm Live HTTP Smoke Test của Sprint 4 lên môi trường Local / Staging / Production
./testcases/run-sprint-tests.sh sprint-4 --live https://api.vju-club.all1.vn

# 3) Chạy đúng bộ Backend JUnit/Testcontainers & Frontend Unit Tests của Sprint 4 (khi trỏ vào thư mục code chính)
./testcases/run-sprint-tests.sh sprint-4 --repo /duong/dan/toi/club-basic-vju
```

### Lệnh Backend & Frontend tương ứng của Sprint 4
- **Backend Maven (`backend/springboot`)**:
  ```bash
  ./mvnw test -Dtest=PhaseFourAcceptanceTest,DocumentThreeTierAccessTest,GoogleDriveDocumentStorageTest,ChatWebSocketIntegrationTest,ChatMediaAndQuickReplyTest,NotificationRealtimeAndChatUnitTest,SystemSettingsApiTest,UserAvatarApiTest,SecurityAndInputBoundsTest,OtpMailTemplateBuilderTest,ProdProfileStartupTest
  ```
- **Frontend Unit Tests (`frontend`)**:
  ```bash
  node --import ./tests/register-alias.mjs --test tests/realtime-vault.test.ts tests/realtime-notifications.test.ts tests/chat-message-status.test.ts tests/chat-tta-media-cache.test.ts tests/i18n-home.test.ts tests/table-filter-views.test.ts tests/security-input-bounds.test.ts tests/club-overview-config.test.ts tests/form-field-meta.test.ts tests/workspace-tabs.test.ts
  ```
- **Postman Collection riêng cho Sprint 4**: [`sprint-4.postman.json`](./sprint-4.postman.json)

---

## 2. Các File Testcase Đã Chia Nhỏ Theo Cụm Nghiệp Vụ (`modules/`)

| Cụm chức năng kiểm thử | Đường dẫn file | Quy mô | Trạng thái |
| :--- | :--- | :---: | :---: |
| [Hoàn tất sự kiện (COMPLETED), Điểm danh 4 trạng thái & Cửa sổ sửa hậu kiểm 48h](./modules/01-attendance-and-events-close.md) | `./modules/01-attendance-and-events-close.md` | **15 TC** | 15/15 Pass |
| [Thông báo CLB/Ban/Sự kiện/Task, Lịch sử sự kiện, Thống kê khử trùng lặp & Ẩn danh PII](./modules/02-notifications-stats-and-pii.md) | `./modules/02-notifications-stats-and-pii.md` | **30 TC** | 30/30 Pass |
| [Đo tải 20 workers, Rà soát Bảo mật, Backup/Rollback, Bàn giao & Làm rõ PB-59..61](./modules/03-perf-security-deploy-handoff.md) | `./modules/03-perf-security-deploy-handoff.md` | **29 TC** | 29/29 Pass |
| [Media CLB, Đa ngữ AI, Kho tài liệu 3 tầng, Chat STOMP V30/V31, Data Table, Security & OTP/SMTP V33](./modules/04-vault-chat-media-i18n-ui.md) | `./modules/04-vault-chat-media-i18n-ui.md` | **60 TC** | 60/60 Pass |
| [Lộ trình Cải tiến từ Khảo sát CLB ARC & VAC (Nhắc lịch PV, Quỹ BCN, Biểu mẫu mượn phòng)](./modules/05-club-interview-roadmap.md) | `./modules/05-club-interview-roadmap.md` | **12 TC** | 0/12 Pass |

- **Bảng tổng hợp toàn bộ 146 Test Cases của Sprint 4**: [`sprint-4-testcases.md`](./sprint-4-testcases.md)
- **Nhật ký lỗi & Retest của Sprint 4 (1 bản ghi)**: [`sprint-4-bugs.md`](./sprint-4-bugs.md)
