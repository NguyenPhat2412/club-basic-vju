"use client";

import Image from "next/image";
import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, Bell, BookOpen, CalendarDays, ChevronDown, ChevronLeft, ChevronRight, LockKeyhole, Menu, UsersRound, X } from "lucide-react";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useRouter } from "next/navigation";
import { apiModel } from "@/lib/api";
import { GoogleSignInButton } from "@/components/shared/GoogleSignInButton";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input } from "@/components/ui/input";

const CLUB_COLORS = ["#b22d43", "#315b76", "#68734b", "#8e1f32", "#7a5330", "#3d5a5b"];

const clubs = [
  { category: "HỌC THUẬT", name: "Học thuật & Công nghệ", description: "Cùng học hỏi, nghiên cứu và biến ý tưởng công nghệ thành những dự án thật.", mark: "01", color: "#b22d43" },
  { category: "VĂN HÓA", name: "Văn hóa & Giao lưu", description: "Kết nối sinh viên Việt Nam và Nhật Bản qua ngôn ngữ, văn hóa và trải nghiệm.", mark: "02", color: "#315b76" },
  { category: "CỘNG ĐỒNG", name: "Tình nguyện & Sự kiện", description: "Tạo nên những hoạt động ý nghĩa và một cộng đồng sinh viên gắn kết.", mark: "03", color: "#68734b" },
];

const news = [
  { date: "18.10.2026", category: "THÔNG BÁO", title: "Chào đón thành viên mới — mùa hoạt động câu lạc bộ bắt đầu", color: "#315b76" },
  { date: "12.10.2026", category: "SỰ KIỆN", title: "Tuần lễ trải nghiệm và kết nối các câu lạc bộ VJU", color: "#a23d4d" },
  { date: "06.10.2026", category: "HOẠT ĐỘNG", title: "Cùng sinh viên VJU tạo nên những điều đáng nhớ", color: "#737b54" },
];

