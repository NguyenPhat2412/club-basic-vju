"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowDown,
  ArrowRight,
  Bell,
  BookOpen,
  CalendarDays,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Menu,
  UsersRound,
  X,
} from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { keepWords } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import { SessionUser } from "@/types";

const HERO_SLIDES = [
  { src: "/images/clubs/bigheart/cover.jpg", position: "center 45%" },
  { src: "/images/clubs/vjua/cover.jpg", position: "center 40%" },
  { src: "/images/clubs/monozukuri/gallery-3.jpg", position: "center" },
  { src: "/images/clubs/sunpinkey/cover.jpg", position: "center 45%" },
  { src: "/images/clubs/neb/gallery-2.jpg", position: "center 35%" },
  { src: "/images/clubs/vjub/cover.jpg", position: "center 40%" },
];
const SLIDE_INTERVAL_MS = 6000;

function HeroSlides() {
  const [active, setActive] = useState(0);
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(() => setActive((i) => (i + 1) % HERO_SLIDES.length), SLIDE_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active]);

  return (
    <>
      {HERO_SLIDES.map((slide, i) => (
        <div
          key={slide.src}
          aria-hidden
          className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-1000 ${i === active ? "opacity-100" : "opacity-0"}`}
          style={{ backgroundImage: `url('${slide.src}')`, backgroundPosition: slide.position }}
        />
      ))}
      <button
        type="button"
        onClick={() => setActive((active - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)}
        aria-label="Ảnh trước"
        className="absolute left-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white/85 transition-colors hover:bg-black/45 hover:text-white lg:grid"
      >
        <ChevronLeft size={26} />
      </button>
      <button
        type="button"
        onClick={() => setActive((active + 1) % HERO_SLIDES.length)}
        aria-label="Ảnh tiếp theo"
        className="absolute right-3 top-1/2 z-10 hidden size-10 -translate-y-1/2 place-items-center rounded-full bg-black/25 text-white/85 transition-colors hover:bg-black/45 hover:text-white lg:grid"
      >
        <ChevronRight size={26} />
      </button>
      <div className="absolute bottom-4 left-1/2 z-10 flex -translate-x-1/2 items-center gap-1">
        {HERO_SLIDES.map((slide, i) => (
          <button
            key={slide.src}
            type="button"
            onClick={() => setActive(i)}
            aria-label={`Ảnh ${i + 1}`}
            aria-current={i === active}
            className="group grid h-6 w-5 place-items-center"
          >
            <span className={`size-2.5 rounded-full transition-colors ${i === active ? "bg-[#e2c18b]" : "bg-white/55 group-hover:bg-white/85"}`} />
          </button>
        ))}
      </div>
    </>
  );
}

interface HomeHeaderHeroProps {
  user?: SessionUser;
  totalClubs?: number;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openAuthModal: (mode: AuthModalMode) => void;
  signOut: () => void;
}

export function HomeHeaderHero({
  user,
  totalClubs,
  menuOpen,
  setMenuOpen,
  openAuthModal,
  signOut,
}: HomeHeaderHeroProps) {
  const { tr } = useI18n();
  return (
    <>
      <div className="bg-primary px-3 py-2 text-center text-[10px] font-semibold tracking-[.08em] text-white sm:px-5 sm:text-xs sm:tracking-[.14em]">
        <span>{tr("TRƯỜNG ĐẠI HỌC VIỆT NHẬT")}</span> · <span>{tr("ĐẠI HỌC QUỐC GIA HÀ NỘI")}</span>
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex min-h-[68px] max-w-[1380px] items-center justify-between gap-3 px-4 sm:min-h-[76px] sm:gap-5 sm:px-8 lg:px-12">
          <Link href="/home" className="flex min-w-0 items-center gap-2.5 sm:gap-3.5" aria-label="VJU ClubHub - Trang chủ">
            <Image
              src="/images/vju-logo.png"
              alt="Logo Trường Đại học Việt Nhật (VJU)"
              width={46}
              height={46}
              className="size-10 shrink-0 rounded-full bg-white p-0.5 object-contain shadow-2xs ring-1 ring-slate-200 sm:size-[46px]"
            />
            <span className="min-w-0 border-l border-slate-200 pl-2.5 sm:pl-3.5">
              <span className="block truncate text-[10px] font-semibold uppercase tracking-[.12em] text-slate-600 sm:text-[11px] sm:tracking-[.14em]">
                Vietnam Japan University
              </span>
              <span className="mt-0.5 block text-base font-extrabold tracking-tight text-slate-900 sm:text-[18px]">
                CLUB<span className="text-primary">HUB</span>
              </span>
            </span>
          </Link>

          <nav className="hidden items-center gap-4 lg:flex xl:gap-7" aria-label="Điều hướng chính">
            <Link className="whitespace-nowrap text-sm font-bold text-primary" href="/home">Trang chủ</Link>
            <Link className="group inline-flex items-center gap-1 whitespace-nowrap text-sm font-semibold text-slate-700 hover:text-primary" href="/clubs">
              Câu lạc bộ <ChevronDown size={14} />
            </Link>
            <Link className="whitespace-nowrap text-sm font-semibold text-slate-700 hover:text-primary" href="/events">Sự kiện & CTV</Link>
            <a className="whitespace-nowrap text-sm font-semibold text-slate-700 hover:text-primary" href="#hoat-dong">Đời sống VJU</a>
            <a className="whitespace-nowrap text-sm font-semibold text-slate-700 hover:text-primary" href="#tin-tuc">Bảng tin sự kiện</a>
            {user && <Link className="whitespace-nowrap text-sm font-bold text-slate-800 hover:text-primary" href="/dashboard">Bảng điều khiển</Link>}
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <LanguageSwitcher variant="dropdown" size="sm" />
            <div className="hidden items-center gap-2 sm:flex">
              {user ? (
                <>
                  <Link
                    href="/notifications"
                    className="relative grid size-9 shrink-0 place-items-center rounded-lg border border-slate-200 text-slate-700 hover:bg-slate-50 hover:text-primary"
                    aria-label="Thông báo"
                  >
                    <Bell size={17} />
                  </Link>
                  <Link
                    href="/dashboard"
                    className="max-w-[160px] shrink-0 truncate whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:border-primary/40 hover:text-primary lg:max-w-none lg:px-4 lg:text-sm"
                  >
                    {user.fullName || "Vào hệ thống"}
                  </Link>
                  <button
                    onClick={signOut}
                    className="shrink-0 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 lg:px-4 lg:text-sm"
                  >
                    Đăng xuất
                  </button>
                </>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => openAuthModal("login")}
                    className="shrink-0 whitespace-nowrap rounded-lg border border-slate-300 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 hover:text-primary lg:px-4 lg:text-sm"
                  >
                    Đăng nhập
                  </button>
                  <button
                    type="button"
                    onClick={() => openAuthModal("register")}
                    className="shrink-0 whitespace-nowrap rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90 lg:px-4 lg:text-sm"
                  >
                    Gia nhập ngay
                  </button>
                </>
              )}
            </div>

            {!user ? (
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white sm:hidden"
              >
                Gia nhập
              </button>
            ) : (
              <Link
                href="/dashboard"
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-white sm:hidden"
              >
                Dashboard
              </Link>
            )}

            <button
              className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white lg:hidden"
              onClick={() => setMenuOpen((open) => !open)}
              aria-label={menuOpen ? "Đóng menu" : "Mở menu"}
            >
              {menuOpen ? <X size={19} /> : <Menu size={19} />}
            </button>
          </div>
        </div>
        {menuOpen && (
          <nav className="absolute left-0 right-0 top-full grid gap-0.5 border-b border-slate-200 bg-white px-5 py-3 shadow-lg lg:hidden">
            <MobileLink href="/home" onClick={() => setMenuOpen(false)}>Trang chủ</MobileLink>
            <MobileLink href="/clubs" onClick={() => setMenuOpen(false)}>Khám phá câu lạc bộ</MobileLink>
            <MobileLink href="/events" onClick={() => setMenuOpen(false)}>Sự kiện & Đăng ký CTV</MobileLink>
            <MobileLink href="/applications" onClick={() => setMenuOpen(false)}>Đơn đăng ký</MobileLink>
            <MobileLink href="/memberships" onClick={() => setMenuOpen(false)}>CLB đang tham gia</MobileLink>
            {user ? (
              <>
                <MobileLink href="/dashboard" onClick={() => setMenuOpen(false)}>Bảng điều khiển</MobileLink>
                <MobileLink href="/notifications" onClick={() => setMenuOpen(false)}>Thông báo</MobileLink>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="border-b border-slate-100 py-3 text-left text-sm font-semibold text-slate-700 hover:text-primary"
                >
                  Đăng nhập
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="py-3 text-left text-sm font-semibold text-primary"
                >
                  Hãy gia nhập cộng đồng CLB
                </button>
              </>
            )}
          </nav>
        )}
      </header>

      <section className="relative isolate min-h-[480px] overflow-hidden bg-[#1e2024] sm:min-h-[580px] lg:min-h-[660px]">
        <HeroSlides />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(15,17,20,.93)_0%,rgba(18,20,24,.82)_55%,rgba(18,20,24,.35)_100%)]" />
        <div className="mx-auto flex min-h-[480px] max-w-[1380px] flex-col justify-center px-5 py-14 sm:min-h-[580px] sm:px-10 sm:py-20 lg:min-h-[660px] lg:px-20">
          <div className="max-w-[720px] drop-shadow-[0_2px_10px_rgba(0,0,0,0.45)]">
            <p className="flex items-center gap-3 text-[11px] font-bold uppercase tracking-[.18em] text-[#f0cfa0] sm:text-[13px] sm:tracking-[.22em]">
              <span className="h-0.5 w-7 bg-[#f0cfa0] sm:w-9" /> Cộng đồng sinh viên VJU
            </p>
            <h1 className="mt-4 font-serif text-[32px] font-semibold leading-[1.16] tracking-[-.02em] text-white sm:mt-6 sm:text-[48px] md:text-[56px] lg:text-[66px]">
              Mỗi hành trình
              <br />
              bắt đầu từ <span className="italic text-[#f3d4a6] sm:whitespace-nowrap">một cộng đồng.</span>
            </h1>
            <p className="mt-4 max-w-[560px] text-sm font-medium leading-6 text-white/95 sm:mt-6 sm:text-base sm:leading-8">
              {keepWords("Khám phá hệ sinh thái câu lạc bộ sinh viên Trường Đại học Việt Nhật — từ học thuật, công nghệ Monozukuri, văn hóa Việt - Nhật đến nghệ thuật, tình nguyện và thể thao.")}
            </p>
            <div className="mt-7 flex flex-col gap-3 sm:mt-9 sm:flex-row sm:flex-wrap">
              <Link
                href="/clubs"
                className="inline-flex min-h-12 w-full items-center justify-center gap-4 bg-[#9b273a] px-6 text-xs font-bold tracking-wider text-white shadow-md transition-colors hover:bg-[#7c1c2d] sm:w-auto sm:gap-5 sm:text-[13px]"
              >
                KHÁM PHÁ CÂU LẠC BỘ <ArrowRight size={16} />
              </Link>
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 w-full items-center justify-center border border-white/75 bg-black/25 px-6 text-xs font-bold tracking-wider text-white backdrop-blur-xs transition-colors hover:bg-white/15 sm:w-auto sm:text-[13px]"
                >
                  VÀO DASHBOARD
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 border border-white/75 bg-black/25 px-6 text-xs font-bold tracking-wider text-white backdrop-blur-xs transition-colors hover:bg-white/15 sm:w-auto sm:text-[13px]"
                >
                  HÃY GIA NHẬP CỘNG ĐỒNG CLB <ArrowRight size={15} />
                </button>
              )}
            </div>
          </div>
          <div className="mt-10 flex items-center gap-3 text-[11px] font-semibold uppercase tracking-[.14em] text-white/90 sm:mt-14 sm:text-xs sm:tracking-[.18em]">
            <span className="grid size-8 shrink-0 place-items-center rounded-full border border-white/60 bg-black/20">
              <ArrowDown size={14} />
            </span>{" "}
            <span>{totalClubs !== undefined ? `${totalClubs} câu lạc bộ đang hoạt động tại VJU` : "Khám phá đời sống câu lạc bộ"}</span>
          </div>
        </div>
        <div className="absolute bottom-0 right-0 hidden bg-[#8e1f32] px-8 py-5 text-white lg:block">
          <span className="block text-[11px] font-semibold uppercase tracking-[.18em] text-white/85">Vietnam Japan University</span>
          <span className="mt-1 block font-serif text-[19px] font-semibold">Learn · Connect · Create</span>
        </div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-[1380px] divide-y divide-slate-200 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          <IntroItem icon={<UsersRound size={20} />} title="Cộng đồng đa sắc màu" text="Kết nối bạn bè cùng đam mê tại các CLB thực tế VJU." href="/clubs" />
          <IntroItem icon={<CalendarDays size={20} />} title="Sự kiện & Cộng tác viên" text="Đăng ký tham gia hoạt động và sự kiện mở quanh năm." href="/events" />
          <IntroItem
            icon={<BookOpen size={20} />}
            title="Hãy gia nhập & phát triển"
            text="Rèn luyện kỹ năng tổ chức, nghiên cứu và đồng hành cùng các CLB."
            href={user ? "/dashboard" : undefined}
            onClick={user ? undefined : () => openAuthModal("register")}
          />
        </div>
      </section>
    </>
  );
}

function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <Link href={href} onClick={onClick} className="border-b border-slate-100 py-3 text-sm font-semibold text-slate-700">
      {children}
    </Link>
  );
}

function IntroItem({
  icon,
  title,
  text,
  href,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  text: string;
  href?: string;
  onClick?: () => void;
}) {
  const content = (
    <>
      <span className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-primary shadow-2xs transition-colors group-hover:border-primary/40">
        {icon}
      </span>
      <span>
        <span className="block text-[15px] font-bold text-slate-900">{title}</span>
        <span className="mt-0.5 block text-sm text-slate-600">{text}</span>
      </span>
      <ArrowRight size={15} className="ml-auto shrink-0 text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" />
    </>
  );
  if (href) {
    return (
      <Link href={href} className="group flex items-center gap-4 px-2 py-5 md:px-7 md:py-6">
        {content}
      </Link>
    );
  }
  return (
    <button
      type="button"
      onClick={onClick}
      className="group flex w-full items-center gap-4 px-2 py-5 text-left md:px-7 md:py-6"
    >
      {content}
    </button>
  );
}
