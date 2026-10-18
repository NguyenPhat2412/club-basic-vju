import Link from "next/link";
import { ArrowLeft, ArrowRight, CheckCircle2, Info, ShieldAlert } from "lucide-react";

const steps = [
  "Hiện hệ thống chưa mở đăng ký tự do cho người dùng công khai.",
  "Sinh viên và thành viên câu lạc bộ vui lòng liên hệ quản trị viên hoặc ban quản lý CLB để được cấp tài khoản.",
  "Sau khi được cấp tài khoản, bạn có thể đăng nhập để theo dõi đơn, câu lạc bộ, thông báo và hồ sơ cá nhân.",
];

export default function RegisterPage() {
  return (
    <main className="min-h-svh bg-[#faf9f6] px-5 py-7 sm:px-8">
      <div className="mx-auto flex max-w-[1120px] items-center justify-between"><Link href="/home" className="flex items-center gap-3"><span className="grid size-11 place-items-center rounded-full border border-[#b58b54] text-[11px] font-black tracking-widest text-[#8e1f32]">VJU</span><span className="border-l border-[#d8d1c8] pl-3 text-sm font-semibold">CLUB<span className="font-normal text-[#8e1f32]">HUB</span></span></Link><Link href="/home" className="inline-flex items-center gap-2 text-[11px] text-[#716b64] hover:text-[#8e1f32]"><ArrowLeft size={14} /> Trang chủ</Link></div>
      <section className="mx-auto mt-12 max-w-[960px] border border-[#e8e4df] bg-white sm:mt-16">
        <div className="grid lg:grid-cols-[.8fr_1.2fr]">
          <div className="bg-[#8e1f32] p-7 text-white sm:p-10 lg:p-12"><p className="text-[9px] font-semibold uppercase tracking-[.22em] text-white/65">THÀNH VIÊN VJU</p><h1 className="mt-4 font-serif text-[36px] leading-tight sm:text-[44px]">Bắt đầu hành trình cùng cộng đồng.</h1><p className="mt-5 text-[13px] leading-7 text-white/75">Cổng ClubHub hiện sử dụng quy trình cấp tài khoản do nhà trường và câu lạc bộ quản lý.</p><Link href="/login" className="mt-8 inline-flex items-center gap-3 border border-white/45 px-5 py-3 text-[10px] font-semibold hover:bg-white/10">ĐÃ CÓ TÀI KHOẢN? ĐĂNG NHẬP <ArrowRight size={14} /></Link></div>
          <div className="p-6 sm:p-10 lg:p-12"><p className="text-[9px] font-bold uppercase tracking-[.2em] text-[#8e1f32]">HƯỚNG DẪN TÀI KHOẢN</p><h2 className="mt-2 font-serif text-[28px]">Đăng ký tài khoản</h2><div className="mt-6 flex gap-3 border border-[#e7d8b8] bg-[#fbf6ec] p-4"><ShieldAlert size={17} className="mt-0.5 shrink-0 text-[#9a703b]" /><div><p className="text-[12px] font-semibold">Chưa hỗ trợ tự đăng ký</p><p className="mt-1 text-[11px] leading-5 text-[#716b64]">Tài khoản được cấp theo quy trình quản trị để bảo đảm quyền truy cập phù hợp.</p></div></div>
            <div className="mt-6 grid gap-3">{steps.map((step, index) => <div key={step} className="flex items-start gap-3 border-b border-[#eee9e2] pb-4"><span className="grid size-7 shrink-0 place-items-center rounded-full bg-[#8e1f32]/8 text-[11px] font-semibold text-[#8e1f32]">{index + 1}</span><p className="pt-1 text-[12px] leading-6 text-[#514c46]">{step}</p></div>)}</div>
            <div className="mt-6 grid gap-3 sm:grid-cols-2"><InfoCard icon={<Info size={16} />} title="Cần mở tài khoản?" text="Liên hệ quản trị viên hệ thống hoặc ban quản lý CLB." /><InfoCard icon={<CheckCircle2 size={16} />} title="Đã có tài khoản?" text="Đăng nhập để xem dashboard và hoạt động của bạn." /></div>
          </div>
        </div>
      </section>
      <p className="mx-auto mt-7 max-w-[960px] text-[9px] tracking-wide text-[#99928a]">© 2026 VJU ClubHub · Trường Đại học Việt Nhật</p>
    </main>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) { return <div className="border border-[#e8e4df] p-4"><span className="text-[#8e1f32]">{icon}</span><p className="mt-3 text-[11px] font-semibold">{title}</p><p className="mt-1 text-[10px] leading-5 text-[#77716a]">{text}</p></div>; }
