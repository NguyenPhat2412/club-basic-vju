"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { keepWords } from "@/lib/utils";
import { SessionUser } from "@/types";

interface HomeOnboardingFooterProps {
  user?: SessionUser;
  openAuthModal: (mode: AuthModalMode) => void;
}

export function HomeOnboardingFooter({ user, openAuthModal }: HomeOnboardingFooterProps) {
  return (
    <>
      <section id="quy-trinh" className="border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">LỘ TRÌNH THAM GIA ĐƠN GIẢN</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                {keepWords("4 bước gia nhập Câu lạc bộ tại VJU")}
              </h2>
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="inline-flex items-center gap-2 self-start text-sm font-bold text-primary hover:underline sm:self-auto"
              >
                HÃY GIA NHẬP NGAY <ArrowRight size={15} />
              </button>
            )}
          </div>

          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {[
              {
                step: "01",
                title: "Khám phá Câu lạc bộ",
                desc: "Tìm hiểu hoạt động thực tế, lĩnh vực chuyên môn và các ban trực thuộc của 12+ câu lạc bộ tại VJU.",
              },
              {
                step: "02",
                title: "Hãy gia nhập hệ thống",
                desc: "Khởi tạo tài khoản chỉ trong 30 giây hoặc bấm 1 chạm bằng email sinh viên @st.vju.ac.vn ngay trên Popup.",
              },
              {
                step: "03",
                title: "Nộp đơn ứng tuyển / CTV",
                desc: "Điền biểu mẫu ứng tuyển trực tuyến, chọn ban nguyện vọng 1 & 2, đính kèm CV hoặc đăng ký làm CTV sự kiện.",
              },
              {
                step: "04",
                title: "Nhận thông báo & Đồng hành",
                desc: "Nhận thông báo duyệt đơn tức thời, theo dõi lịch hoạt động, nhiệm vụ và trao đổi trong không gian CLB.",
              },
            ].map((item) => (
              <div
                key={item.step}
                className="relative flex flex-col justify-between rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-2xs transition-colors hover:border-primary/40 hover:bg-white"
              >
                <div>
                  <span className="inline-flex rounded-lg bg-primary/10 px-3 py-1 font-mono text-xs font-extrabold text-primary">
                    BƯỚC {item.step}
                  </span>
                  <h3 className="mt-4 text-lg font-bold text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="khoanh-khac" className="border-t border-slate-200 bg-slate-50">
        <div className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12">
          <div className="grid gap-12 lg:grid-cols-[1.15fr_0.85fr] lg:items-start">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-primary">THƯ VIỆN HOẠT ĐỘNG CÂU LẠC BỘ</p>
              <h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">
                {keepWords("Khoảnh khắc đáng nhớ tại các CLB VJU")}
              </h2>
              <p className="mt-3 text-[15px] leading-7 text-slate-700">
                {keepWords("Hình ảnh thực tế từ các chương trình tình nguyện, giao lưu văn hóa Việt - Nhật, chế tạo kỹ thuật và giải đấu thể thao của sinh viên Trường Đại học Việt Nhật.")}
              </p>

              <div className="mt-6 grid grid-cols-2 gap-3.5 sm:grid-cols-3">
                {[
                  { src: "/images/clubs/bigheart/gallery-1.jpg", label: "CLB Thiện nguyện BigHeart" },
                  { src: "/images/clubs/vjua/gallery-1.jpg", label: "CLB Nghệ thuật VJU (VJUA)" },
                  { src: "/images/clubs/monozukuri/gallery-1.jpg", label: "CLB Sáng tạo Monozukuri" },
                  { src: "/images/clubs/sunpinkey/gallery-1.jpg", label: "CLB Bóng chuyền Sun Pinkey" },
                  { src: "/images/clubs/neb/gallery-1.jpg", label: "CLB Văn hoá Việt - Nhật NEB" },
                  { src: "/images/clubs/vjub/gallery-1.jpg", label: "CLB Bóng rổ VJUB" },
                ].map((photo) => (
                  <Link
                    key={photo.src}
                    href="/clubs"
                    className="group relative h-40 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 shadow-2xs sm:h-44"
                  >
                    <div
                      className="absolute inset-0 bg-cover bg-center transition-transform duration-500 group-hover:scale-105"
                      style={{ backgroundImage: `url('${photo.src}')` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />
                    <span className="absolute bottom-2.5 left-3 right-3 line-clamp-2 text-xs font-bold leading-snug text-white">
                      {photo.label}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-2xs sm:p-8">
              <p className="text-xs font-bold uppercase tracking-wider text-primary">GIẢI ĐÁP NHANH CHO SINH VIÊN</p>
              <h3 className="mt-2 text-xl font-bold text-slate-900 sm:text-2xl">Câu hỏi thường gặp</h3>
              <div className="mt-5 divide-y divide-slate-200">
                {[
                  {
                    q: "Một sinh viên có thể ứng tuyển nhiều câu lạc bộ cùng lúc không?",
                    a: "Có. Bạn có thể nộp đơn vào các câu lạc bộ yêu thích và chọn ban chuyên môn nguyện vọng 1 & 2 theo đúng quy định của hệ thống.",
                  },
                  {
                    q: "Chưa là thành viên CLB có đăng ký tham gia sự kiện hoặc làm CTV được không?",
                    a: "Hoàn toàn được! Các sự kiện có nhãn 'Tuyển CTV' mở rộng cho toàn bộ sinh viên VJU đăng ký tham gia trực tuyến.",
                  },
                  {
                    q: "Làm sao để biết đơn ứng tuyển CLB của mình đã được duyệt?",
                    a: "Ngay khi Ban chủ nhiệm CLB xét duyệt, hệ thống sẽ gửi thông báo trực tiếp tới mục 'Thông báo của tôi' và tự động kích hoạt quyền thành viên.",
                  },
                ].map((faq) => (
                  <div key={faq.q} className="py-4 first:pt-0 last:pb-0">
                    <p className="text-[15px] font-bold text-slate-900">{faq.q}</p>
                    <p className="mt-1.5 text-sm leading-6 text-slate-700">{faq.a}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-t border-slate-200 bg-slate-900 text-white">
        <div
          className="bg-cover bg-center"
          style={{
            backgroundImage:
              "linear-gradient(95deg, rgba(15,17,20,0.92) 0%, rgba(142,31,50,0.88) 100%), url('/images/clubs/bigheart/cover.jpg')",
          }}
        >
          <div className="mx-auto flex max-w-[1380px] flex-col items-start justify-between gap-6 px-5 py-12 sm:px-8 sm:py-14 lg:flex-row lg:items-center lg:px-12">
            <div className="max-w-2xl">
              <p className="text-xs font-bold uppercase tracking-[.2em] text-[#f3d4a6]">
                CỘNG ĐỒNG CÂU LẠC BỘ SINH VIÊN VJU
              </p>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-tight text-white sm:text-4xl">
                {keepWords("Sẵn sàng viết nên thanh xuân rực rỡ cùng chúng mình?")}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/90 sm:text-[15px] sm:leading-7">
                {keepWords("Hãy gia nhập ngay hôm nay để ứng tuyển vào câu lạc bộ yêu thích, đăng ký làm Cộng tác viên sự kiện và kết nối cùng hàng trăm sinh viên VJU.")}
              </p>
            </div>
            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-6 text-sm font-extrabold text-primary shadow-md transition-opacity hover:opacity-95 sm:w-auto"
                >
                  MỞ BẢNG ĐIỀU KHIỂN <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="inline-flex h-12 w-full items-center justify-center gap-3 rounded-xl bg-white px-6 text-sm font-extrabold text-primary shadow-md transition-opacity hover:opacity-95 sm:w-auto"
                >
                  HÃY GIA NHẬP CÙNG CHÚNG MÌNH <ArrowRight size={16} />
                </button>
              )}
              <Link
                href="/clubs"
                className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-white/70 bg-black/25 px-6 text-sm font-bold text-white backdrop-blur-2xs transition-colors hover:bg-white/15 sm:w-auto"
              >
                KHÁM PHÁ 12+ CÂU LẠC BỘ
              </Link>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 bg-white text-slate-700">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/vju-logo.png"
                alt="Logo Trường Đại học Việt Nhật (VJU)"
                width={40}
                height={40}
                className="size-10 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200"
              />
              <span className="text-base font-extrabold tracking-tight text-slate-900">
                CLUB<span className="text-primary">HUB</span>
              </span>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              {keepWords("Cổng thông tin câu lạc bộ và hoạt động sinh viên Trường Đại học Việt Nhật (ĐHQGHN).")}
            </p>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{keepWords("LIÊN KẾT NHANH")}</p>
            <div className="mt-3.5 grid gap-2.5 text-sm text-slate-700">
              <Link className="hover:text-primary" href="/clubs">Khám phá câu lạc bộ</Link>
              <Link className="hover:text-primary" href="/events">Sự kiện & Cộng tác viên</Link>
              <Link className="hover:text-primary" href="/applications">Đơn đăng ký</Link>
              <Link className="hover:text-primary" href="/memberships">CLB đang tham gia</Link>
              <Link className="hover:text-primary" href="/notifications">Thông báo</Link>
            </div>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">{keepWords("TRƯỜNG ĐẠI HỌC VIỆT NHẬT")}</p>
            <p className="mt-3.5 text-sm leading-6 text-slate-700">
              Đại học Quốc gia Hà Nội
              <br />
              Hòa Lạc, Hà Nội, Việt Nam
            </p>
            <a
              className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              href="https://vju.ac.vn"
              target="_blank"
              rel="noreferrer"
            >
              vju.ac.vn <ArrowRight size={13} />
            </a>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-2 px-5 py-4 text-xs text-slate-600 sm:px-8 md:flex-row md:justify-between lg:px-12">
            <span>© 2026 VJU ClubHub · Hệ thống Quản lý Câu lạc bộ Sinh viên</span>
            <span>Trường Đại học Việt Nhật · ĐHQGHN</span>
          </div>
        </div>
      </footer>
    </>
  );
}
