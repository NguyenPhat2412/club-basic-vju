# Báo Cáo Tổng Hợp Phản Hồi, Kế Hoạch Triển Khai Sắp Tới & Biên Bản Chốt Kế Hoạch Sprint 4 (`24/11/2026`)

- **Dự án:** Hệ thống Quản lý Câu lạc bộ Sinh viên Trường Đại học Việt Nhật (`VJU ClubHub` / `club-basic-vju`)
- **Đơn vị thực hiện:** Nhóm 3 — Học phần Đảm bảo Chất lượng Phần mềm (`CSE3077`)
- **Ngày lập báo cáo & chốt biên bản:** Hà Nội, ngày `24/11/2026`
- **Tài liệu liên kết:**
  - Tổng hợp phản hồi BĐP & ĐTN (`23/11/2026`): [Phan-Hoi-BDP-DTN-2026-11-23.md](../feedback/Phan-Hoi-BDP-DTN-2026-11-23.md)
  - Đặc tả Sprint 4 & ĐRL Giai đoạn 2: [sprint4-bdp-refinement-and-drl-spec.md](./sprint4-bdp-refinement-and-drl-spec.md)
  - Hồ sơ quyết định kiến trúc mới nhất: [ADR-007-runtime-integration-config-and-facebook-sync.md](../decisions/ADR-007-runtime-integration-config-and-facebook-sync.md)
  - Product Backlog chính thức (Google Drive): `Product Backlog - Sprint 3.xlsx` (`139 PBI`: `PB-01`..`PB-96`)

---

## Phần I. Tổng Hợp Nguồn Phản Hồi & Hiện Trạng Đã Hoàn Thành

### 1.1. Tổng hợp 4 đợt ghi nhận phản hồi & kiểm thử thực tế
| Đợt | Thời điểm | Nguồn phản hồi / Đối tượng | Điểm trọng tâm & Mã PBI ánh xạ |
| :---: | :---: | :--- | :--- |
| **1** | `17/11/2026` | Phỏng vấn thực địa CLB ARC & CLB VAC | Lịch phỏng vấn ứng viên (`PB-76`), phân loại kho tài liệu BCN/Quỹ (`PB-77`), mẫu biểu hành chính VJU (`PB-78`) — **Đã hoàn thành (`V36`, `V37`)**. |
| **2** | `20/11/2026` | Họp khách hàng Đoàn Thanh niên (ĐTN), Ban Điều phối (BĐP) & các CLB | Đưa ĐTN thành đơn vị thứ 13 (`DOANVJU`, `V35`), đồng bộ membership BCN (`BUG-P3-12`), sự kiện nội bộ & nộp hồ sơ (`PB-88`, `V37`), lịch sử điểm danh trên `/profile` (`PB-86`). |
| **3** | `23/11/2026` | Phiếu góp ý chính thức từ ĐTN (`Lê Văn Thái An`, `Mỗ Bùi Hải Yến`, `Lê Thế Hùng`) | Tinh gọn quản trị 4 tầng + chuyển đổi đơn vị kiêm nhiệm (`PB-84`), tinh giản Topbar/Sidebar/Home & lọc sự kiện theo CLB (`PB-87`), Trang Portfolio CLB (`/clubs/[clubId]`, `PB-89`), Trang ứng tuyển độc lập kèm Caption + JD (`PB-90`), Truy vết IP/2FA/SHA-256 (`PB-91`), Thống kê tham gia + Biểu đồ Gantt 13 đơn vị + Khảo sát 1–5 sao (`PB-92`), Chuẩn bị hạ tầng ĐRL tham khảo NEU/FTU (`PB-93`). |
| **4** | `24/11/2026` | Kiểm thử triển khai Facebook OAuth, `/settings` & RBAC trên Staging (`stagging.vju-club.all1.vn`) | Phân quyền chi tiết Facebook (`V40`), quản trị live cấu hình `.env` (Facebook/AI/Google) ngay trên `/settings` (`V41`), cơ chế ủy quyền cấp dưới an toàn (`PB-95`), hạ tầng bất đồng bộ tập trung + Graceful Shutdown + tự động đồng bộ Facebook định kỳ (`PB-94`, `V43`), tích hợp Feed Facebook lên Portfolio CLB (`PB-96`). |