const HERO_SLIDES = [
  { src: "/images/vju-hero-cover.jpg", position: "center 43%" },
  { src: "/images/vju-campus-life.webp", position: "center" },
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
        <div key={slide.src} aria-hidden className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-1000 ${i === active ? "opacity-100" : "opacity-0"}`} style={{ backgroundImage: `url('${slide.src}')`, backgroundPosition: slide.position }} />
      ))}
      <button type="button" onClick={() => setActive((active - 1 + HERO_SLIDES.length) % HERO_SLIDES.length)} aria-label="Ảnh trước" className="absolute left-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white"><ChevronLeft size={26} /></button>
      <button type="button" onClick={() => setActive((active + 1) % HERO_SLIDES.length)} aria-label="Ảnh tiếp theo" className="absolute right-3 top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full text-white/60 transition-colors hover:bg-white/15 hover:text-white"><ChevronRight size={26} /></button>
      <div className="absolute bottom-6 left-1/2 z-10 flex -translate-x-1/2 gap-2.5">
        {HERO_SLIDES.map((slide, i) => (
          <button key={slide.src} type="button" onClick={() => setActive(i)} aria-label={`Ảnh ${i + 1}`} aria-current={i === active} className={`size-2.5 rounded-full transition-colors ${i === active ? "bg-[#2f7de1]" : "bg-white/45 hover:bg-white/75"}`} />
        ))}
      </div>
    </>
  );
}

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return `${String(d.getDate()).padStart(2, "0")}.${String(d.getMonth() + 1).padStart(2, "0")}.${d.getFullYear()}`;
}

export default function HomePage() {
  const session = useOptionalSession();
  const clubsQuery = useQuery({ queryKey: ["home", "public-clubs"], queryFn: () => apiModel.publicClubs("", "", 0, 6), retry: 1 });
  const eventsQuery = useQuery({ queryKey: ["home", "public-events"], queryFn: () => apiModel.publicEvents(0, 5), retry: 1 });
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);

  const featuredClubs = clubsQuery.data?.items.length ? clubsQuery.data.items.map((club, index) => ({
    category: club.activityField || club.code || "CÂU LẠC BỘ VJU",
    name: club.name,
    description: club.description || "Khám phá hoạt động và cơ hội kết nối tại câu lạc bộ.",
    mark: String(index + 1).padStart(2, "0"),
    color: CLUB_COLORS[index % CLUB_COLORS.length],
  })) : clubs;

  const featuredEvents = eventsQuery.data?.items.length ? eventsQuery.data.items.map((ev, index) => ({
    date: formatShortDate(ev.startTime),
    category: ev.clubName || ev.eventType || "SỰ KIỆN CLB",
    title: ev.title + (ev.location ? ` · ${ev.location}` : ""),
    color: CLUB_COLORS[index % CLUB_COLORS.length],
  })) : news;

  const afterSignIn = () => {
    queryClient.clear();
    router.push("/dashboard");
  };

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await apiModel.login(email, password);
      afterSignIn();
    } catch (err) {
      setLoginError(describeError(err));
    } finally {
      setLoginLoading(false);
    }
  };

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.clear();
    router.push("/home");
  };

  return (
    <main className="min-h-screen bg-slate-50 text-slate-900">
      <div className="bg-primary px-5 py-2 text-center text-[10px] font-semibold tracking-[.18em] text-white sm:text-[11px]">
        TRƯỜNG ĐẠI HỌC VIỆT NHẬT · ĐẠI HỌC QUỐC GIA HÀ NỘI
      </div>

      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs">
        <div className="mx-auto flex min-h-[76px] max-w-[1380px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/home" className="flex min-w-0 items-center gap-3.5" aria-label="VJU ClubHub - Trang chủ">
            <Image src="/images/vju-logo.png" alt="Logo Trường Đại học Việt Nhật (VJU)" width={46} height={46} className="size-[46px] shrink-0 rounded-full bg-white p-0.5 object-contain shadow-2xs ring-1 ring-slate-200" />
            <span className="min-w-0 border-l border-slate-200 pl-3.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[.16em] text-slate-500 sm:text-[10px]">Vietnam Japan University</span>
              <span className="mt-0.5 block text-[17px] font-extrabold tracking-tight text-slate-900">CLUB<span className="text-primary">HUB</span></span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 xl:flex" aria-label="Điều hướng chính">
            <Link className="text-xs font-bold text-primary" href="/home">Trang chủ</Link>
            <Link className="group inline-flex items-center gap-1 text-xs font-medium text-slate-600 hover:text-primary" href="/clubs">Câu lạc bộ <ChevronDown size={13} /></Link>
            <a className="text-xs font-medium text-slate-600 hover:text-primary" href="#hoat-dong">Hoạt động</a>
            <a className="text-xs font-medium text-slate-600 hover:text-primary" href="#tin-tuc">Tin tức & sự kiện</a>
            {session.user && <Link className="text-xs font-semibold text-slate-700 hover:text-primary" href="/dashboard">Bảng điều khiển</Link>}
          </nav>

          <div className="hidden items-center gap-2.5 xl:flex">
            {session.user ? <>
              <Link href="/notifications" className="relative grid size-9 place-items-center rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-primary" aria-label="Thông báo"><Bell size={16} /></Link>
              <Link href="/dashboard" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:border-primary/40 hover:text-primary">{session.user.fullName || "Vào hệ thống"}</Link>
              <button onClick={signOut} className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90">Đăng xuất</button>
            </> : <>
              <Link href="/login" className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 hover:text-primary">Đăng nhập</Link>
              <Link href="/register" className="rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-white transition-colors hover:opacity-90">Đăng ký</Link>
            </>}
          </div>

          <button className="grid size-10 place-items-center rounded-lg border border-slate-200 bg-white xl:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <nav className="absolute left-0 right-0 top-full grid gap-0.5 border-b border-slate-200 bg-white px-5 py-3 shadow-lg xl:hidden">
          <MobileLink href="/home" onClick={() => setMenuOpen(false)}>Trang chủ</MobileLink><MobileLink href="/clubs" onClick={() => setMenuOpen(false)}>Khám phá câu lạc bộ</MobileLink>
          <MobileLink href="/applications" onClick={() => setMenuOpen(false)}>Đơn đăng ký</MobileLink><MobileLink href="/memberships" onClick={() => setMenuOpen(false)}>CLB đang tham gia</MobileLink>
          <MobileLink href={session.user ? "/dashboard" : "/login"} onClick={() => setMenuOpen(false)}>Bảng điều khiển</MobileLink><MobileLink href={session.user ? "/notifications" : "/login"} onClick={() => setMenuOpen(false)}>Thông báo / Đăng nhập</MobileLink>
          {!session.user && <MobileLink href="/register" onClick={() => setMenuOpen(false)}>Đăng ký tài khoản</MobileLink>}
        </nav>}
      </header>

      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#252629] sm:min-h-[630px] lg:min-h-[670px]">
        <HeroSlides />
        <div className="absolute inset-0 -z-10 bg-[linear-gradient(90deg,rgba(21,23,26,.87)_0%,rgba(25,25,26,.64)_48%,rgba(25,25,26,.16)_100%)]" />
        <div className="mx-auto flex min-h-[560px] max-w-[1380px] flex-col justify-center px-6 py-20 sm:min-h-[630px] sm:px-10 lg:min-h-[670px] lg:px-16">
          <div className="max-w-[720px]">
            <p className="flex items-center gap-3 text-[10px] font-semibold uppercase tracking-[.25em] text-[#e2c18b] sm:text-[11px]"><span className="h-px w-9 bg-[#e2c18b]" /> Cộng đồng sinh viên VJU</p>
            <h1 className="mt-7 font-serif text-[42px] font-medium leading-[1.13] tracking-[-.025em] text-white sm:text-[58px] lg:text-[72px]">Mỗi hành trình<br />bắt đầu từ <span className="italic text-[#e5c99d]">một cộng đồng.</span></h1>
            <p className="mt-6 max-w-[520px] text-[14px] leading-7 text-white/80 sm:text-[15px]">Tìm câu lạc bộ phù hợp, gặp những người cùng sở thích và cùng tạo nên những trải nghiệm đáng nhớ tại VJU.</p>
            <div className="mt-9 flex flex-wrap gap-3">
              <Link href="/clubs" className="inline-flex min-h-12 items-center gap-5 bg-[#9b273a] px-6 text-[11px] font-semibold text-white transition-colors hover:bg-[#7c1c2d]">KHÁM PHÁ CÂU LẠC BỘ <ArrowRight size={15} /></Link>
              <Link href={session.user ? "/dashboard" : "/register"} className="inline-flex min-h-12 items-center border border-white/55 px-6 text-[11px] font-semibold text-white transition-colors hover:bg-white/10">{session.user ? "VÀO DASHBOARD" : "TRỞ THÀNH THÀNH VIÊN"}</Link>
            </div>
          </div>
          <div className="mt-14 flex items-center gap-3 text-[9px] font-medium uppercase tracking-[.2em] text-white/70"><span className="grid size-8 place-items-center rounded-full border border-white/40"><ArrowDown size={13} /></span> Khám phá đời sống câu lạc bộ</div>
        </div>
        <div className="absolute bottom-0 right-0 hidden bg-[#8e1f32] px-8 py-5 text-white md:block"><span className="block text-[9px] font-semibold uppercase tracking-[.2em] text-white/70">Vietnam Japan University</span><span className="mt-1 block font-serif text-[18px]">Learn · Connect · Create</span></div>
      </section>

      <section className="border-b border-slate-200 bg-slate-50/70">
        <div className="mx-auto grid max-w-[1380px] divide-y divide-slate-200 px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          <IntroItem icon={<UsersRound size={19} />} title="Cộng đồng đa sắc màu" text="Kết nối với những người bạn cùng đam mê." href="/clubs" />
          <IntroItem icon={<CalendarDays size={19} />} title="Hoạt động quanh năm" text="Trải nghiệm, khám phá và trưởng thành cùng nhau." href="#hoat-dong" />
          <IntroItem icon={<BookOpen size={19} />} title="Phát triển cùng VJU" text="Tích lũy kỹ năng ngoài giảng đường." href="/register" />
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 sm:py-20 lg:px-12" id="cau-lac-bo">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><Eyebrow>KHÁM PHÁ VJU</Eyebrow><h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Tìm nơi bạn thuộc về.</h2></div>
          <Link href="/clubs" className="inline-flex items-center gap-2 pb-1 text-xs font-bold text-primary hover:underline">XEM TẤT CẢ CÂU LẠC BỘ <ArrowRight size={15} /></Link>
        </div>
        <p className="mt-3 max-w-[600px] text-sm leading-6 text-slate-600">Từ học thuật, văn hóa đến hoạt động cộng đồng — hãy chọn một hành trình khiến bạn hào hứng.</p>
        <div className="mt-8 grid gap-5 md:grid-cols-3">
          {featuredClubs.map((club) => <Link href="/clubs" key={club.mark + club.name} className="group relative flex min-h-[250px] flex-col justify-between overflow-hidden rounded-xl border border-slate-200 bg-white p-6 shadow-2xs transition-all hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md">
            <div>
              <div className="flex items-center justify-between">
                <span className="rounded-full bg-primary/8 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">{club.category}</span>
                <span className="font-mono text-2xl font-bold text-slate-200">{club.mark}</span>
              </div>
              <h3 className="mt-6 text-xl font-bold leading-tight text-slate-900">{club.name}</h3>
              <p className="mt-2.5 text-xs leading-6 text-slate-600">{club.description}</p>
            </div>
            <span className="mt-6 inline-flex items-center gap-2 text-xs font-bold text-primary">Tìm hiểu thêm <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </Link>)}
        </div>
      </section>

      <section id="hoat-dong" className="border-y border-slate-200 bg-white">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[.88fr_1.12fr] lg:items-center lg:px-12">
          <div>
            <Eyebrow>ĐỜI SỐNG VJU</Eyebrow>
            <h2 className="mt-2 max-w-lg text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Ngoài lớp học, còn cả một thế giới.</h2>
            <p className="mt-4 max-w-lg text-sm leading-7 text-slate-600">Những buổi gặp gỡ, dự án chung và sự kiện do sinh viên khởi xướng tạo nên bản sắc năng động của cộng đồng VJU.</p>
            <Link href="/clubs" className="mt-6 inline-flex h-10 items-center gap-2.5 rounded-lg bg-primary px-5 text-xs font-bold text-white hover:opacity-90">TÌM HOẠT ĐỘNG PHÙ HỢP <ArrowRight size={14} /></Link>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 overflow-hidden rounded-xl border border-slate-200 bg-slate-50 shadow-2xs">
              <div className="h-52 w-full bg-cover bg-center sm:h-64" style={{ backgroundImage: "url('/images/vju-campus-life.webp')" }} />
              <div className="flex items-center justify-between bg-white px-5 py-3.5">
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-primary">CÙNG NHAU TRẢI NGHIỆM</p>
                  <p className="mt-0.5 text-sm font-bold text-slate-900">Một cộng đồng, nhiều sắc màu</p>
                </div>
              </div>
            </div>
            <div className="flex min-h-[110px] flex-col justify-between rounded-xl border border-slate-200 bg-slate-50 p-5">
              <CalendarDays className="text-primary" size={20} />
              <span className="text-sm font-bold text-slate-900">Sự kiện sinh viên định kỳ</span>
            </div>
            <div className="flex min-h-[110px] flex-col justify-between rounded-xl border border-primary/20 bg-primary/8 p-5">
              <UsersRound className="text-primary" size={20} />
              <span className="text-sm font-bold text-primary">Kết nối liên câu lạc bộ</span>
            </div>
          </div>
        </div>
      </section>

      <section id="tin-tuc" className="mx-auto max-w-[1380px] px-5 py-16 sm:px-8 lg:px-12">
        <div className="flex items-end justify-between gap-4">
          <div><Eyebrow>BẢNG TIN CÂU LẠC BỘ</Eyebrow><h2 className="mt-2 text-3xl font-bold text-slate-900 sm:text-4xl">Tin tức & sự kiện</h2></div>
          <Link href="/notifications" className="hidden items-center gap-2 text-xs font-bold text-primary hover:underline sm:inline-flex">XEM THÔNG BÁO <ArrowRight size={14} /></Link>
        </div>
        <div className="mt-7 divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xs">
          {featuredEvents.map((item) => <Link href={session.user ? "/notifications" : "/clubs"} key={item.title + item.date} className="group grid gap-3 p-4 transition-colors hover:bg-slate-50 sm:grid-cols-[120px_160px_1fr_24px] sm:items-center sm:gap-5 sm:px-6">
            <span className="font-mono text-xs font-semibold text-slate-500">{item.date}</span>
            <span className="truncate text-[11px] font-bold uppercase tracking-wider text-primary">{item.category}</span>
            <span className="text-sm font-bold text-slate-900 group-hover:text-primary">{item.title}</span>
            <ArrowRight size={16} className="hidden text-primary transition-transform group-hover:translate-x-1 sm:block" />
          </Link>)}
        </div>
      </section>

      {!session.user && (
        <section id="dang-nhap" className="border-t border-slate-200 bg-white">
          <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_460px] lg:items-center lg:px-12">
            <div>
              <Eyebrow>KHU VỰC THÀNH VIÊN & QUẢN TRỊ</Eyebrow>
              <h2 className="mt-2 text-3xl font-bold leading-tight text-slate-900 sm:text-4xl">Đăng nhập vào không gian CLB của bạn.</h2>
              <p className="mt-4 max-w-xl text-sm leading-7 text-slate-600">
                Sau khi đăng nhập, hệ thống sẽ tự động điều hướng vào trang cá nhân (nộp đơn, lịch sự kiện, công việc, thông báo) hoặc không gian Quản trị CLB & Quản trị hệ thống theo đúng vai trò của bạn.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-xs text-slate-600">
                <Link href="/login" className="font-bold text-primary hover:underline">Mở trang đăng nhập riêng →</Link>
                <span>·</span>
                <Link href="/register" className="hover:text-primary hover:underline">Chưa có tài khoản? Đăng ký</Link>
              </div>
            </div>

            <form onSubmit={submitLogin} className="rounded-2xl border border-slate-200 bg-slate-50/70 p-6 shadow-xs sm:p-8">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary">ĐĂNG NHẬP NHANH</p>
              <h3 className="mt-1.5 text-xl font-bold text-slate-900">Tài khoản VJU ClubHub</h3>
              <div className="mt-5 grid gap-4">
                <GoogleSignInButton onSignedIn={afterSignIn} width={300} withDivider />
                <FormField label="Địa chỉ email">
                  <Input
                    required
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sinhvien@vju.ac.vn"
                    className="h-10 rounded-lg border-slate-200 bg-white px-3.5 text-xs"
                  />
                </FormField>
                <FormField label="Mật khẩu">
                  <Input
                    required
                    type="password"
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-10 rounded-lg border-slate-200 bg-white px-3.5 text-xs"
                  />
                </FormField>
                {loginError && (
                  <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="mt-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"
                >
                  <LockKeyhole size={14} />
                  {loginLoading ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP HỆ THỐNG"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <footer className="border-t border-slate-200 bg-white text-slate-700">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <Image src="/images/vju-logo.png" alt="Logo Trường Đại học Việt Nhật (VJU)" width={40} height={40} className="size-10 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200" />
              <span className="text-base font-extrabold tracking-tight text-slate-900">CLUB<span className="text-primary">HUB</span></span>
            </div>
            <p className="mt-4 max-w-sm text-xs leading-6 text-slate-500">Cổng thông tin câu lạc bộ và hoạt động sinh viên Trường Đại học Việt Nhật (ĐHQGHN).</p>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">LIÊN KẾT NHANH</p>
            <div className="mt-3.5 grid gap-2.5 text-xs text-slate-600">
              <Link className="hover:text-primary" href="/clubs">Khám phá câu lạc bộ</Link>
              <Link className="hover:text-primary" href="/applications">Đơn đăng ký</Link>
              <Link className="hover:text-primary" href="/memberships">CLB đang tham gia</Link>
              <Link className="hover:text-primary" href="/notifications">Thông báo</Link>
            </div>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">TRƯỜNG ĐẠI HỌC VIỆT NHẬT</p>
            <p className="mt-3.5 text-xs leading-6 text-slate-600">Đại học Quốc gia Hà Nội<br />Hòa Lạc, Hà Nội, Việt Nam</p>
            <a className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline" href="https://vju.ac.vn" target="_blank" rel="noreferrer">vju.ac.vn <ArrowRight size={12} /></a>
          </div>
        </div>
        <div className="border-t border-slate-100 bg-slate-50">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-2 px-5 py-4 text-[11px] text-slate-500 sm:px-8 md:flex-row md:justify-between lg:px-12">
            <span>© 2026 VJU ClubHub · Hệ thống Quản lý Câu lạc bộ Sinh viên</span>
            <span>Trường Đại học Việt Nhật · ĐHQGHN</span>
          </div>
        </div>
      </footer>
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="text-[10px] font-bold uppercase tracking-wider text-primary">{children}</p>; }
function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) { return <Link href={href} onClick={onClick} className="border-b border-slate-100 py-3 text-xs font-semibold text-slate-700">{children}</Link>; }
function IntroItem({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) { return <Link href={href} className="group flex items-center gap-4 px-2 py-5 md:px-7 md:py-6"><span className="grid size-11 shrink-0 place-items-center rounded-xl border border-slate-200 bg-white text-primary shadow-2xs transition-colors group-hover:border-primary/40">{icon}</span><span><span className="block text-sm font-bold text-slate-900">{title}</span><span className="mt-0.5 block text-xs text-slate-500">{text}</span></span><ArrowRight size={14} className="ml-auto shrink-0 text-primary opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" /></Link>; }
