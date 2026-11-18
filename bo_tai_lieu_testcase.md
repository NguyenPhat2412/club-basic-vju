# Bộ Tài liệu Testcase Hệ thống Quản lý CLB Sinh viên VJU (CLUB-BASIC-VJU)

> **Đã chuẩn hóa cấu trúc thư mục theo Sprint (18/11/2026 — đồng bộ `main @ 3f874a1`):** Để tra cứu và thực thi kiểm thử nhanh theo từng giai đoạn mà không phải cuộn một tệp lớn, toàn bộ **466 ca kiểm thử (`TC-PB-*`)** và **35 bản ghi lỗi (`BUG-*`)** đã được chia vào 4 thư mục độc lập tại [`testcases/`](./testcases/README.md).

## 1. Bảng Điều hướng Nhanh Theo Từng Sprint

| Giai đoạn | Thư mục Sprint | Tổng hợp TC của Sprint | Nhật ký lỗi (Bug Log) | Postman Collection | Quy mô & Kết quả |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Sprint 1** | [`testcases/sprint-1/`](./testcases/sprint-1/README.md) | [`sprint-1-testcases.md`](./testcases/sprint-1/sprint-1-testcases.md) | [`sprint-1-bugs.md`](./testcases/sprint-1/sprint-1-bugs.md) | [`sprint-1.postman.json`](./testcases/sprint-1/sprint-1.postman.json) | 41 PBI · **157 TC** (**157 Pass**) · **14/14 Bug Đã đóng** |
| **Sprint 2** | [`testcases/sprint-2/`](./testcases/sprint-2/README.md) | [`sprint-2-testcases.md`](./testcases/sprint-2/sprint-2-testcases.md) | [`sprint-2-bugs.md`](./testcases/sprint-2/sprint-2-bugs.md) | [`sprint-2.postman.json`](./testcases/sprint-2/sprint-2.postman.json) | 20 PBI · **77 TC** (**77 Pass**) · **9/9 Bug Đã đóng** |
| **Sprint 3** | [`testcases/sprint-3/`](./testcases/sprint-3/README.md) | [`sprint-3-testcases.md`](./testcases/sprint-3/sprint-3-testcases.md) | [`sprint-3-bugs.md`](./testcases/sprint-3/sprint-3-bugs.md) | [`sprint-3.postman.json`](./testcases/sprint-3/sprint-3.postman.json) | 23 PBI · **86 TC** (**86 Pass**) · **11/11 Bug Đã đóng** |
| **Sprint 4** | [`testcases/sprint-4/`](./testcases/sprint-4/README.md) | [`sprint-4-testcases.md`](./testcases/sprint-4/sprint-4-testcases.md) | [`sprint-4-bugs.md`](./testcases/sprint-4/sprint-4-bugs.md) | [`sprint-4.postman.json`](./testcases/sprint-4/sprint-4.postman.json) | 38 PBI · **146 TC** (**134 Pass**, 12 Chưa chạy) · **1/1 Bug Đã đóng** |

## 2. Danh mục Chi tiết Các Cụm Module Trong Từng Sprint

### Sprint 1 — Nền tảng Xác thực, Tài khoản, CLB, Ban, RBAC 3 tầng & Audit
- [Xác thực & Quản lý phiên đăng nhập](./testcases/sprint-1/modules/01-auth-and-session.md) — **20 TC** (20/20 Pass)
- [Quản lý Tài khoản & Hồ sơ cá nhân](./testcases/sprint-1/modules/02-accounts-and-profile.md) — **24 TC** (24/24 Pass)
- [Câu lạc bộ, Khám phá, Cơ cấu Ban, Chức danh & Thành viên](./testcases/sprint-1/modules/03-clubs-departments-members.md) — **46 TC** (46/46 Pass)
- [Phân quyền 3 tầng (GLOBAL / CLUB / DEPARTMENT) & Nhật ký Audit](./testcases/sprint-1/modules/04-rbac-permissions-and-audit.md) — **31 TC** (31/31 Pass)
- [Hạ tầng, Database Migration, API Contract, UI/UX nền, CI & Quản lý lỗi](./testcases/sprint-1/modules/05-infra-db-contract-ci-qa.md) — **36 TC** (36/36 Pass)

