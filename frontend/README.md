# VJU Club Frontend (`Next.js 16` + `React 19` + `TypeScript`)

Giao diện người dùng của Hệ thống Quản lý CLB Sinh viên Trường Đại học Việt Nhật (`CLUB-BASIC-VJU`), xây dựng trên **Next.js 16 App Router**, **TanStack Query 5**, **Tailwind CSS** và **STOMP WebSocket** (không dùng dữ liệu giả lập — *zero mock data*).

## Kiến trúc Thư mục (`≤ 400` dòng/tệp)

Xem lý do thiết kế chi tiết tại [ADR-006](../docs/decisions/ADR-006-modular-nextjs-400-loc-and-cached-ai-i18n.md):

```text
frontend/
├── src/
│   ├── app/            # Các tuyến màn hình App Router (/clubs, /events, /schedule, /documents, /management...)
│   ├── api/            # Hàm gọi REST API phân miền, tự gắn X-XSRF-TOKEN & thử lại khi CSRF hết hạn
│   ├── components/     # UI chia nhỏ theo domain (club, event, task, document, management, shared, ui)
│   ├── config/         # Cấu hình thanh điều hướng & phân nhóm không gian làm việc
│   ├── forms/          # Schema biểu mẫu & quy tắc chỉ báo bắt buộc (*)/tuỳ chọn (form-field-meta.ts)
│   ├── hooks/          # Custom hooks TanStack Query 5, phiên người dùng & STOMP WebSocket (useChatRealtime)
│   ├── i18n/           # Từ điển đa ngôn ngữ VI/EN/JA & bộ dịch kết hợp cache AI PostgreSQL (V23)
│   ├── lib/            # HTTP client, định tuyến API, xử lý media URL & bộ đệm chat LRU + IndexedDB
│   ├── providers/      # AppProviders & I18nContext
│   ├── styles/         # Token màu chuẩn 60/30/10 (globals.css)
│   └── types/          # Hợp đồng kiểu TypeScript khớp 1:1 với DTO Backend
└── tests/              # 36 bài unit test kiểm định kiến trúc, bảng màu, biểu mẫu, chat/vault & API client
```

## Chạy Môi trường Phát triển

Yêu cầu: **Node.js 20+** và **pnpm** (Backend cần chạy ở `http://localhost:8080`).

```bash
pnpm install
pnpm dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Các Lệnh Kiểm định Chất lượng

| Lệnh | Ý nghĩa |
|---|---|
| `pnpm run lint` | Kiểm tra quy tắc ESLint |
| `pnpm run typecheck` | Kiểm tra kiểu tĩnh TypeScript (`tsc --noEmit`) |
| `pnpm test` | Chạy `36` bài kiểm thử đơn vị (hợp đồng màu 60/30/10, ngưỡng `< 400` dòng/tệp, i18n VI/EN/JA, biểu mẫu, chat/vault) |
| `pnpm run build` | Đóng gói bản dựng Production (`21+` Next.js routes) |

Hướng dẫn khởi động trọn bộ Backend + PostgreSQL xem tại [README gốc](../README.md).
