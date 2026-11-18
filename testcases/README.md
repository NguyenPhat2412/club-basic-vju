# Hệ thống Thư mục Testcase Chia Theo Từng Sprint (Sprint 1 → Sprint 4)

Toàn bộ **122 PBI**, **466 Test Cases (`TC-PB-*`)**, **35/35 Bản ghi lỗi (`BUG-*`)** và **161 API Endpoints** đã được chia tách độc lập thành **4 thư mục Sprint** để nhóm QA, Dev và Giảng viên có thể mở tra cứu và chạy kiểm thử nhanh theo đúng từng giai đoạn:

| Thư mục Sprint | Phạm vi PBI & Test Case | Kết quả Hiện tại | Bug đã đóng | Postman API | Lệnh chạy test nhanh (< 1 giây) |
| :--- | :---: | :---: | :---: | :---: | :--- |
| [**`sprint-1/`**](./sprint-1/README.md) | 41 PBI · **157 TC** | **157/157 Pass** | 14/14 Đã đóng | [`sprint-1.postman.json`](./sprint-1/sprint-1.postman.json) | `./testcases/run-sprint-tests.sh sprint-1` |
| [**`sprint-2/`**](./sprint-2/README.md) | 20 PBI · **77 TC** | **77/77 Pass** | 9/9 Đã đóng | [`sprint-2.postman.json`](./sprint-2/sprint-2.postman.json) | `./testcases/run-sprint-tests.sh sprint-2` |
| [**`sprint-3/`**](./sprint-3/README.md) | 23 PBI · **86 TC** | **86/86 Pass** | 11/11 Đã đóng | [`sprint-3.postman.json`](./sprint-3/sprint-3.postman.json) | `./testcases/run-sprint-tests.sh sprint-3` |
| [**`sprint-4/`**](./sprint-4/README.md) | 38 PBI · **146 TC** | **134 Pass**, 12 Chờ Sprint 4 | 1/1 Đã đóng | [`sprint-4.postman.json`](./sprint-4/sprint-4.postman.json) | `./testcases/run-sprint-tests.sh sprint-4` |
| **Tổng cộng** | **122 PBI · 466 TC** | **454 Pass · 12 Chưa chạy** | **35/35 Đã đóng** | **4 Collections** | `./testcases/run-sprint-tests.sh all` |

---

## Cách chạy nhanh theo nhu cầu

```bash
# 1. Chạy riêng từng Sprint (kiểm tra đủ TC, module, Bug Log, Postman & OpenAPI Contract của Sprint đó)
./testcases/run-sprint-tests.sh sprint-1
./testcases/run-sprint-tests.sh sprint-2
./testcases/run-sprint-tests.sh sprint-3
./testcases/run-sprint-tests.sh sprint-4

# 2. Chạy toàn bộ 4 Sprint + OpenAPI 3.1 Contract Tests cùng lúc
./testcases/run-sprint-tests.sh all

# 3. Chạy Live HTTP Smoke Test cho 1 Sprint lên server đang chạy (Local / Staging / Production)
./testcases/run-sprint-tests.sh sprint-3 --live https://api.vju-club.all1.vn

# 4. Kích hoạt luôn bộ JUnit/Testcontainers (Backend) + Node Test (Frontend) của đúng Sprint đó
./testcases/run-sprint-tests.sh sprint-3 --repo /duong/dan/toi/club-basic-vju
```
