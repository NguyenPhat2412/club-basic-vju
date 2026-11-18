# Sprint 1 — Nền tảng Xác thực, Tài khoản, CLB, Ban, RBAC 3 tầng & Audit

> **Tóm tắt nhanh**: **41 PBI** · **157 Test Cases** (**157 Pass**) · **14/14 Bug Đã đóng** · **59 API Endpoints** trong Postman Collection riêng.

## 1. Chạy Test Nhanh cho riêng Sprint 1

```bash
# 1) Chạy kiểm tra tự động Testcase + OpenAPI Contract + Postman của riêng Sprint 1 (< 1 giây)
./testcases/run-sprint-tests.sh sprint-1
# hoặc chạy trực tiếp bằng Python unittest:
python3 -m unittest discover -s testcases/sprint-1 -p "test_*.py" -v

# 2) Chạy thêm Live HTTP Smoke Test của Sprint 1 lên môi trường Local / Staging / Production
./testcases/run-sprint-tests.sh sprint-1 --live https://api.vju-club.all1.vn

# 3) Chạy đúng bộ Backend JUnit/Testcontainers & Frontend Unit Tests của Sprint 1 (khi trỏ vào thư mục code chính)
./testcases/run-sprint-tests.sh sprint-1 --repo /duong/dan/toi/club-basic-vju
```

### Lệnh Backend & Frontend tương ứng của Sprint 1
- **Backend Maven (`backend/springboot`)**:
  ```bash
  ./mvnw test -Dtest=SprintOneAcceptanceTest,AuthApiTest,GoogleSignInApiTest,UserApiTest,ClubApiTest,DepartmentApiTest,MembershipApiTest,PermissionApiTest,PermissionBulkApiTest,RoleApiTest,AuditLogApiTest
  ```
- **Frontend Unit Tests (`frontend`)**:
  ```bash
  node --import ./tests/register-alias.mjs --test tests/auth-form.test.ts tests/user-access-draft.test.ts tests/query-keys.test.ts
  ```
- **Postman Collection riêng cho Sprint 1**: [`sprint-1.postman.json`](./sprint-1.postman.json)

---

## 2. Các File Testcase Đã Chia Nhỏ Theo Cụm Nghiệp Vụ (`modules/`)

| Cụm chức năng kiểm thử | Đường dẫn file | Quy mô | Trạng thái |
| :--- | :--- | :---: | :---: |
| [Xác thực & Quản lý phiên đăng nhập](./modules/01-auth-and-session.md) | `./modules/01-auth-and-session.md` | **20 TC** | 20/20 Pass |
| [Quản lý Tài khoản & Hồ sơ cá nhân](./modules/02-accounts-and-profile.md) | `./modules/02-accounts-and-profile.md` | **24 TC** | 24/24 Pass |
| [Câu lạc bộ, Khám phá, Cơ cấu Ban, Chức danh & Thành viên](./modules/03-clubs-departments-members.md) | `./modules/03-clubs-departments-members.md` | **46 TC** | 46/46 Pass |
| [Phân quyền 3 tầng (GLOBAL / CLUB / DEPARTMENT) & Nhật ký Audit](./modules/04-rbac-permissions-and-audit.md) | `./modules/04-rbac-permissions-and-audit.md` | **31 TC** | 31/31 Pass |
| [Hạ tầng, Database Migration, API Contract, UI/UX nền, CI & Quản lý lỗi](./modules/05-infra-db-contract-ci-qa.md) | `./modules/05-infra-db-contract-ci-qa.md` | **36 TC** | 36/36 Pass |

- **Bảng tổng hợp toàn bộ 157 Test Cases của Sprint 1**: [`sprint-1-testcases.md`](./sprint-1-testcases.md)
- **Nhật ký lỗi & Retest của Sprint 1 (14 bản ghi)**: [`sprint-1-bugs.md`](./sprint-1-bugs.md)
