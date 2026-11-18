# Sprint 2 — Khám phá CLB, Tuyển thành viên, Xét duyệt đơn, Vòng đời Thành viên & Thông báo

> **Tóm tắt nhanh**: **20 PBI** · **77 Test Cases** (**77 Pass**) · **9/9 Bug Đã đóng** · **32 API Endpoints** trong Postman Collection riêng.

## 1. Chạy Test Nhanh cho riêng Sprint 2

```bash
# 1) Chạy kiểm tra tự động Testcase + OpenAPI Contract + Postman của riêng Sprint 2 (< 1 giây)
./testcases/run-sprint-tests.sh sprint-2
# hoặc chạy trực tiếp bằng Python unittest:
python3 -m unittest discover -s testcases/sprint-2 -p "test_*.py" -v

# 2) Chạy thêm Live HTTP Smoke Test của Sprint 2 lên môi trường Local / Staging / Production
./testcases/run-sprint-tests.sh sprint-2 --live https://api.vju-club.all1.vn

# 3) Chạy đúng bộ Backend JUnit/Testcontainers & Frontend Unit Tests của Sprint 2 (khi trỏ vào thư mục code chính)
./testcases/run-sprint-tests.sh sprint-2 --repo /duong/dan/toi/club-basic-vju
```

### Lệnh Backend & Frontend tương ứng của Sprint 2
- **Backend Maven (`backend/springboot`)**:
  ```bash
  ./mvnw test -Dtest=PhaseTwoAcceptanceTest,PhaseTwoMigrationTest,SprintTwoMembershipAcceptanceTest,SprintTwoNotificationAndHardeningAcceptanceTest,ClubApplicationApiTest,DepartmentMemberApiTest,NotificationApiTest,PublicEndpointApiTest
  ```
- **Frontend Unit Tests (`frontend`)**:
  ```bash
  node --import ./tests/register-alias.mjs --test tests/sprint2.test.ts tests/file-size-limit.test.ts
  ```
- **Postman Collection riêng cho Sprint 2**: [`sprint-2.postman.json`](./sprint-2.postman.json)

---

## 2. Các File Testcase Đã Chia Nhỏ Theo Cụm Nghiệp Vụ (`modules/`)

| Cụm chức năng kiểm thử | Đường dẫn file | Quy mô | Trạng thái |
| :--- | :--- | :---: | :---: |
| [Khám phá CLB & Mở đợt / Nộp đơn Tuyển thành viên](./modules/01-discovery-and-recruitment.md) | `./modules/01-discovery-and-recruitment.md` | **16 TC** | 16/16 Pass |
| [Xét duyệt đơn ứng tuyển, Ghi chú nội bộ & Cooldown nộp lại](./modules/02-application-review.md) | `./modules/02-application-review.md` | **12 TC** | 12/12 Pass |
| [Tạm đình chỉ (SUSPENDED), Rời CLB (LEFT) & Chuyển / Gỡ ban](./modules/03-membership-and-departments.md) | `./modules/03-membership-and-departments.md` | **15 TC** | 15/15 Pass |
| [Thông báo In-App khử trùng lặp & Lịch sử đơn / thành viên](./modules/04-notifications-and-history.md) | `./modules/04-notifications-and-history.md` | **16 TC** | 16/16 Pass |
| [Làm rõ nghiệp vụ (PB-55, PB-56), Migration V20, CI & Bàn giao](./modules/05-spike-migration-ci-handoff.md) | `./modules/05-spike-migration-ci-handoff.md` | **18 TC** | 18/18 Pass |

- **Bảng tổng hợp toàn bộ 77 Test Cases của Sprint 2**: [`sprint-2-testcases.md`](./sprint-2-testcases.md)
- **Nhật ký lỗi & Retest của Sprint 2 (9 bản ghi)**: [`sprint-2-bugs.md`](./sprint-2-bugs.md)