### 1.2. Các hạng mục vừa hoàn thiện & xác minh (`24/11/2026`, mốc `Flyway V43`)
1. **Hạ tầng Bất đồng bộ & Chống gián đoạn (`Khối 0`):**
   - Tập trung hoá `@EnableAsync` + `@EnableScheduling` trong `SchedulingConfig` với 3 pool tách biệt (`vjuTaskScheduler` 4 luồng, `integrationTaskExecutor`, `mailTaskExecutor`), bật `server.shutdown: graceful` (`25s`).
   - Tách cuộc gọi HTTP sang Meta Graph API khỏi `@Transactional` DB và khóa chống chạy chồng theo CLB (`inFlightSyncClubs` → `409 FACEBOOK_SYNC_IN_PROGRESS`).
2. **Tích hợp Facebook OAuth & Tự động đồng bộ định kỳ (`PB-94`, `V38`, `V40`, `V42`, `V43`):**
   - Hỗ trợ OAuth 1 chạm (`response_type=code`) và Page Access Token mã hoá AES-256-GCM.
   - `ClubFacebookSyncScheduler` tự động làm mới bài viết, chỉ số tương tác & đường dẫn ảnh `fbcdn.net` theo chu kỳ cấu hình trên `/settings` (mặc định `60 phút`, phạm vi `15..1440 phút`), tự dừng retry sau `3` lỗi liên tiếp và gửi thông báo In-App nhắc BCN khi Token hết hạn.
3. **Cấu hình tích hợp live `.env` trên `/settings` & Ủy quyền cấp dưới (`PB-95`, `V41`):**
   - Quản trị viên chỉnh sửa live Facebook OAuth, AI Gateway (9router), Google SSO và chu kỳ đồng bộ Facebook ngay trên `/settings` (mã hoá secret, fallback `.env`).
   - Kiểm toán đủ 5 vai trò mặc định (`63` quyền) và hoàn thiện ủy quyền cấp dưới ở cả backend (`PermissionAuthorizationService`, `GrantGuard`) lẫn frontend (`ClubMemberAccessSection`).

---

## Phần II. Kế Hoạch Triển Khai Sắp Tới (Lộ Trình Chi Tiết Sprint 4 & Giai Đoạn 2)

| Đợt | Ưu tiên | Mã PBI | Nội dung triển khai cụ thể | Tiêu chí nghiệm thu (DoD) | Mốc hoàn thành dự kiến |
| :---: | :---: | :---: | :--- | :--- | :---: |
| **Đã xong** | `P0` | `PB-94`, `PB-95` | Hạ tầng Async + Graceful Shutdown, Facebook OAuth + Auto-Sync `V43`, `/settings` live `.env`, Ủy quyền cấp dưới `V41` | `16/16` Contract, `680+` Backend tests, `97/97` Frontend tests pass; deploy xanh Staging | **Đã hoàn tất (`24/11/2026`)** |
| **Đợt 1** | `P0` | `PB-84`, `PB-85`, `PB-86` | Unit Context Switcher (chuyển vị trí ĐTN ⇄ CLB trên 1 tài khoản `@st.vju.ac.vn`), lịch sử điểm danh trên `/profile`, tìm kiếm nhanh hậu đóng đơn trong `EventAttendanceDrawer` | Chuyển ngữ cảnh tức thì không cần đăng xuất; ghi đúng `club_id` trong `audit_logs`; test E2E pass | `27/11/2026` |
| **Đợt 1** | `P0` | `PB-87`, `PB-89`, `PB-90`, `PB-96` | Gỡ ô search thừa trên `Topbar.tsx`, tách rõ `Sự kiện các CLB` (có lọc theo 13 đơn vị) vs `Công việc & Lịch cá nhân`, làm nổi khối nền nút `"Ứng tuyển CLB"`, xây Trang Portfolio CLB (`/clubs/[clubId]` gắn link & feed Facebook tự đồng bộ `PB-96`) và Trang Ứng tuyển riêng (`/clubs/[clubId]/apply` kèm Caption + file JD phân ban) | Đạt kiểm tra `< 400` dòng/tệp, bảng màu 60/30/10, EN/JA 100%, xác nhận trực tiếp từ BĐP/ĐTN trên Staging | `30/11/2026` |
| **Đợt 2** | `P1` | `PB-91` | Lưu `ip_address` & `user_agent` vào `audit_logs`, bật OTP 2FA cho tài khoản quản trị Tầng 1–3, khoá sổ bảng điểm danh bằng mã băm điện tử `SHA-256` in lên chân trang PDF/Excel | Không thể sửa điểm danh sau khi đã ký khoá sổ; audit log ghi đủ IP/User-Agent | `04/12/2026` |
| **Đợt 2** | `P1` | `PB-92` | Biểu đồ tỷ lệ tham gia thành viên + thống kê truyền thông Fanpage (`PB-96`), Biểu đồ GANTT sự kiện 13 đơn vị cho ĐTN, khảo sát hài lòng 1–5 sao sau sự kiện (chỉ mở cho người đã điểm danh `PRESENT`/`LATE`) | Gantt phát hiện trùng lịch giữa 13 đơn vị; khảo sát chống nộp trùng `UNIQUE(event_id, user_id)` | `07/12/2026` |
| **Giai đoạn 2** | `P2` | `PB-93` & Meta Webhook | Gắn trường Học kỳ (`academic_term`), thiết kế phân hệ tính Điểm Rèn Luyện (ĐRL) theo mô hình NEU/FTU; nâng cấp Facebook Meta Webhook realtime (khi App qua Meta App Review Live) | Hồ sơ đặc tả kiến trúc ĐRL được ĐTN & Nhà trường phê duyệt trước khi phát triển | Sau học kỳ (`01/2027`) |

