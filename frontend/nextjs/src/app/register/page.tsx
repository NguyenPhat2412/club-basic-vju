"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { useThemePreference } from "@/hooks/useThemePreference";
import { Button } from "@/components/ui/button";

const steps = [
  "Hệ thống hiện không cho tự tạo tài khoản công khai.",
  "Nếu bạn là sinh viên thành viên CLB, vui lòng liên hệ ban quản trị hoặc quản trị viên hệ thống.",
  "Sau khi được cấp tài khoản, bạn có thể đăng nhập, xem dashboard, theo dõi CLB và quản lý hồ sơ cá nhân.",
];

export default function RegisterPage() {
  const router = useRouter();
  useThemePreference();

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(11,46,111,0.10),transparent_28%),radial-gradient(circle_at_top_right,rgba(200,16,46,0.08),transparent_30%),linear-gradient(180deg,rgba(255,255,255,0.96),rgba(250,250,250,1))] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(126,166,255,0.12),transparent_28%),radial-gradient(circle_at_top_right,rgba(255,100,103,0.08),transparent_30%),linear-gradient(180deg,rgba(11,16,28,1),rgba(18,24,38,1))]">
      <div className="mx-auto max-w-3xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-11 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/25">VJU</span>
          <div>
            <p className="text-sm font-black uppercase tracking-[0.18em] text-primary">ClubHub</p>
            <h1 className="text-2xl font-black tracking-tight">Đăng ký tài khoản</h1>
          </div>
        </div>

        <section className="panel-modal grid gap-6 p-6">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Tự đăng ký chưa được hỗ trợ</p>
              <p className="mt-1 text-sm opacity-90">Backend hiện chỉ cho quản trị viên tạo tài khoản hoặc cấp quyền truy cập, nên trang này đóng vai trò hướng dẫn thay vì gửi biểu mẫu giả.</p>
            </div>
          </div>

          <div className="grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-border/70 bg-background/80 p-4">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>
                <p className="text-sm leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>

          <div className="grid gap-4 rounded-3xl border border-border/70 bg-background/80 p-5 sm:grid-cols-3">
            <ActionCard icon={<Info size={18} />} title="Cần mở tài khoản?" text="Liên hệ admin hoặc ban quản trị CLB đã cấp quyền cho bạn." />
            <ActionCard icon={<CheckCircle2 size={18} />} title="Có tài khoản rồi?" text="Đăng nhập để xem dashboard, CLB đã tham gia và hồ sơ cá nhân." />
            <ActionCard icon={<ArrowRight size={18} />} title="Xem CLB công khai" text="Vào home để xem tổng quan và phần giới thiệu công khai của các CLB." />
          </div>

          <div className="flex flex-wrap justify-end gap-2">
            <Link href="/home" className="inline-flex h-10 items-center rounded-full border border-border/70 bg-background px-4 text-sm font-semibold transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">Về home</Link>
            <Button variant="outline" onClick={() => router.push("/login")} className="rounded-full">Đăng nhập</Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-border/70 bg-card p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-primary">{icon}{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
