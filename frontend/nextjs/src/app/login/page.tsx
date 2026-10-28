"use client";

import { FormEvent, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input } from "@/components/ui/input";
import { GoogleSignInButton, OrDivider, useGoogleSignIn } from "@/components/shared/GoogleSignInButton";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const google = useGoogleSignIn();
  const googleOn = !!google.data?.enabled;
  const afterSignIn = () => { queryClient.clear(); router.push("/dashboard"); };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try { await apiModel.login(email, password); afterSignIn(); }
    catch (err) { setError(describeError(err)); }
    finally { setLoading(false); }
  };

  return (
    <main className="grid min-h-svh bg-slate-50 text-slate-900 lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-svh flex-col justify-between border-r border-slate-200 bg-white p-12 lg:flex xl:p-16">
        <Link href="/home" className="flex items-center gap-3 text-slate-900">
          <Image src="/images/vju-logo.png" alt="Logo Trường Đại học Việt Nhật (VJU)" width={44} height={44} className="size-11 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200" />
          <span className="border-l border-slate-200 pl-3 text-sm font-extrabold tracking-tight">CLUB<span className="text-primary">HUB</span></span>
        </Link>

        <div className="my-auto max-w-lg space-y-6">
          <span className="inline-flex items-center rounded-full border border-primary/20 bg-primary/8 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
            Cộng đồng sinh viên VJU · ĐHQGHN
          </span>
          <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 xl:text-5xl">
            Nơi những ý tưởng <span className="text-primary">gặp nhau.</span>
          </h1>
          <p className="text-sm leading-7 text-slate-600">
            Đăng nhập để kết nối với câu lạc bộ, theo dõi lịch hoạt động, xét duyệt hồ sơ và đồng hành cùng cộng đồng sinh viên Trường Đại học Việt Nhật.
          </p>
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-100 shadow-xs">
            <div className="aspect-[16/9] w-full bg-cover bg-center" style={{ backgroundImage: "url('/images/vju-hero-cover.jpg')" }} />
          </div>
        </div>

        <p className="text-[11px] font-medium text-slate-400">TRƯỜNG ĐẠI HỌC VIỆT NHẬT · ĐHQGHN</p>
      </section>

      <section className="flex min-h-svh flex-col justify-between px-5 py-7 sm:px-10 lg:px-14 xl:px-20">
        <Link href="/home" className="inline-flex items-center gap-2 self-start text-xs font-semibold text-slate-500 hover:text-primary"><ArrowLeft size={14} /> Về trang chủ</Link>
        <div className="mx-auto w-full max-w-[430px] rounded-2xl border border-slate-200 bg-white p-6 shadow-xs sm:p-8">
          <div className="mb-6 lg:hidden"><Image src="/images/vju-logo.png" alt="Logo Trường Đại học Việt Nhật (VJU)" width={44} height={44} className="size-11 rounded-full bg-white object-contain ring-1 ring-slate-200" /></div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary">KHU VỰC THÀNH VIÊN</p>
          <h2 className="mt-1.5 text-2xl font-bold leading-tight text-slate-900 sm:text-3xl">Chào mừng trở lại</h2>
          <p className="mt-2 text-xs leading-5 text-slate-500">Đăng nhập bằng tài khoản VJU để mở không gian câu lạc bộ của bạn.</p>
          {googleOn && (
            <div className="mt-6 grid gap-4">
              <p className="text-xs font-semibold text-slate-700">Sinh viên: đăng nhập bằng email trường @{google.data?.allowedDomains[0]}</p>
              <GoogleSignInButton onSignedIn={afterSignIn} width={360} />
              <OrDivider />
            </div>
          )}
          <form onSubmit={submit} className={googleOn ? "mt-4 grid gap-4" : "mt-6 grid gap-4"}>
            <FormField label="Địa chỉ email"><Input required type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} placeholder={googleOn ? "canbo@vju.ac.vn" : "sinhvien@vju.ac.vn"} className="h-10 rounded-lg border-slate-200 bg-white px-3.5 text-xs" /></FormField>
            <FormField label="Mật khẩu"><Input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-10 rounded-lg border-slate-200 bg-white px-3.5 text-xs" /></FormField>
            {error && <p role="alert" className="rounded-lg border border-rose-200 bg-rose-50 px-3.5 py-2.5 text-xs text-rose-700">{error}</p>}
            <p className="text-[11px] leading-5 text-slate-500">Quyền truy cập được cấp bởi quản trị viên hoặc ban quản lý câu lạc bộ.</p>
            <button type="submit" disabled={loading} className="flex h-10 items-center justify-center gap-2 rounded-lg bg-primary text-xs font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-60"><LockKeyhole size={14} />{loading ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP"}<ArrowRight size={14} /></button>
          </form>
          <p className="mt-6 border-t border-slate-100 pt-4 text-xs text-slate-500">Chưa có tài khoản? <Link href="/register" className="font-bold text-primary hover:underline">Đăng ký ngay</Link></p>
        </div>
        <p className="text-[11px] text-slate-400">© 2026 VJU ClubHub</p>
      </section>
    </main>
  );
}
