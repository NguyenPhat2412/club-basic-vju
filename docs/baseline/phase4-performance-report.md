# Báo cáo Đo kiểm Hiệu năng Kỹ thuật — Phase 4 (`PB-48`, `PB-61`)

- **Ngày thực hiện:** `2026-11-04`
- **Phạm vi PBI:** `PB-48` (Đo tải & tối ưu điểm nghẽn), `PB-61` (Định nghĩa chỉ số & ngưỡng tham chiếu hiệu năng)
- **Công cụ đo kiểm:** [`docs/baseline/run_load_benchmark.py`](run_load_benchmark.py)

> **Lưu ý quan trọng theo `PB-48` AC03 & `PB-61` AC03:** Các con số trong báo cáo này là **kết quả đo tham chiếu kỹ thuật thực tế (Technical Reference Measurement)** trên môi trường máy trạm phát triển/trình diễn cục bộ, phục vụ đối chiếu điểm nghẽn truy vấn và kiểm chứng ổn định đồng thời. Tài liệu này **không tuyên bố cam kết SLA thương mại (Commercial SLA)** trên hạ tầng vận hành thực tế khi chưa chạy kiểm định độc lập trên môi trường phần cứng production chuyên dụng.

---

## 1. Môi trường phần cứng, phần mềm và bộ dữ liệu đo (`PB-48` AC01, `PB-61` AC01)

| Hạng mục | Cấu hình thực tế khi đo |
|---|---|
| **Hệ điều hành máy chủ** | macOS (Apple Silicon) kết hợp Docker Desktop Engine `29.6.1` (`7936 MB` RAM cấp cho Docker VM) |
| **Cơ sở dữ liệu** | PostgreSQL `16-alpine` (container `club-basic-vju-postgres-1`, schema Flyway `V1`..`V21` đầy đủ) |
| **Backend Runtime** | Java `21` + Spring Boot `4.1.1` chạy profile `local` trên cổng `http://localhost:8080` |
| **Quản lý phiên & Phân quyền** | Stateful HTTP Session (`Spring Session JDBC` bảng `spring_session`) + RBAC 3-scope (`effective_user_permissions` view) |
| **Cấu hình tải đồng thời** | `20` concurrent workers (`ThreadPoolExecutor`), `100` requests / kịch bản × `6` kịch bản = **`600` HTTP requests** |
| **Bộ dữ liệu đại diện** | `20` tài khoản (`ACTIVE`), `2` CLB hoạt động (`VJUA`, `VJUM`), `6` ban chuyên môn, `3` sự kiện (`OPEN_REGISTRATION` & `COMPLETED`), `6` đăng ký sự kiện (`MEMBER` + `CTV`), `3` bản ghi điểm danh, `5` nhiệm vụ (cha, subtask, CTV task, task quá hạn `IN_PROGRESS`, task đã duyệt `COMPLETED`), `5` nhóm quyền hệ thống |

### Lệnh tái lập phép đo
```bash
python3 docs/baseline/run_load_benchmark.py \
  --base-url http://localhost:8080 \
  --workers 20 \
  --requests-per-scenario 100 \
  --email "<LOCAL_ADMIN_EMAIL>" \
  --password "<LOCAL_ADMIN_PASSWORD>"
```

---

## 2. Kết quả đo thực tế trên 6 kịch bản API trọng tâm (`PB-48` AC01–AC02, `PB-61` AC02)

Ngưỡng tham chiếu kỹ thuật nội bộ đã định nghĩa tại [`phase3-4-po-decisions.md`](phase3-4-po-decisions.md):
- Tra cứu công khai có bộ nhớ đệm: `p95 < 100 ms`, `error_rate = 0%`
- Tra cứu nghiệp vụ có xác thực phiên JDBC + kiểm tra quyền RBAC 3-scope: `p95 < 350 ms`, `error_rate = 0%`

