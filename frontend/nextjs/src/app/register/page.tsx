import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Info } from "lucide-react";
import { Suspense } from "react";
import { RegisterWithGoogle } from "./RegisterWithGoogle";

const steps = [
  "Bấm \"Đăng ký bằng Google\" ở trên và chọn email trường @st.vju.ac.vn của bạn; không cần tạo mật khẩu.",
  "Tài khoản được tạo ngay. Muốn vào câu lạc bộ, hãy nộp đơn ở mục Khám phá CLB và chờ CLB duyệt.",
  "Cán bộ, giảng viên và quản trị viên (email khác) được quản trị viên cấp tài khoản và đăng nhập bằng mật khẩu.",
];

export default function RegisterPage() {
  return (
    <main className="min-h-svh bg-slate-50 px-5 py-7 text-slate-900 sm:px-8">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between">
        <Link href="/home" className="flex items-center gap-3">
          <Image src="/images/vju-logo.png" alt="Logo Trường Đại học Việt Nhật (VJU)" width={44} height={44} className="size-11 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200" />
          <span className="border-l border-slate-200 pl-3 text-sm font-extrabold tracking-tight">CLUB<span className="text-primary">HUB</span></span>
        </Link>
        <Link href="/home" className="inline-flex items-center gap-2 text-xs font-semibold text-slate-500 hover:text-primary"><ArrowLeft size={14} /> Trang chủ</Link>
      </div>
      <section className="mx-auto mt-10 max-w-[960px] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs sm:mt-14">
        <div className="grid lg:grid-cols-[.85fr_1.15fr]">
          <div className="flex flex-col justify-between border-b border-slate-200 bg-primary/6 p-7 sm:p-10 lg:border-b-0 lg:border-r lg:p-12">
            <div>
              <p className="inline-flex rounded-full border border-primary/20 bg-white px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">THÀNH VIÊN VJU</p>
              <h1 className="mt-5 text-3xl font-extrabold leading-tight text-slate-900 sm:text-4xl">Bắt đầu hành trình cùng cộng đồng.</h1>
              <p className="mt-4 text-xs leading-6 text-slate-600">Sinh viên đăng nhập ngay bằng tài khoản Google của trường (`@st.vju.ac.vn`), không cần tạo mật khẩu riêng.</p>
            </div>
            <Link href="/login" className="mt-8 inline-flex h-10 items-center justify-center gap-2 rounded-lg bg-primary px-5 text-xs font-bold text-white transition-opacity hover:opacity-90">
              ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP <ArrowRight size={14} />
            </Link>
          </div>
          <div className="p-6 sm:p-10 lg:p-12">
            <p className="text-[10px] font-bold uppercase tracking-wider text-primary">ĐĂNG KÝ TÀI KHOẢN</p>
            <h2 className="mt-1.5 text-2xl font-bold text-slate-900">Đăng ký tài khoản sinh viên</h2>
            <Suspense fallback={<div className="mt-6 h-[88px] animate-pulse rounded-xl bg-slate-100" />}><RegisterWithGoogle /></Suspense>
            <div className="mt-6 grid gap-3">
              {steps.map((step, index) => (
                <div key={step} className="flex items-start gap-3 border-b border-slate-100 pb-3.5">
                  <span className="grid size-6 shrink-0 place-items-center rounded-full bg-primary/10 text-xs font-bold text-primary">{index + 1}</span>
                  <p className="pt-0.5 text-xs leading-6 text-slate-600">{step}</p>
                </div>
              ))}
            </div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2">
              <InfoCard icon={<Info size={16} />} title="Không phải sinh viên?" text="Liên hệ quản trị viên hệ thống để được cấp tài khoản." />
              <InfoCard icon={<CheckCircle2 size={16} />} title="Đã đăng ký rồi?" text="Vào trang Đăng nhập và bấm Đăng nhập bằng Google." />
            </div>
          </div>
        </div>
      </section>
      <p className="mx-auto mt-6 max-w-[960px] text-[11px] text-slate-400">© 2026 VJU ClubHub · Trường Đại học Việt Nhật</p>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4">
      <span className="text-primary">{icon}</span>
      <p className="mt-2.5 text-xs font-bold text-slate-900">{title}</p>
      <p className="mt-1 text-[11px] leading-5 text-slate-500">{text}</p>
    </div>
  );
}
