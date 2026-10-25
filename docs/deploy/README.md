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

## Đăng nhập bằng Google (email sinh viên @st.vju.ac.vn)

Email `@st.vju.ac.vn` chạy trên Google Workspace của trường. Khi bật tính năng:

- Sinh viên bấm **"Đăng nhập bằng Google"** và dùng chính tài khoản email trường; hệ thống không lưu mật khẩu của họ.
- Chỉ email **đã được admin tạo tài khoản** mới vào được. Email trường chưa được cấp sẽ bị từ chối; hệ thống không tự tạo tài khoản.
- Email `@st.vju.ac.vn` không đăng nhập được bằng ô mật khẩu nữa. Admin và cán bộ (email khác) vẫn đăng nhập bằng mật khẩu như cũ.
- Admin tạo tài khoản sinh viên không cần nhập mật khẩu. Tài khoản có mã sinh viên phải dùng email `@st.vju.ac.vn`.
- Lần đăng nhập đầu, tài khoản được gắn với Google ID của sinh viên; về sau một tài khoản Google khác dùng lại cùng địa chỉ sẽ bị chặn.

### Tạo OAuth Client ID (làm một lần)

1. Vào https://console.cloud.google.com, tạo (hoặc chọn) một project.
2. **APIs & Services → OAuth consent screen**: chọn *External* (hoặc *Internal* nếu project nằm trong Google Workspace của VJU), điền tên ứng dụng "VJU ClubHub" và email hỗ trợ. Không cần thêm scope nào ngoài mặc định (email, profile, openid).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**, loại **Web application**.
4. Ở **Authorized JavaScript origins** thêm `https://vju-club.all1.vn` (và `http://localhost:3000` nếu muốn thử ở máy). Không cần *redirect URI*.
5. Chép **Client ID** (dạng `…apps.googleusercontent.com`). Client secret **không** dùng tới.

Client ID là thông tin công khai (trình duyệt nào cũng thấy). Đừng nhầm với *mật khẩu ứng dụng* của Gmail (16 chữ cái), thứ đó không dùng ở đây và không được dán vào cấu hình.

### Bật trên VPS

```bash
ssh root@160.22.123.184
nano /srv/vju-club/deploy/.env        # thêm: GOOGLE_CLIENT_ID=<client id>
cd /srv/vju-club/releases/current/deploy && docker compose -f compose.prod.yml --env-file /srv/vju-club/deploy/.env up -d backend
```

Kiểm tra: `curl https://api.vju-club.all1.vn/api/v1/auth/google/config` trả `"enabled":true`. Để tắt, xoá giá trị `GOOGLE_CLIENT_ID` rồi khởi động lại backend. `GOOGLE_ALLOWED_DOMAINS` (mặc định `st.vju.ac.vn`) nhận nhiều tên miền, ngăn cách bằng dấu phẩy.

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