| Kịch bản API | Loại xác thực | Tổng Req | Concurrent Workers | Throughput (`RPS`) | `avg` (`ms`) | `p50` (`ms`) | `p95` (`ms`) | `p99` (`ms`) | `max` (`ms`) | Tỷ lệ lỗi |
|---|---|---:|---:|---:|---:|---:|---:|---:|---:|---:|
| `GET /api/v1/public/clubs` | Public + Cache | 100 | 20 | **2551.83** | 6.60 | 5.84 | **13.57** | 14.35 | 15.50 | **0.0%** |
| `GET /api/v1/public/events` | Public + Cache | 100 | 20 | **2924.21** | 6.26 | 5.85 | **11.20** | 12.61 | 15.38 | **0.0%** |
| `GET /api/v1/clubs/{clubId}/events` | Session JDBC + RBAC | 100 | 20 | **204.73** | 95.33 | 76.15 | **193.00** | 233.71 | 245.91 | **0.0%** |
| `GET /api/v1/clubs/{clubId}/tasks` | Session JDBC + RBAC | 100 | 20 | **145.04** | 135.66 | 132.48 | **240.93** | 289.13 | 293.55 | **0.0%** |
| `GET /api/v1/clubs/{clubId}/statistics` | Session JDBC + RBAC | 100 | 20 | **524.79** | 36.53 | 37.53 | **50.06** | 52.16 | 53.23 | **0.0%** |
| `GET /api/v1/statistics/system` | Session JDBC + Global RBAC | 100 | 20 | **462.41** | 41.47 | 35.68 | **74.42** | 82.62 | 84.44 | **0.0%** |

- **Tổng thời gian hoàn tất 600 requests:** `1.67 giây`
- **Tổng số lỗi HTTP (`4xx` ngoài kịch bản / `5xx` / timeout):** `0 / 600` (`0.0%`)

---

## 3. Các giải pháp tối ưu hóa đã áp dụng và bảo toàn phân quyền (`PB-48` AC02, AC04)

1. **Tối ưu chống lỗi truy vấn `N+1` bằng `@EntityGraph`:**
   - `EventRepository#findByClubFiltered`, `EventRegistrationRepository#findByUser`, và `TaskRepository#findByClubFiltered` đều nạp sẵn (`JOIN FETCH` / `@EntityGraph`) các quan hệ `club`, `department`, `event`, `parentTask`, `assignee`, `assigner` trong **1 câu SQL duy nhất** thay vì phát sinh hàng chục câu truy vấn con khi serialize sang DTO.
2. **Chỉ mục PostgreSQL chuyên biệt (`V3`, `V14`, `V20`, `V21`):**
   - `idx_tasks_parent (parent_task_id)` phục vụ kiểm tra nhanh subtask chưa hoàn tất (`existsIncompleteSubtasks`) khi nghiệm thu task cha.
   - Partial index `idx_tasks_overdue_scan (deadline) WHERE status IN ('TODO', 'IN_PROGRESS') AND overdue_notified_at IS NULL` giúp job quét quá hạn định kỳ chỉ đọc đúng tập task đang mở chưa gửi cảnh báo, không quét toàn bảng lịch sử.
   - Partial unique index `uq_event_registrations_active` và `uq_notifications_user_event_key` vừa đảm bảo tính đúng đắn đồng thời vừa tăng tốc kiểm tra trùng `O(log N)`.
3. **Bộ nhớ đệm cho điểm cuối công khai (`CacheConfig`):**
   - `publicClubs` và `publicEvents` sử dụng Caffeine/Redis cache kết hợp `@CacheEvict` tức thời khi tạo/cập nhật/đổi trạng thái CLB hoặc sự kiện, giúp đạt thông lượng `> 2,500 RPS` và `p95 < 14 ms` mà không trả dữ liệu cũ sau khi quản trị viên thao tác.
4. **Cam kết không đánh đổi bảo mật lấy tốc độ (`PB-48` AC04):**
   - Toàn bộ 4 kịch bản xác thực đều giữ nguyên chuỗi kiểm tra đầy đủ: giải mã `CLUB_SESSION` từ `spring_session`, kiểm tra trạng thái tài khoản tức thời qua `AccountStatusFilter`, và đối chiếu quyền trực tiếp trên view `effective_user_permissions` (tự động loại trừ quyền của thành viên đang `SUSPENDED`). Không có bất kỳ đường tắt bỏ qua kiểm tra quyền hay lộ dữ liệu giữa các CLB.
