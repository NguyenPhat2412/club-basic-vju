# Triển khai và sao lưu

| Thành phần | Địa chỉ |
|---|---|
| Frontend | https://vju-club.all1.vn → `127.0.0.1:3110` |
| Backend | https://api.vju-club.all1.vn → `127.0.0.1:8110` |
| VPS | `root@160.22.123.184`, Ubuntu 24.04, múi giờ Asia/Ho_Chi_Minh |

nginx trên máy chủ (`deploy/nginx/vju-club.conf`) nhận HTTPS (Let's Encrypt, certbot tự gia hạn) rồi chuyển vào Docker Compose (`deploy/compose.prod.yml`: postgres, backend, frontend).

## Deploy

```bash
deploy/deploy.sh                      # bản main lên root@160.22.123.184
deploy/deploy.sh root@160.22.123.184 <git-ref>
```

Script đóng gói commit bằng `git archive`, gửi qua SSH (chỉ dùng SSH key) vào `/srv/vju-club/releases/next`, build và khởi động lại, rồi đổi `next` → `current` (bản cũ giữ ở `previous`). Mỗi lần deploy cũng cài lại script sao lưu và lịch cron.

Biến môi trường nằm ở `/srv/vju-club/deploy/.env` (quyền 600, không commit). Mẫu: `deploy/.env.production.example`.

## Sao lưu database

- Lịch: **02:30 hằng ngày** (`/etc/cron.d/vju-club-backup`), log ở `/var/log/vju-club-backup.log`.
- Nơi lưu: `/srv/vju-club/backups/db/`, chỉ root đọc được.
  - `daily/`: mỗi ngày một bản, giữ 14 ngày.
  - `weekly/`: bản Chủ nhật, giữ 8 tuần.
- Mỗi bản là `pg_dump` dạng custom, được `pg_restore --list` kiểm tra đọc được trước khi lưu. Ghi ra file tạm rồi mới đổi tên, nên không bao giờ để lại bản dở dang. Dừng nếu ổ đĩa còn dưới 1 GB.

Sao lưu ngay bằng tay:

```bash
ssh root@160.22.123.184 /srv/vju-club/bin/backup-db.sh
```

Kiểm tra một bản có khôi phục được không (khôi phục vào database tạm, in số dòng, rồi xoá; không đụng dữ liệu thật):

```bash
ssh root@160.22.123.184 '/srv/vju-club/bin/restore-db.sh "$(ls -t /srv/vju-club/backups/db/daily/*.dump | head -1)" --check'
```

Khôi phục thật (tự sao lưu database hiện tại trước, dừng backend, thay database, bật lại backend; phải gõ `restore` để xác nhận):

```bash
ssh -t root@160.22.123.184 /srv/vju-club/bin/restore-db.sh /srv/vju-club/backups/db/daily/<file>.dump --replace
```

**Giới hạn:** các bản sao lưu đang nằm trên cùng VPS. Chúng cứu được khi lỡ xoá dữ liệu hoặc migration hỏng, nhưng **không** cứu được nếu mất cả VPS. Nên chép thêm ra ngoài (ví dụ một bucket R2 riêng với key riêng chỉ có quyền ghi) sau khi đã đổi key R2 hiện tại. File tài liệu người dùng tải lên nằm trên R2, không nằm trong bản sao lưu này.
