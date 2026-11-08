"use client";

import Image from "next/image";
import { CheckCircle2, Sparkles, X } from "lucide-react";
import { AuthModalMode } from "@/forms/auth/auth-form";

interface AuthModalBannerProps {
  mode: AuthModalMode;
  onClose: () => void;
}

export function AuthModalBanner({ mode, onClose }: AuthModalBannerProps) {
  const leftBannerImage =
    mode === "login"
      ? "/images/clubs/vjua/cover.jpg"
      : "/images/clubs/bigheart/cover.jpg";

  return (
    <>
      {/* Banner đầu trang dành riêng cho Mobile (< 768px) */}
      <div
        className="relative flex items-center justify-between gap-3 bg-slate-900 px-4 py-3.5 text-white md:hidden"
        style={{
          backgroundImage: `linear-gradient(115deg, rgba(15,17,20,0.92) 0%, rgba(142,31,50,0.88) 100%), url('${leftBannerImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/vju-logo.png"
            alt="Logo Trường Đại học Việt Nhật (VJU)"
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full bg-white p-0.5 object-contain shadow-xs"
          />
          <div className="min-w-0">
            <p className="truncate text-[10px] font-bold uppercase tracking-wider text-[#f3d4a6]">
              CỘNG ĐỒNG CLB SINH VIÊN VJU
            </p>
            <p className="truncate text-sm font-extrabold text-white">
              {mode === "login" ? "Chào mừng bạn trở lại!" : "Hãy gia nhập cùng chúng mình!"}
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Đóng cửa sổ"
          className="grid size-8 shrink-0 place-items-center rounded-lg border border-white/25 bg-black/30 text-white"
        >
          <X size={16} />
        </button>
      </div>

      {/* Cột trái trên iPad & Laptop (md+): Ảnh hoạt động Câu lạc bộ VJU & Thông điệp chào mừng */}
      <div
        className="relative hidden flex-col justify-between overflow-hidden bg-slate-900 p-6 text-white md:flex lg:p-8"
        style={{
          backgroundImage: `linear-gradient(165deg, rgba(15,17,20,0.88) 0%, rgba(15,17,20,0.72) 48%, rgba(142,31,50,0.90) 100%), url('${leftBannerImage}')`,
          backgroundSize: "cover",
          backgroundPosition: "center",
        }}
      >
        <div className="flex items-center gap-2.5 lg:gap-3">
          <Image
            src="/images/vju-logo.png"
            alt="Logo Trường Đại học Việt Nhật (VJU)"
            width={42}
            height={42}
            className="size-10 shrink-0 rounded-full bg-white p-0.5 object-contain shadow-sm lg:size-11"
          />
          <div className="border-l border-white/25 pl-2.5 lg:pl-3">
            <p className="text-[10px] font-bold uppercase tracking-[.14em] text-white/80">
              Vietnam Japan University
            </p>
            <p className="text-sm font-extrabold tracking-tight text-white lg:text-base">
              CLUB<span className="text-[#f3d4a6]">HUB</span>
            </p>
          </div>
        </div>

        <div className="my-auto py-4 lg:py-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[#f3d4a6]/40 bg-black/30 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#f3d4a6] backdrop-blur-2xs lg:px-3 lg:text-[11px]">
            <Sparkles size={12} /> Cộng đồng CLB VJU
          </span>
          <h3 className="mt-3 font-serif text-2xl font-semibold leading-tight text-white lg:mt-4 lg:text-3xl">
            {mode === "login"
              ? "Chào mừng bạn quay trở lại!"
              : "Hãy gia nhập cùng chúng mình!"}
          </h3>
          <p className="mt-2.5 text-xs leading-5 text-white/90 lg:mt-3 lg:text-sm lg:leading-6">
            {mode === "login"
              ? "Kết nối ngay với câu lạc bộ, lịch hoạt động, công việc và các ban chuyên môn của bạn tại Trường Đại học Việt Nhật."
              : "Chỉ mất 30 giây để khởi tạo tài khoản, nộp đơn ứng tuyển vào 12+ câu lạc bộ và đăng ký tham gia các sự kiện sinh viên sôi động."}
          </p>

          <ul className="mt-4 space-y-2 text-[11px] font-medium text-white/95 lg:mt-6 lg:space-y-2.5 lg:text-xs">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#f3d4a6]" />
              <span>Khám phá 12+ CLB văn hóa, học thuật, nghệ thuật & thể thao</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#f3d4a6]" />
              <span>Ứng tuyển thành viên & Cộng tác viên sự kiện trực tuyến</span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-[#f3d4a6]" />
              <span>Nhận thông báo duyệt đơn, lịch họp và nhiệm vụ tức thời</span>
            </li>
          </ul>
        </div>

        <div className="border-t border-white/15 pt-3 text-[10px] font-medium text-white/75 lg:pt-4 lg:text-[11px]">
          Trường Đại học Việt Nhật · ĐHQGHN — Learn · Connect · Create
        </div>
      </div>
    </>
  );
}
