"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { ArrowRight, CheckCircle2, Info, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";

const steps = [
  "Hệ thống hiện không mở chức năng đăng ký tự do cho người dùng công khai.",
  "Nếu bạn là sinh viên hoặc thành viên CLB, hãy liên hệ quản trị viên hoặc ban quản lý CLB để được cấp tài khoản.",
  "Sau khi được phê duyệt, bạn có thể đăng nhập để xem dashboard, CLB đã tham gia, thông báo và hồ sơ cá nhân.",
];

export default function RegisterPage() {
  const router = useRouter();

  return (
    <main className="min-h-svh bg-[radial-gradient(circle_at_top_left,rgba(204,51,102,0.08),transparent_24%),linear-gradient(180deg,#fff,#fffafc)] px-4 py-10 sm:px-6 lg:px-8 dark:bg-[radial-gradient(circle_at_top_left,rgba(217,75,124,0.10),transparent_24%),linear-gradient(180deg,#101114,#17181d)]">
      <div className="mx-auto max-w-4xl">
        <div className="mb-6 flex items-center gap-3">
          <span className="flex size-12 items-center justify-center rounded-2xl bg-primary text-sm font-black text-primary-foreground shadow-lg shadow-primary/20">VJU</span>
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.22em] text-primary">ClubHub</p>
            <h1 className="text-2xl font-black tracking-tight">Đăng ký tài khoản</h1>
          </div>
        </div>

        <section className="rounded-[2rem] border border-border bg-white p-6 shadow-sm dark:border-white/10 dark:bg-[#121418]">
          <div className="flex items-start gap-3 rounded-2xl border border-amber-500/20 bg-amber-500/10 p-4 text-sm text-amber-900 dark:text-amber-100">
            <ShieldAlert size={18} className="mt-0.5 shrink-0" />
            <div>
              <p className="font-bold">Tự đăng ký chưa được hỗ trợ</p>
              <p className="mt-1 text-sm opacity-90">Hiện hệ thống chỉ cấp tài khoản theo quy trình quản trị, nên trang này chỉ hướng dẫn cách tiếp cận đúng.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-3">
            {steps.map((step, index) => (
              <div key={step} className="flex items-start gap-3 rounded-2xl border border-border bg-background p-4">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">{index + 1}</span>
                <p className="text-sm leading-6 text-foreground">{step}</p>
              </div>
            ))}
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <ActionCard icon={<Info size={18} />} title="Cần mở tài khoản?" text="Liên hệ ban quản trị hoặc quản trị viên hệ thống để xin cấp quyền." />
            <ActionCard icon={<CheckCircle2 size={18} />} title="Đã có tài khoản?" text="Đăng nhập để vào dashboard và xem CLB, thông báo, hồ sơ cá nhân." />
            <ActionCard icon={<ArrowRight size={18} />} title="Xem CLB công khai" text="Về home để xem thông tin tổng quan và các CLB có sẵn cho khách." />
          </div>

          <div className="mt-6 flex flex-wrap justify-end gap-2">
            <Link href="/home" className="inline-flex h-10 items-center rounded-full border border-border bg-background px-4 text-sm font-semibold text-foreground transition-colors hover:border-primary/40 hover:bg-primary/5 hover:text-primary">Về home</Link>
            <Button variant="outline" onClick={() => router.push("/login")} className="rounded-full">Đăng nhập</Button>
          </div>
        </section>
      </div>
    </main>
  );
}

function ActionCard({ icon, title, text }: { icon: ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-[1.5rem] border border-border bg-background p-4">
      <div className="flex items-center gap-2 text-sm font-bold text-primary">{icon}{title}</div>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{text}</p>
    </div>
  );
}
