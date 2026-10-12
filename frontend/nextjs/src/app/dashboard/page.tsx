"use client";

import Link from "next/link";
import { ArrowRight, Bell, BriefcaseBusiness, ShieldCheck, Users } from "lucide-react";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useThemePreference } from "@/hooks/useThemePreference";
import { Button } from "@/components/ui/button";

const stats = [
  { label: "CLB đang tham gia", value: "04", icon: Users },
  { label: "Thông báo mới", value: "03", icon: Bell },
  { label: "Tài liệu đang theo dõi", value: "12", icon: BriefcaseBusiness },
  { label: "Vai trò quản lý", value: "02", icon: ShieldCheck },
];

const recentItems = [
  { title: "Lịch họp mới của CLB Học thuật & Công nghệ", meta: "Hôm nay • 18:30" },
  { title: "Thông báo bật đăng ký sự kiện tình nguyện", meta: "Hôm qua • 09:15" },
  { title: "Tải tài liệu định hướng hoạt động CLB", meta: "2 ngày trước • 14:00" },
];

export default function DashboardPage() {
  const session = useOptionalSession();
  useThemePreference();

  const userName = session.user?.fullName || session.user?.email || "Sinh viên";

  if (!session.user) {
    return (
      <main className="grid min-h-svh place-items-center bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.08),transparent_24%),linear-gradient(180deg,#fff,#fffafc)] px-4 py-10 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,75,124,0.10),transparent_24%),linear-gradient(180deg,#101114,#17181d)]">
        <div className="w-full max-w-xl rounded-[2rem] border border-border bg-white p-8 text-center shadow-sm dark:border-white/10 dark:bg-[#121418]">
          <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Dashboard</p>
          <h1 className="mt-3 text-3xl font-black tracking-tight">Bạn cần đăng nhập để xem dashboard</h1>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">Dashboard là khu vực cá nhân hoá, gồm CLB đang tham gia, thông báo và quyền quản lý theo tài khoản.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button onClick={() => (window.location.href = "/login")}>Đăng nhập</Button>
            <Link href="/home" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground">Về Home</Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.08),transparent_24%),linear-gradient(180deg,#fff,#fffafc)] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,75,124,0.10),transparent_24%),linear-gradient(180deg,#101114,#17181d)]">
      <div className="mx-auto max-w-6xl">
        <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">Dashboard</p>
            <h1 className="mt-2 text-3xl font-black tracking-tight">Xin chào, {userName}</h1>
          </div>
          <div className="flex gap-2">
            <Link href="/home" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground">Home</Link>
            <Link href="/clubs" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground">CLB</Link>
            <Link href="/profile" className="inline-flex h-10 items-center rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground">Hồ sơ</Link>
          </div>
        </div>

        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {stats.map(({ label, value, icon: Icon }) => (
            <div key={label} className="rounded-[1.75rem] border border-border bg-white p-5 shadow-sm dark:border-white/10 dark:bg-[#121418]">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-muted-foreground">{label}</p>
                <span className="flex size-10 items-center justify-center rounded-2xl bg-primary/10 text-primary"><Icon size={18} /></span>
              </div>
              <p className="mt-4 text-3xl font-black tracking-tight text-primary">{value}</p>
            </div>
          ))}
        </section>

        <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121418]">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Tổng quan</p>
                <h2 className="mt-2 text-2xl font-black tracking-tight">Hoạt động gần đây</h2>
              </div>
              <Link href="/clubs" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">Xem CLB <ArrowRight size={15} /></Link>
            </div>

            <div className="mt-5 grid gap-3">
              {recentItems.map((item) => (
                <div key={item.title} className="rounded-2xl border border-border bg-background p-4 dark:border-white/10 dark:bg-white/5">
                  <p className="text-base font-bold text-foreground">{item.title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{item.meta}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121418]">
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-muted-foreground">Truy cập nhanh</p>
            <div className="mt-4 grid gap-3">
              <Link href="/profile" className="rounded-2xl border border-border bg-background p-4 text-left text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-primary/5">Hồ sơ cá nhân</Link>
              <Link href="/clubs" className="rounded-2xl border border-border bg-background p-4 text-left text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-primary/5">Danh sách CLB</Link>
              <Link href="/home" className="rounded-2xl border border-border bg-background p-4 text-left text-sm font-semibold text-foreground hover:border-primary/30 hover:bg-primary/5">Trang chủ</Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
