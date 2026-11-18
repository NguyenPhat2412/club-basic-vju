# Sprint 3 — Quản lý Sự kiện, Khóa bi quan CTV, Giao Nhiệm vụ, Subtask 1 cấp & Cảnh báo Quá hạn

> **Tóm tắt nhanh**: **23 PBI** · **86 Test Cases** (**86 Pass**) · **11/11 Bug Đã đóng** · **19 API Endpoints** trong Postman Collection riêng.

## 1. Chạy Test Nhanh cho riêng Sprint 3

```bash
# 1) Chạy kiểm tra tự động Testcase + OpenAPI Contract + Postman của riêng Sprint 3 (< 1 giây)
./testcases/run-sprint-tests.sh sprint-3
# hoặc chạy trực tiếp bằng Python unittest:
python3 -m unittest discover -s testcases/sprint-3 -p "test_*.py" -v

# 2) Chạy thêm Live HTTP Smoke Test của Sprint 3 lên môi trường Local / Staging / Production
./testcases/run-sprint-tests.sh sprint-3 --live https://api.vju-club.all1.vn

# 3) Chạy đúng bộ Backend JUnit/Testcontainers & Frontend Unit Tests của Sprint 3 (khi trỏ vào thư mục code chính)
./testcases/run-sprint-tests.sh sprint-3 --repo /duong/dan/toi/club-basic-vju
```

### Lệnh Backend & Frontend tương ứng của Sprint 3
- **Backend Maven (`backend/springboot`)**:
  ```bash
  ./mvnw test -Dtest=PhaseThreeAcceptanceTest,PhaseThreeOperationsApiTest,FlowHardeningApiTest,AuthApiTest
  ```
- **Frontend Unit Tests (`frontend`)**:
  ```bash
  node --import ./tests/register-alias.mjs --test tests/phase34.test.ts tests/auth-form.test.ts tests/color-system-60-30-10.test.ts
  ```
- **Postman Collection riêng cho Sprint 3**: [`sprint-3.postman.json`](./sprint-3.postman.json)

---

## 2. Các File Testcase Đã Chia Nhỏ Theo Cụm Nghiệp Vụ (`modules/`)

| Cụm chức năng kiểm thử | Đường dẫn file | Quy mô | Trạng thái |
| :--- | :--- | :---: | :---: |
| [Khởi tạo, Cập nhật, Hủy & Khám phá Sự kiện cho Sinh viên / CTV](./modules/01-events-lifecycle.md) | `./modules/01-events-lifecycle.md` | **16 TC** | 16/16 Pass |
| [Mở / Đóng cổng đăng ký, Khóa bi quan, Cổng CTV ngoài CLB & Quản lý người tham gia](./modules/02-registrations-and-ctv.md) | `./modules/02-registrations-and-ctv.md` | **29 TC** | 29/29 Pass |
| [Giao nhiệm vụ, Phân rã Subtask 1 cấp, Cập nhật tiến độ % & Cờ quá hạn](./modules/03-tasks-subtasks-overdue.md) | `./modules/03-tasks-subtasks-overdue.md` | **27 TC** | 27/27 Pass |
| [Làm rõ nghiệp vụ (PB-57, PB-58), Migration V21 & Kiểm thử E2E biên deadline](./modules/04-spike-migration-e2e.md) | `./modules/04-spike-migration-e2e.md` | **14 TC** | 14/14 Pass |

- **Bảng tổng hợp toàn bộ 86 Test Cases của Sprint 3**: [`sprint-3-testcases.md`](./sprint-3-testcases.md)
- **Nhật ký lỗi & Retest của Sprint 3 (11 bản ghi)**: [`sprint-3-bugs.md`](./sprint-3-bugs.md)
