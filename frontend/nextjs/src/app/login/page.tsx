"use client";

import { FormEvent, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useFetchClient } from "@/lib/fetch-hooks";
import { ArrowLeft, ArrowRight, LockKeyhole } from "lucide-react";
import { apiModel } from "@/lib/api";
import { describeError } from "@/components/shared/ListPage";
import { FormField, Input } from "@/components/ui/input";
import { rememberAccount } from "@/lib/account-switcher";

export default function LoginPage() {
  const router = useRouter();
  const queryClient = useFetchClient();
  const emailInput = useRef<HTMLInputElement>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const savedEmail = new URLSearchParams(window.location.search).get("email");
    if (savedEmail && emailInput.current) emailInput.current.value = savedEmail;
  }, []);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try {
      const email = emailInput.current?.value ?? "";
      const result = await apiModel.login(email, password);
      rememberAccount({ email: result.user.email, name: result.user.fullName || result.user.email });
      queryClient.clear(); router.push("/dashboard");
    }
    catch (err) { setError(describeError(err)); }
    finally { setLoading(false); }
  };

  return (
    <main className="grid min-h-svh bg-[#faf9f6] lg:grid-cols-[1.05fr_.95fr]">
      <section className="relative hidden min-h-svh overflow-hidden bg-[#292725] lg:block">
        <div className="absolute inset-0 bg-cover bg-center opacity-65" style={{ backgroundImage: "url('https://vju.ac.vn/wp-content/uploads/2026/08/anh-cover-website-1-scaled.png')" }} />
        <div className="absolute inset-0 bg-gradient-to-br from-[#29151a]/80 via-[#292725]/45 to-[#292725]/80" />
        <div className="relative flex h-full flex-col justify-between p-12 xl:p-16">
          <Link href="/home" className="flex items-center gap-3 text-white"><span className="grid size-11 place-items-center rounded-full border border-[#d7b989] text-[11px] font-black tracking-widest">VJU</span><span className="border-l border-white/30 pl-3 text-sm font-semibold tracking-wide">CLUB<span className="font-normal text-[#e5c99d]">HUB</span></span></Link>
          <div className="max-w-lg pb-8 text-white"><p className="text-[9px] font-semibold uppercase tracking-[.23em] text-[#e5c99d]">CỘNG ĐỒNG SINH VIÊN VJU</p><h1 className="mt-5 font-serif text-[48px] leading-[1.12] xl:text-[60px]">Nơi những ý tưởng gặp nhau.</h1><p className="mt-5 max-w-md text-sm leading-7 text-white/75">Đăng nhập để kết nối với câu lạc bộ, theo dõi hoạt động và tiếp tục hành trình của bạn.</p></div>
          <p className="text-[9px] tracking-wide text-white/55">TRƯỜNG ĐẠI HỌC VIỆT NHẬT · ĐHQGHN</p>
        </div>
      </section>

      <section className="flex min-h-svh flex-col justify-between px-5 py-7 sm:px-10 lg:px-14 xl:px-20">
        <Link href="/home" className="inline-flex items-center gap-2 self-start text-[11px] font-medium text-[#716b64] hover:text-[#8e1f32]"><ArrowLeft size={14} /> Về trang chủ</Link>
        <div className="mx-auto w-full max-w-[430px] py-10">
          <div className="mb-8 lg:hidden"><span className="grid size-11 place-items-center rounded-full border border-[#b58b54] text-[11px] font-black tracking-widest text-[#8e1f32]">VJU</span></div>
          <p className="text-[9px] font-bold uppercase tracking-[.22em] text-[#8e1f32]">KHU VỰC THÀNH VIÊN</p><h2 className="mt-3 font-serif text-[37px] leading-tight sm:text-[43px]">Chào mừng trở lại.</h2><p className="mt-3 text-[13px] leading-6 text-[#77716a]">Đăng nhập bằng tài khoản VJU để mở không gian câu lạc bộ của bạn.</p>
          <form onSubmit={submit} className="mt-8 grid gap-5">
            <FormField label="Địa chỉ email"><Input ref={emailInput} required type="email" autoComplete="username" placeholder="sinhvien@vju.ac.vn" className="h-12 rounded-none border-[#d8d1c8] bg-white px-4 text-[13px]" /></FormField>
            <FormField label="Mật khẩu"><Input required type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} className="h-12 rounded-none border-[#d8d1c8] bg-white px-4 text-[13px]" /></FormField>
            {error && <p role="alert" className="border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-800">{error}</p>}
            <p className="text-[11px] leading-5 text-[#817a72]">Quyền truy cập được cấp bởi quản trị viên hoặc ban quản lý câu lạc bộ.</p>
            <button type="submit" disabled={loading} className="flex h-12 items-center justify-center gap-3 bg-[#8e1f32] text-[11px] font-semibold text-white transition-colors hover:bg-[#711829] disabled:opacity-60"><LockKeyhole size={15} />{loading ? "ĐANG ĐĂNG NHẬP…" : "ĐĂNG NHẬP"}<ArrowRight size={14} /></button>
          </form>
          <p className="mt-6 border-t border-[#e8e4df] pt-5 text-[11px] text-[#77716a]">Chưa có tài khoản? <Link href="/register" className="font-semibold text-[#8e1f32] hover:underline">Xem hướng dẫn cấp tài khoản</Link></p>
        </div>
        <p className="text-[9px] tracking-wide text-[#99928a]">© 2026 VJU ClubHub</p>
      </section>
    </main>
  );
}