### Sprint 2 — Khám phá CLB, Tuyển thành viên, Xét duyệt đơn, Vòng đời Thành viên & Thông báo
- [Khám phá CLB & Mở đợt / Nộp đơn Tuyển thành viên](./testcases/sprint-2/modules/01-discovery-and-recruitment.md) — **16 TC** (16/16 Pass)
- [Xét duyệt đơn ứng tuyển, Ghi chú nội bộ & Cooldown nộp lại](./testcases/sprint-2/modules/02-application-review.md) — **12 TC** (12/12 Pass)
- [Tạm đình chỉ (SUSPENDED), Rời CLB (LEFT) & Chuyển / Gỡ ban](./testcases/sprint-2/modules/03-membership-and-departments.md) — **15 TC** (15/15 Pass)
- [Thông báo In-App khử trùng lặp & Lịch sử đơn / thành viên](./testcases/sprint-2/modules/04-notifications-and-history.md) — **16 TC** (16/16 Pass)
- [Làm rõ nghiệp vụ (PB-55, PB-56), Migration V20, CI & Bàn giao](./testcases/sprint-2/modules/05-spike-migration-ci-handoff.md) — **18 TC** (18/18 Pass)

### Sprint 3 — Quản lý Sự kiện, Khóa bi quan CTV, Giao Nhiệm vụ, Subtask 1 cấp & Cảnh báo Quá hạn
- [Khởi tạo, Cập nhật, Hủy & Khám phá Sự kiện cho Sinh viên / CTV](./testcases/sprint-3/modules/01-events-lifecycle.md) — **16 TC** (16/16 Pass)
- [Mở / Đóng cổng đăng ký, Khóa bi quan, Cổng CTV ngoài CLB & Quản lý người tham gia](./testcases/sprint-3/modules/02-registrations-and-ctv.md) — **29 TC** (29/29 Pass)
- [Giao nhiệm vụ, Phân rã Subtask 1 cấp, Cập nhật tiến độ % & Cờ quá hạn](./testcases/sprint-3/modules/03-tasks-subtasks-overdue.md) — **27 TC** (27/27 Pass)
- [Làm rõ nghiệp vụ (PB-57, PB-58), Migration V21 & Kiểm thử E2E biên deadline](./testcases/sprint-3/modules/04-spike-migration-e2e.md) — **14 TC** (14/14 Pass)

### Sprint 4 — Điểm danh 48h, Thống kê, Ẩn danh PII, Kho tài liệu 3 tầng, Chat STOMP V30/V31, AI i18n & Mở rộng
- [Hoàn tất sự kiện (COMPLETED), Điểm danh 4 trạng thái & Cửa sổ sửa hậu kiểm 48h](./testcases/sprint-4/modules/01-attendance-and-events-close.md) — **15 TC** (15/15 Pass)
- [Thông báo CLB/Ban/Sự kiện/Task, Lịch sử sự kiện, Thống kê khử trùng lặp & Ẩn danh PII](./testcases/sprint-4/modules/02-notifications-stats-and-pii.md) — **30 TC** (30/30 Pass)
- [Đo tải 20 workers, Rà soát Bảo mật, Backup/Rollback, Bàn giao & Làm rõ PB-59..61](./testcases/sprint-4/modules/03-perf-security-deploy-handoff.md) — **29 TC** (29/29 Pass)
- [Media CLB, Đa ngữ AI, Kho tài liệu 3 tầng, Chat STOMP V30/V31, Data Table, Security & OTP/SMTP V33](./testcases/sprint-4/modules/04-vault-chat-media-i18n-ui.md) — **60 TC** (60/60 Pass)
- [Lộ trình Cải tiến từ Khảo sát CLB ARC & VAC (Nhắc lịch PV, Quỹ BCN, Biểu mẫu mượn phòng)](./testcases/sprint-4/modules/05-club-interview-roadmap.md) — **12 TC** (0/12 Pass)

## 3. Lệnh Chạy Kiểm Thử Nhanh Theo Từng Sprint

```bash
./testcases/run-sprint-tests.sh sprint-1   # Test nhanh Sprint 1 (157 TC)
./testcases/run-sprint-tests.sh sprint-2   # Test nhanh Sprint 2 (77 TC)
./testcases/run-sprint-tests.sh sprint-3   # Test nhanh Sprint 3 (86 TC)
./testcases/run-sprint-tests.sh sprint-4   # Test nhanh Sprint 4 (146 TC)
./testcases/run-sprint-tests.sh all        # Chạy toàn bộ OpenAPI Contract + 4 Sprint
```
