"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowDown, ArrowRight, Bell, BookOpen, CalendarDays, ChevronDown, LockKeyhole, Menu, UsersRound, X } from "lucide-react";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useRouter } from "next/navigation";
import { apiModel } from "@/lib/api";
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

  const submitLogin = async (event: FormEvent) => {
    event.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      await apiModel.login(email, password);
      queryClient.clear();
      router.push("/dashboard");
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
    <main className="min-h-screen bg-[#faf9f6] text-[#252525]">
      <div className="bg-[#8e1f32] px-5 py-2 text-center text-[10px] font-semibold tracking-[.18em] text-white sm:text-[11px]">
        TRƯỜNG ĐẠI HỌC VIỆT NHẬT · ĐẠI HỌC QUỐC GIA HÀ NỘI
      </div>

      <header className="relative z-30 border-b border-[#e8e4df] bg-[#faf9f6]">
        <div className="mx-auto flex min-h-[88px] max-w-[1380px] items-center justify-between gap-5 px-5 sm:px-8 lg:px-12">
          <Link href="/home" className="flex min-w-0 items-center gap-3.5" aria-label="VJU ClubHub - Trang chủ">
            <span className="flex size-[52px] shrink-0 items-center justify-center rounded-full border border-[#b58b54] text-[13px] font-black tracking-widest text-[#8e1f32]">VJU</span>
            <span className="min-w-0 border-l border-[#d8d1c8] pl-3.5">
              <span className="block text-[9px] font-semibold uppercase tracking-[.16em] text-[#77716a] sm:text-[10px]">Vietnam Japan University</span>
              <span className="mt-1 block text-[17px] font-semibold tracking-[.02em] text-[#292725]">CLUB<span className="font-normal text-[#8e1f32]">HUB</span></span>
            </span>
          </Link>

          <nav className="hidden items-center gap-7 xl:flex" aria-label="Điều hướng chính">
            <Link className="text-[12px] font-semibold text-[#8e1f32]" href="/home">Trang chủ</Link>
            <Link className="group inline-flex items-center gap-1 text-[12px] font-medium text-[#3f3b37] hover:text-[#8e1f32]" href="/clubs">Câu lạc bộ <ChevronDown size={13} /></Link>
            <a className="text-[12px] font-medium text-[#3f3b37] hover:text-[#8e1f32]" href="#hoat-dong">Hoạt động</a>
            <a className="text-[12px] font-medium text-[#3f3b37] hover:text-[#8e1f32]" href="#tin-tuc">Tin tức & sự kiện</a>
            {session.user && <Link className="text-[12px] font-medium text-[#3f3b37] hover:text-[#8e1f32]" href="/dashboard">Dashboard</Link>}
          </nav>

          <div className="hidden items-center gap-3 xl:flex">
            {session.user ? <>
              <Link href="/notifications" className="relative grid size-9 place-items-center text-[#625c55] hover:text-[#8e1f32]" aria-label="Thông báo"><Bell size={17} /></Link>
              <Link href="/profile" className="border border-[#d8d1c8] px-4 py-2 text-[11px] font-semibold hover:border-[#8e1f32] hover:text-[#8e1f32]">{session.user.fullName || "Tài khoản"}</Link>
              <button onClick={signOut} className="bg-[#8e1f32] px-4 py-2.5 text-[11px] font-semibold text-white transition-colors hover:bg-[#711829]">Đăng xuất</button>
            </> : <>
              <Link href="/login" className="px-3 py-2 text-[11px] font-semibold text-[#3f3b37] hover:text-[#8e1f32]">Đăng nhập</Link>
              <Link href="/register" className="bg-[#8e1f32] px-5 py-3 text-[11px] font-semibold text-white transition-colors hover:bg-[#711829]">Tham gia CLB</Link>
            </>}
          </div>

          <button className="grid size-10 place-items-center border border-[#e8e4df] xl:hidden" onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"}>
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
        {menuOpen && <nav className="absolute left-0 right-0 top-full grid gap-0.5 border-b border-[#e8e4df] bg-[#faf9f6] px-5 py-3 shadow-lg xl:hidden">
          <MobileLink href="/home" onClick={() => setMenuOpen(false)}>Trang chủ</MobileLink><MobileLink href="/clubs" onClick={() => setMenuOpen(false)}>Khám phá câu lạc bộ</MobileLink>
          <MobileLink href="/applications" onClick={() => setMenuOpen(false)}>Đơn đăng ký</MobileLink><MobileLink href="/memberships" onClick={() => setMenuOpen(false)}>CLB đang tham gia</MobileLink>
          <MobileLink href={session.user ? "/dashboard" : "/login"} onClick={() => setMenuOpen(false)}>Dashboard</MobileLink><MobileLink href={session.user ? "/notifications" : "/login"} onClick={() => setMenuOpen(false)}>Thông báo / Đăng nhập</MobileLink>
        </nav>}
      </header>

      <section className="relative isolate min-h-[560px] overflow-hidden bg-[#252629] sm:min-h-[630px] lg:min-h-[670px]">
        <div className="absolute inset-0 -z-20 bg-cover bg-[center_43%]" style={{ backgroundImage: "url('/images/vju-hero-cover.jpg')" }} />
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

      <section className="border-b border-[#e8e4df] bg-white">
        <div className="mx-auto grid max-w-[1380px] divide-y divide-[#e8e4df] px-5 sm:px-8 md:grid-cols-3 md:divide-x md:divide-y-0 lg:px-12">
          <IntroItem icon={<UsersRound size={19} />} title="Cộng đồng đa sắc màu" text="Kết nối với những người bạn cùng đam mê." href="/clubs" />
          <IntroItem icon={<CalendarDays size={19} />} title="Hoạt động quanh năm" text="Trải nghiệm, khám phá và trưởng thành cùng nhau." href="#hoat-dong" />
          <IntroItem icon={<BookOpen size={19} />} title="Phát triển cùng VJU" text="Tích lũy kỹ năng ngoài giảng đường." href="/register" />
        </div>
      </section>

      <section className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12 lg:py-28" id="cau-lac-bo">
        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end">
          <div><Eyebrow>KHÁM PHÁ VJU</Eyebrow><h2 className="mt-3 font-serif text-[36px] font-medium leading-tight sm:text-[48px]">Tìm nơi bạn thuộc về.</h2></div>
          <Link href="/clubs" className="inline-flex items-center gap-3 pb-1 text-[11px] font-semibold text-[#8e1f32]">XEM TẤT CẢ CÂU LẠC BỘ <ArrowRight size={15} /></Link>
        </div>
        <p className="mt-4 max-w-[600px] text-[13px] leading-7 text-[#77716a]">Từ học thuật, văn hóa đến hoạt động cộng đồng — hãy chọn một hành trình khiến bạn hào hứng.</p>
        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {featuredClubs.map((club) => <Link href="/clubs" key={club.mark + club.name} className="group relative flex min-h-[275px] flex-col justify-between overflow-hidden bg-white p-7 ring-1 ring-[#e8e4df] transition-all hover:-translate-y-1 hover:shadow-xl">
            <div className="absolute right-0 top-0 h-1 w-full origin-left scale-x-0 transition-transform group-hover:scale-x-100" style={{ backgroundColor: club.color }} />
            <div><div className="flex items-center justify-between"><span className="text-[9px] font-bold tracking-[.2em]" style={{ color: club.color }}>{club.category}</span><span className="font-serif text-[32px] text-[#e6e0d8]">{club.mark}</span></div>
              <h3 className="mt-8 font-serif text-[25px] leading-tight">{club.name}</h3><p className="mt-3 text-[12px] leading-6 text-[#77716a]">{club.description}</p></div>
            <span className="mt-7 inline-flex items-center gap-2 text-[10px] font-semibold uppercase tracking-[.12em]" style={{ color: club.color }}>Tìm hiểu thêm <ArrowRight size={14} className="transition-transform group-hover:translate-x-1" /></span>
          </Link>)}
        </div>
        {!clubsQuery.data?.items.length && <p className="mt-4 text-[10px] text-[#99928a]">Đang hiển thị nội dung mẫu. Danh sách câu lạc bộ thật sẽ xuất hiện khi có dữ liệu công khai.</p>}
      </section>

      <section id="hoat-dong" className="bg-[#eeeae3]">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[.85fr_1.15fr] lg:items-center lg:px-12 lg:py-24">
          <div><Eyebrow>ĐỜI SỐNG VJU</Eyebrow><h2 className="mt-3 max-w-lg font-serif text-[38px] font-medium leading-[1.15] sm:text-[50px]">Ngoài lớp học,<br />còn cả một thế giới.</h2><p className="mt-5 max-w-lg text-[13px] leading-7 text-[#6d675f]">Những buổi gặp gỡ, dự án chung và sự kiện do sinh viên khởi xướng tạo nên bản sắc của cộng đồng VJU.</p><Link href="/clubs" className="mt-7 inline-flex items-center gap-3 bg-[#8e1f32] px-5 py-3.5 text-[10px] font-semibold text-white hover:bg-[#711829]">TÌM HOẠT ĐỘNG PHÙ HỢP <ArrowRight size={14} /></Link></div>
          <div className="grid grid-cols-2 gap-3 sm:gap-4">
            <div className="relative col-span-2 min-h-[210px] overflow-hidden bg-[#565d5e] sm:min-h-[290px]"><div className="absolute inset-0 bg-cover bg-center opacity-75 mix-blend-luminosity" style={{ backgroundImage: "url('/images/vju-campus-life.webp')" }} /><div className="absolute inset-0 bg-gradient-to-t from-black/65 to-transparent" /><div className="absolute bottom-5 left-5 text-white"><p className="text-[9px] font-semibold uppercase tracking-[.2em] text-white/70">CÙNG NHAU TRẢI NGHIỆM</p><p className="mt-1 font-serif text-[22px]">Một cộng đồng, nhiều sắc màu</p></div></div>
            <div className="flex min-h-[120px] flex-col justify-between bg-white p-5 sm:min-h-[145px] sm:p-6"><CalendarDays className="text-[#8e1f32]" size={18} /><span className="font-serif text-[17px]">Sự kiện sinh viên</span></div>
            <div className="flex min-h-[120px] flex-col justify-between bg-[#8e1f32] p-5 text-white sm:min-h-[145px] sm:p-6"><UsersRound className="text-white/70" size={18} /><span className="font-serif text-[17px]">Kết nối câu lạc bộ</span></div>
          </div>
        </div>
      </section>

      <section id="tin-tuc" className="mx-auto max-w-[1380px] px-5 py-20 sm:px-8 sm:py-24 lg:px-12">
        <div className="flex items-end justify-between gap-4"><div><Eyebrow>BẢNG TIN CÂU LẠC BỘ</Eyebrow><h2 className="mt-3 font-serif text-[36px] font-medium sm:text-[46px]">Tin tức & sự kiện</h2></div><Link href="/notifications" className="hidden items-center gap-2 text-[10px] font-semibold text-[#8e1f32] sm:inline-flex">XEM THÔNG BÁO <ArrowRight size={14} /></Link></div>
        <div className="mt-9 divide-y divide-[#e8e4df] border-y border-[#e8e4df]">
          {featuredEvents.map((item) => <Link href={session.user ? "/notifications" : "/clubs"} key={item.title + item.date} className="group grid gap-3 py-5 transition-colors hover:bg-white sm:grid-cols-[120px_160px_1fr_24px] sm:items-center sm:gap-5 sm:px-4">
            <span className="text-[10px] tracking-wide text-[#8a837b]">{item.date}</span><span className="truncate text-[9px] font-bold tracking-[.13em]" style={{ color: item.color }}>{item.category}</span><span className="font-serif text-[19px] leading-snug group-hover:text-[#8e1f32]">{item.title}</span><ArrowRight size={16} className="hidden text-[#8e1f32] transition-transform group-hover:translate-x-1 sm:block" />
          </Link>)}
        </div>
        {!eventsQuery.data?.items.length && <p className="mt-3 text-[10px] text-[#99928a]">Nội dung minh họa. Sự kiện câu lạc bộ công khai sẽ tự động hiển thị khi được mở đăng ký.</p>}
      </section>

      {!session.user && (
        <section id="dang-nhap" className="border-t border-[#e8e4df] bg-white">
          <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-16 sm:px-8 lg:grid-cols-[1fr_460px] lg:items-center lg:px-12 lg:py-20">
            <div>
              <Eyebrow>KHU VỰC THÀNH VIÊN & QUẢN TRỊ</Eyebrow>
              <h2 className="mt-3 font-serif text-[34px] font-medium leading-tight sm:text-[44px]">Đăng nhập vào không gian CLB của bạn.</h2>
              <p className="mt-4 max-w-xl text-[13px] leading-7 text-[#6d675f]">
                Sau khi đăng nhập, hệ thống sẽ tự động phân quyền vào trang cá nhân (nộp đơn, lịch sự kiện, công việc, thông báo) hoặc không gian Quản trị CLB & Quản trị hệ thống theo đúng vai trò của bạn.
              </p>
              <div className="mt-6 flex flex-wrap gap-3 text-[11px] text-[#77716a]">
                <Link href="/login" className="font-semibold text-[#8e1f32] hover:underline">Mở trang đăng nhập riêng →</Link>
                <span>·</span>
                <Link href="/register" className="hover:text-[#8e1f32] hover:underline">Hướng dẫn cấp tài khoản</Link>
              </div>
            </div>

            <form onSubmit={submitLogin} className="border border-[#e8e4df] bg-[#faf9f6] p-6 shadow-sm sm:p-8">
              <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8e1f32]">ĐĂNG NHẬP NHANH</p>
              <h3 className="mt-2 font-serif text-[26px]">Tài khoản VJU ClubHub</h3>
              <div className="mt-5 grid gap-4">
                <FormField label="Địa chỉ email">
                  <Input
                    required
                    type="email"
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="sinhvien@vju.ac.vn"
                    className="h-11 rounded-none border-[#d8d1c8] bg-white px-3.5 text-[13px]"
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
                    className="h-11 rounded-none border-[#d8d1c8] bg-white px-3.5 text-[13px]"
                  />
                </FormField>
                {loginError && (
                  <p role="alert" className="border border-red-200 bg-red-50 px-3.5 py-2.5 text-xs text-red-800">
                    {loginError}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={loginLoading}
                  className="mt-1 flex h-11 items-center justify-center gap-2.5 bg-[#8e1f32] text-[11px] font-semibold text-white transition-colors hover:bg-[#711829] disabled:opacity-60"
                >
                  <LockKeyhole size={15} />
                  {loginLoading ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP HỆ THỐNG"}
                  <ArrowRight size={14} />
                </button>
              </div>
            </form>
          </div>
        </section>
      )}

      <section className="bg-[#8e1f32] text-white">
        <div className="mx-auto flex max-w-[1380px] flex-col gap-7 px-5 py-12 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
          <div><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-white/65">SẴN SÀNG CHO HÀNH TRÌNH MỚI?</p><h2 className="mt-2 font-serif text-[29px] sm:text-[36px]">Câu lạc bộ tiếp theo đang chờ bạn.</h2></div>
          <Link href={session.user ? "/clubs" : "/register"} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-4 border border-white/60 px-6 text-[10px] font-semibold hover:bg-white hover:text-[#8e1f32]">{session.user ? "KHÁM PHÁ CÂU LẠC BỘ" : "THAM GIA CỘNG ĐỒNG VJU"}<ArrowRight size={15} /></Link>
        </div>
      </section>

      <footer className="bg-[#262522] text-white">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-12 sm:px-8 md:grid-cols-[1.4fr_1fr_1fr] lg:px-12 lg:py-16">
          <div><div className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full border border-[#b58b54] text-[11px] font-black tracking-widest text-[#e5c99d]">VJU</span><span className="font-semibold tracking-wide">CLUB<span className="font-normal text-[#e5c99d]">HUB</span></span></div><p className="mt-5 max-w-sm text-[12px] leading-6 text-white/60">Cổng thông tin câu lạc bộ và hoạt động sinh viên Trường Đại học Việt Nhật.</p></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#e5c99d]">LIÊN KẾT NHANH</p><div className="mt-4 grid gap-3 text-[12px] text-white/75"><Link className="hover:text-white" href="/clubs">Khám phá câu lạc bộ</Link><Link className="hover:text-white" href="/applications">Đơn đăng ký</Link><Link className="hover:text-white" href="/memberships">CLB đang tham gia</Link><Link className="hover:text-white" href="/notifications">Thông báo</Link></div></div>
          <div><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#e5c99d]">TRƯỜNG ĐẠI HỌC VIỆT NHẬT</p><p className="mt-4 text-[12px] leading-6 text-white/75">Đại học Quốc gia Hà Nội<br />Hòa Lạc, Hà Nội, Việt Nam</p><a className="mt-3 inline-flex items-center gap-2 text-[11px] text-white/60 hover:text-white" href="https://vju.ac.vn" target="_blank" rel="noreferrer">vju.ac.vn <ArrowRight size={12} /></a></div>
        </div>
        <div className="border-t border-white/10"><div className="mx-auto flex max-w-[1380px] flex-col gap-2 px-5 py-4 text-[9px] tracking-wide text-white/45 sm:px-8 md:flex-row md:justify-between lg:px-12"><span>© 2026 VJU ClubHub · Bản xem trước giao diện</span><span>Trường Đại học Việt Nhật · ĐHQGHN</span></div></div>
      </footer>
    </main>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) { return <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#9b273a]">{children}</p>; }
function MobileLink({ href, onClick, children }: { href: string; onClick: () => void; children: React.ReactNode }) { return <Link href={href} onClick={onClick} className="border-b border-[#ece8e2] py-3 text-[13px] font-medium text-[#393632]">{children}</Link>; }
function IntroItem({ icon, title, text, href }: { icon: React.ReactNode; title: string; text: string; href: string }) { return <Link href={href} className="group flex items-center gap-4 px-2 py-5 md:px-7 md:py-7"><span className="grid size-11 shrink-0 place-items-center border border-[#e8e4df] text-[#8e1f32] transition-colors group-hover:border-[#8e1f32]">{icon}</span><span><span className="block font-serif text-[16px]">{title}</span><span className="mt-1 block text-[11px] text-[#817a72]">{text}</span></span><ArrowRight size={14} className="ml-auto shrink-0 text-[#8e1f32] opacity-0 transition-all group-hover:translate-x-1 group-hover:opacity-100" /></Link>; }
