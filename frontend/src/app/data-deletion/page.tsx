import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Mail, MapPin, Trash2 } from "lucide-react";

export const metadata: Metadata = {
  title: "Hướng dẫn xoá dữ liệu — VJU ClubHub",
  description:
    "Quy trình yêu cầu xoá hoặc ẩn danh hóa dữ liệu tài khoản sinh viên và ngắt kết nối Facebook Fanpage trên hệ thống VJU ClubHub.",
};

export default function DataDeletionPage() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="bg-primary text-primary-foreground">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-2 px-4 py-2 text-xs font-medium sm:px-6">
          <span>Trường Đại học Việt Nhật — ĐHQGHN (VJU)</span>
          <span>Cổng thông tin &amp; Điều hành Câu lạc bộ Sinh viên</span>
        </div>
      </div>

      <header className="sticky top-0 z-20 border-b border-border bg-card/95 backdrop-blur-xs">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6">
          <Link
            href="/home"
            className="flex min-w-0 items-center gap-2.5 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
          >
            <Image
              src="/images/vju-logo.png"
              alt="Logo Trường Đại học Việt Nhật"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full bg-secondary p-0.5 object-contain"
            />
            <span className="min-w-0">
              <span className="block truncate text-[11px] font-medium text-slate-600">
                VJU ClubHub
              </span>
              <span className="block font-display text-base font-extrabold tracking-tight text-slate-900">
                Hướng dẫn <span className="text-primary">Xoá dữ liệu</span>
              </span>
            </span>
          </Link>

          <nav aria-label="Điều hướng pháp lý" className="flex flex-wrap items-center gap-3 text-xs font-semibold sm:text-sm">
            <Link
              href="/privacy"
              className="rounded-lg px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-secondary hover:text-primary"
            >
              Chính sách bảo mật
            </Link>
            <Link
              href="/home"
              className="inline-flex items-center gap-1.5 rounded-lg bg-secondary px-3 py-1.5 text-slate-900 transition-colors hover:bg-accent hover:text-primary"
            >
              <ArrowLeft size={14} aria-hidden="true" />
              <span>Trang chủ</span>
            </Link>
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-4xl px-4 py-8 sm:px-6 sm:py-12">
        <article className="rounded-3xl border border-border bg-card p-6 shadow-xs sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-accent px-3 py-1 text-xs font-semibold text-primary">
            <Trash2 size={14} aria-hidden="true" />
            <span>Quy trình xoá dữ liệu · Meta &amp; Tài khoản VJU</span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Chính sách &amp; Hướng dẫn xoá dữ liệu — VJU ClubHub
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
            Trang này cung cấp hướng dẫn rõ ràng cho cả sinh viên sử dụng hệ thống và Ban Chủ nhiệm
            câu lạc bộ kết nối tích hợp Meta / Facebook Fanpage về cách yêu cầu xoá, ẩn danh hóa
            hoặc ngắt kết nối dữ liệu khỏi VJU ClubHub.
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700 sm:text-[15px]">
            <section aria-labelledby="student-deletion-heading">
              <h2 id="student-deletion-heading" className="font-serif text-xl font-semibold text-slate-900">
                1. Dành cho Sinh viên / Người dùng cá nhân (Xoá hoặc ẩn danh hóa tài khoản)
              </h2>
              <p className="mt-2.5">
                Khi sinh viên có nhu cầu đóng tài khoản hoặc yêu cầu ẩn danh hóa dữ liệu cá nhân
                trên VJU ClubHub, vui lòng thực hiện theo các bước sau:
              </p>
              <ol className="mt-3 list-decimal space-y-2 pl-5">
                <li>
                  Gửi yêu cầu trực tiếp tới{" "}
                  <strong className="font-semibold text-slate-900">
                    Đoàn Thanh niên Trường Đại học Việt Nhật
                  </strong>{" "}
                  hoặc{" "}
                  <strong className="font-semibold text-slate-900">
                    Phòng Công tác Sinh viên (CTSV VJU)
                  </strong>{" "}
                  tại Cơ sở Mỹ Đình / Hòa Lạc hoặc qua kênh email hỗ trợ sinh viên.
                </li>
                <li>
                  Cung cấp thông tin xác minh chính chủ gồm: họ và tên, mã số sinh viên, địa chỉ
                  email{" "}
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-primary">
                    @st.vju.ac.vn
                  </code>{" "}
                  và phạm vi yêu cầu (ẩn danh hóa hồ sơ thành viên hoặc vô hiệu hóa hoàn toàn tài
                  khoản).
                </li>
                <li>
                  Quản trị viên sẽ xác minh và thực hiện xử lý trong vòng{" "}
                  <strong className="font-semibold text-slate-900">07 ngày làm việc</strong>. Các
                  biên bản điểm danh sự kiện đã được khoá sổ phục vụ điểm rèn luyện sẽ được giữ ở
                  trạng thái ẩn danh hoặc lưu trữ theo quy chế học vụ của nhà trường.
                </li>
              </ol>
            </section>

            <section aria-labelledby="facebook-deletion-heading">
              <h2 id="facebook-deletion-heading" className="font-serif text-xl font-semibold text-slate-900">
                2. Dành cho Ban Chủ nhiệm CLB (Ngắt kết nối Facebook Fanpage &amp; Xoá dữ liệu Meta)
              </h2>
              <p className="mt-2.5">
                Nếu câu lạc bộ của bạn đã kết nối Fanpage qua tích hợp Meta / Facebook và muốn xoá
                toàn bộ dữ liệu kết nối ngay lập tức:
              </p>
              <ol className="mt-3 list-decimal space-y-2.5 pl-5">
                <li>
                  <strong className="font-semibold text-slate-900">
                    Ngắt kết nối trực tiếp trong VJU ClubHub:
                  </strong>{" "}
                  Đăng nhập bằng tài khoản Ban Chủ nhiệm CLB, truy cập{" "}
                  <span className="font-medium text-slate-900">
                    Quản lý CLB → Cài đặt CLB → Kết nối Facebook
                  </span>{" "}
                  và nhấn <strong className="font-semibold text-slate-900">Ngắt kết nối Fanpage</strong>.
                  Hệ thống sẽ lập tức xoá Page Access Token đã mã hóa{" "}
                  <strong className="font-semibold text-slate-900">AES-256-GCM</strong> cùng toàn
                  bộ dữ liệu cache bài viết Fanpage đã đồng bộ.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900">
                    Thu hồi quyền ứng dụng trong Facebook App Settings:
                  </strong>{" "}
                  Truy cập tài khoản Facebook đã dùng để liên kết, mở{" "}
                  <span className="font-medium text-slate-900">
                    Cài đặt &amp; quyền riêng tư → Cài đặt → Ứng dụng và trang web
                    (Apps and Websites)
                  </span>
                  , tìm ứng dụng <strong className="font-semibold text-slate-900">VJU ClubHub</strong>{" "}
                  và chọn <strong className="font-semibold text-slate-900">Gỡ (Remove)</strong> để
                  huỷ toàn bộ quyền truy cập từ phía Meta.
                </li>
              </ol>
            </section>

            <section
              aria-labelledby="verification-note-heading"
              className="rounded-2xl border border-border bg-secondary/60 p-5"
            >
              <h2 id="verification-note-heading" className="flex items-center gap-2 font-serif text-lg font-semibold text-slate-900">
                <CheckCircle2 size={18} className="shrink-0 text-primary" aria-hidden="true" />
                <span>Xác nhận hoàn tất &amp; Đầu mối hỗ trợ</span>
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Sau khi ngắt kết nối Fanpage hoặc hoàn tất yêu cầu qua Đoàn Thanh niên / Phòng CTSV
                VJU, không còn dữ liệu đồng bộ nào từ Facebook được thu thập thêm. Xem chi tiết
                nguyên tắc bảo vệ thông tin tại{" "}
                <Link
                  href="/privacy"
                  className="font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
                >
                  Chính sách bảo mật
                </Link>
                .
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-slate-900">Cơ sở Mỹ Đình &amp; Hòa Lạc:</strong>{" "}
                    Đoàn Thanh niên / Phòng Công tác Sinh viên (CTSV) — Trường Đại học Việt Nhật.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  <span>Tiếp nhận xác minh qua email sinh viên @st.vju.ac.vn.</span>
                </p>
              </div>
            </section>
          </div>
        </article>
      </main>

      <footer className="border-t border-border bg-card">
        <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3 px-4 py-5 text-xs text-slate-600 sm:px-6">
          <span>© 2026 VJU ClubHub — Trường Đại học Việt Nhật (ĐHQGHN)</span>
          <div className="flex flex-wrap items-center gap-4 font-semibold">
            <Link href="/home" className="transition-colors hover:text-primary">
              Trang chủ
            </Link>
            <Link href="/privacy" className="transition-colors hover:text-primary">
              Chính sách bảo mật
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