### Quản trị Rủi ro & Biện pháp Kiểm soát
1. **Rủi ro Meta App Review & App Domains:** Meta chặn OAuth nếu thiếu khai báo `App Domains` hoặc `Valid OAuth Redirect URIs` HTTPS → đã cập nhật quy trình 2 bước chi tiết trong [docs/deploy/README.md](../deploy/README.md) và giữ cơ chế dự phòng **Page Access Token**.
2. **Rủi ro giới hạn tần suất Graph API (Rate Limit):** Polling chạy đồng loạt nhiều CLB có thể chạm giới hạn Meta → đã xử lý bằng pacing delay `1 giây/CLB`, chu kỳ mặc định `60 phút` chỉnh được trên `/settings`, và tự dừng sau `3` lỗi liên tiếp kèm thông báo In-App.
3. **Rủi ro hồi quy CI Integration Tests:** Mọi migration mới hoặc thay đổi quyền/endpoint phải chạy kiểm chứng bộ integration test PostgreSQL (`DatabaseConstraintsTest`, `PublicEndpointApiTest`, `PermissionApiTest`, `RoleApiTest`, `AdminAccountApiTest`) trước khi push lên `main`/`stagging`.

---

## Phần III. Biên Bản Cuộc Họp Chốt Kế Hoạch Triển Khai & Cập Nhật Hệ Thống

### BIÊN BẢN CUỘC HỌP NHÓM 3 — RÀ SOÁT FEEDBACK BĐP/ĐTN, HẠ TẦNG BẤT ĐỒNG BỘ & KẾ HOẠCH SPRINT 4
- **Mã biên bản:** `MM-G3-2026-11-24`
- **Thời gian:** `13:30 – 14:30`, Thứ Ba ngày `24/11/2026`
- **Hình thức:** Trực tuyến & rà soát trực tiếp trên môi trường Staging (`https://stagging.vju-club.all1.vn`)
- **Thành phần tham dự:**
  - **Nguyễn Xuân Phát** — Product Owner / Tech Lead (Chủ trì)
  - **Hà Lê Ngọc Thắng** — Tester / Business Analyst (Thư ký & QA)
  - **Thành viên phát triển Backend & Frontend Nhóm 3**
- **Tài liệu đầu vào:** `Feedback-BDP-2026-11-23.pdf`, `Bao-Cao-Tiep-Nhan-Va-Phan-Tich-Feedback-BDP-2026-11-23.docx`, kết quả kiểm thử Facebook OAuth & RBAC ngày `24/11/2026`.

