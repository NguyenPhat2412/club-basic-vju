import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, Mail, MapPin, ShieldCheck } from "lucide-react";

export const metadata: Metadata = {
  title: "Chính sách bảo mật — VJU ClubHub",
  description:
    "Chính sách bảo mật dữ liệu sinh viên, hồ sơ câu lạc bộ và tích hợp Fanpage trên hệ thống VJU ClubHub của Trường Đại học Việt Nhật.",
};

export default function PrivacyPolicyPage() {
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
                Chính sách <span className="text-primary">Bảo mật</span>
              </span>
            </span>
          </Link>

          <nav aria-label="Điều hướng pháp lý" className="flex flex-wrap items-center gap-3 text-xs font-semibold sm:text-sm">
            <Link
              href="/data-deletion"
              className="rounded-lg px-2.5 py-1.5 text-slate-700 transition-colors hover:bg-secondary hover:text-primary"
            >
              Hướng dẫn xoá dữ liệu
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
            <ShieldCheck size={14} aria-hidden="true" />
            <span>Tài liệu công khai · Cập nhật 2026</span>
          </div>

          <h1 className="mt-4 font-serif text-3xl font-semibold tracking-tight text-slate-900 sm:text-4xl">
            Chính sách bảo mật dữ liệu — VJU ClubHub
          </h1>
          <p className="mt-3 text-sm leading-7 text-slate-700 sm:text-base">
            VJU ClubHub là nền tảng quản lý hoạt động câu lạc bộ, sự kiện và điểm rèn luyện dành
            riêng cho sinh viên và các đơn vị trực thuộc Trường Đại học Việt Nhật — Đại học Quốc
            gia Hà Nội (VJU). Chính sách này giải thích rõ cách hệ thống thu thập, bảo vệ, sử dụng
            và lưu trữ dữ liệu của bạn.
          </p>

          <div className="mt-8 space-y-7 text-sm leading-7 text-slate-700 sm:text-[15px]">
            <section aria-labelledby="scope-heading">
              <h2 id="scope-heading" className="font-serif text-xl font-semibold text-slate-900">
                1. Dữ liệu chúng tôi thu thập
              </h2>
              <ul className="mt-2.5 list-disc space-y-2 pl-5">
                <li>
                  <strong className="font-semibold text-slate-900">Tài khoản &amp; xác thực Google Sign-In:</strong>{" "}
                  Khi đăng nhập bằng email sinh viên <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-primary">@st.vju.ac.vn</code>{" "}
                  hoặc tài khoản do nhà trường cấp, hệ thống tiếp nhận họ tên, địa chỉ email, ảnh
                  đại diện (nếu có) và mã số sinh viên để định danh hồ sơ.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900">Hồ sơ thành viên, ứng tuyển &amp; điểm danh QR:</strong>{" "}
                  Thông tin đơn đăng ký vào câu lạc bộ, ban chuyên môn, vai trò kiêm nhiệm, nhật ký
                  đăng ký sự kiện và lịch sử điểm danh qua mã QR phục vụ tổng hợp điểm rèn luyện.
                </li>
                <li>
                  <strong className="font-semibold text-slate-900">Tích hợp Meta / Facebook Fanpage CLB (tự nguyện):</strong>{" "}
                  Khi Ban Chủ nhiệm câu lạc bộ chủ động kết nối Fanpage chính thức, hệ thống chỉ đọc
                  bài viết công khai, chỉ số tương tác công khai của trang và lưu mã truy cập
                  Fanpage (Page Access Token) phục vụ đồng bộ bản tin câu lạc bộ.
                </li>
              </ul>
            </section>

            <section aria-labelledby="security-heading">
              <h2 id="security-heading" className="font-serif text-xl font-semibold text-slate-900">
                2. Mục đích sử dụng &amp; biện pháp bảo mật kỹ thuật
              </h2>
              <ul className="mt-2.5 list-disc space-y-2 pl-5">
                <li>
                  Dữ liệu chỉ được dùng cho công tác tổ chức câu lạc bộ, trao đổi công việc nội bộ,
                  xác thực điểm danh sự kiện và báo cáo điểm rèn luyện học kỳ tại VJU.
                </li>
                <li>
                  Mã truy cập Facebook Page Access Token được mã hoá tại tầng lưu trữ bằng chuẩn{" "}
                  <strong className="font-semibold text-slate-900">AES-256-GCM</strong>; hệ thống không
                  lưu mật khẩu tài khoản Google hoặc Facebook cá nhân của người dùng.
                </li>
                <li>
                  Phiên đăng nhập được quản lý qua cookie{" "}
                  <code className="rounded bg-secondary px-1.5 py-0.5 text-xs font-semibold text-slate-900">HttpOnly</code>{" "}
                  kết hợp bảo vệ CSRF và kiểm soát phân quyền theo đơn vị.
                </li>
              </ul>
            </section>

            <section aria-labelledby="sharing-heading">
              <h2 id="sharing-heading" className="font-serif text-xl font-semibold text-slate-900">
                3. Cam kết không bán dữ liệu &amp; không quảng cáo
              </h2>
              <p className="mt-2.5">
                VJU ClubHub tuyệt đối <strong className="font-semibold text-slate-900">không bán, không cho thuê</strong>{" "}
                và không chia sẻ thông tin cá nhân của sinh viên cho bất kỳ bên thứ ba thương mại
                hoặc mạng lưới quảng cáo nào. Dữ liệu chỉ được truy cập bởi các bộ phận quản lý có
                thẩm quyền trong phạm vi Trường Đại học Việt Nhật.
              </p>
            </section>

            <section aria-labelledby="rights-heading">
              <h2 id="rights-heading" className="font-serif text-xl font-semibold text-slate-900">
                4. Quyền của người dùng &amp; yêu cầu xoá dữ liệu
              </h2>
              <p className="mt-2.5">
                Bạn có quyền kiểm tra, yêu cầu cập nhật thông tin cá nhân, ngắt kết nối Fanpage
                câu lạc bộ hoặc yêu cầu xoá / ẩn danh hóa dữ liệu tài khoản bất kỳ lúc nào. Xem chi
                tiết từng bước tại trang{" "}
                <Link
                  href="/data-deletion"
                  className="font-semibold text-primary underline underline-offset-4 hover:text-primary-hover"
                >
                  Hướng dẫn xoá dữ liệu
                </Link>
                .
              </p>
            </section>

            <section
              aria-labelledby="contact-heading"
              className="rounded-2xl border border-border bg-secondary/60 p-5"
            >
              <h2 id="contact-heading" className="font-serif text-lg font-semibold text-slate-900">
                5. Đầu mối liên hệ chính thức
              </h2>
              <p className="mt-2 text-sm text-slate-700">
                Mọi thắc mắc về bảo mật dữ liệu và quyền riêng tư, vui lòng liên hệ{" "}
                <strong className="font-semibold text-slate-900">
                  Đoàn Thanh niên / Phòng Công tác Sinh viên (CTSV) — Trường Đại học Việt Nhật
                </strong>
                :
              </p>
              <div className="mt-3 space-y-1.5 text-sm text-slate-700">
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-slate-900">Cơ sở Mỹ Đình:</strong> Đường
                    Lưu Hữu Phước, Phường Từ Liêm, Hà Nội.
                  </span>
                </p>
                <p className="flex items-start gap-2">
                  <MapPin size={15} className="mt-1 shrink-0 text-primary" aria-hidden="true" />
                  <span>
                    <strong className="font-semibold text-slate-900">Cơ sở Hòa Lạc:</strong> Khu Đô
                    thị ĐHQGHN, Xã Hòa Lạc, Hà Nội.
                  </span>
                </p>
                <p className="flex items-center gap-2">
                  <Mail size={15} className="shrink-0 text-primary" aria-hidden="true" />
                  <span>Hỗ trợ tài khoản sinh viên qua email nội bộ @st.vju.ac.vn.</span>
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
            <Link href="/data-deletion" className="transition-colors hover:text-primary">
              Hướng dẫn xoá dữ liệu
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