#### 1. Nội dung thảo luận & Đánh giá hiện trạng
1. **Đánh giá phản hồi BĐP/ĐTN (`23/11/2026`):** Thống nhất định vị hệ thống là *Hệ thống quản lý hoạt động CLB & Sinh viên/CTV*, ưu tiên thống kê, theo dõi lịch trình, báo cáo và kiểm tra hoạt động thành viên; tinh giản các yếu tố trang trí dàn trải trên `/home` và bỏ thanh tìm kiếm thừa trên `Topbar`.
2. **Thống nhất mô hình phân quyền 4 tầng vs Ủy quyền cấp dưới:**
   - Vận hành chuẩn cho 12 CLB và Đoàn Thanh niên (`DOANVJU`) theo mô hình **4 tầng tinh gọn** (2–3 tài khoản cá nhân `@st.vju.ac.vn` đại diện mỗi đơn vị), bổ sung bộ chuyển đổi vị trí kiêm nhiệm (`Unit Switcher`, `PB-84`).
   - Giữ cơ chế **Ủy quyền cấp dưới (`PB-95`, `V41`)** như tùy chọn mở rộng an toàn (`GrantGuard` ngăn leo thang đặc quyền) cho các CLB cần phân quyền cục bộ theo ban.
3. **Đánh giá rủi ro xử lý bất đồng bộ & cập nhật Facebook liên tục:**
   - Ghi nhận trước ngày `24/11/2026`, backend chỉ có 1 thread `@Scheduled` chung, chưa bật `server.shutdown: graceful`, và Facebook chỉ đồng bộ thủ công.
   - Nhất trí triển khai ngay **Khối 0 (Hạ tầng Async 3 pool + Graceful Shutdown)** và **Khối A (`V43` Facebook Auto-Sync định kỳ mặc định 60 phút + cảnh báo In-App khi Token hết hạn)** trước khi bước vào các màn hình Sprint 4 (`PB-84..PB-93`, `PB-96`).
4. **Rà soát đồng bộ tài liệu & Product Backlog:**
   - Ghi nhận các tài liệu kiến trúc/DB/ERD trong `docs/` đang dừng ở `V29` và `Product Backlog - Sprint 3.xlsx` chưa có nhóm Facebook/Async/Delegation (`PB-94..PB-96`). Nhất trí cập nhật đồng bộ 100% trong ngày `24/11/2026`.

#### 2. Quyết nghị & Phân công hành động
| STT | Hạng mục quyết nghị | Người phụ trách | Thời hạn | Trạng thái |
| :---: | :--- | :--- | :---: | :---: |
| 1 | Hoàn thiện hạ tầng Async (`SchedulingConfig`, Graceful Shutdown) & Facebook Auto-Sync (`V43`, `ClubFacebookSyncScheduler`, `/settings` UI) + pass toàn bộ CI gate | Tech Lead / Backend & Frontend | `24/11/2026` | **Hoàn thành** |
| 2 | Cập nhật `PB-94`, `PB-95`, `PB-96` + `TC-PB-94..96` vào `Product Backlog - Sprint 3.xlsx` trên Google Drive | PO & BA/QA | `24/11/2026` | **Hoàn thành** |
| 3 | Đồng bộ toàn bộ tài liệu kỹ thuật repo (`docs/database`, `docs/erd`, `docs/archi`, `docs/deploy`, `ADR-007`, `phase3-4-baseline-and-handoff`) lên `V43` và cập nhật `tài liệu kỹ thuật.pdf` trên Drive | Tech Lead & QA | `24/11/2026` | **Hoàn thành** |
| 4 | Hoàn thiện cấu hình `App Domains` (`stagging.vju-club.all1.vn`, `vju-club.all1.vn`) trên Meta for Developers và xác nhận đăng nhập Facebook Fanpage trên Staging | PO (Chủ sở hữu Meta App) | `24–25/11/2026` | **Đang thực hiện** |
| 5 | Triển khai Đợt 1 Sprint 4 (`PB-84..PB-90`, `PB-96`: Unit Switcher, tinh giản UI, Portfolio CLB + Feed FB, Trang ứng tuyển riêng + JD) | Team Dev Nhóm 3 | `30/11/2026` | **Đã chốt kế hoạch** |
| 6 | Triển khai Đợt 2 Sprint 4 (`PB-91`, `PB-92`: Audit IP/2FA/SHA-256 Sign-off, Biểu đồ Gantt 13 đơn vị, Khảo sát 1–5 sao) & chuẩn bị đặc tả ĐRL (`PB-93`) | Team Dev & QA Nhóm 3 | `07/12/2026` | **Đã chốt kế hoạch** |

*Biên bản kết thúc lúc `14:30` cùng ngày, đã được các thành viên thống nhất thông qua và lưu trữ đồng bộ tại kho mã nguồn (`docs/baseline/`) cùng Google Drive Nhóm 3 (`GROUP 3 - Meeting Minutes.docx`).*
