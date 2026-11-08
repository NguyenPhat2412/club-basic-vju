"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { LogIn, Sparkles, UserPlus, X } from "lucide-react";
import { AuthModalMode } from "./AuthModal";

const AUTO_PROMPT_KEY = "vju_clubhub_auto_auth_prompted_v1";
const AUTO_DELAY_MS = 15_000;
const MIN_DWELL_BEFORE_SCROLL_MS = 4_000;
const SCROLL_TRIGGER_RATIO = 0.45;

type SmartAuthPromptProps = {
  authenticated: boolean;
  settled?: boolean;
  modalOpen: boolean;
  onOpenAuth: (mode: AuthModalMode) => void;
};

export function SmartAuthPrompt({
  authenticated,
  settled = true,
  modalOpen,
  onOpenAuth,
}: SmartAuthPromptProps) {
  const [promptedOnce, setPromptedOnce] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.sessionStorage.getItem(AUTO_PROMPT_KEY) === "1";
  });
  const [scrolledDown, setScrolledDown] = useState(false);
  const [collapsedToPill, setCollapsedToPill] = useState(false);

  const onOpenAuthRef = useRef(onOpenAuth);
  useEffect(() => {
    onOpenAuthRef.current = onOpenAuth;
  }, [onOpenAuth]);

  const triggeredRef = useRef(promptedOnce);
  useEffect(() => {
    triggeredRef.current = promptedOnce;
  }, [promptedOnce]);

  useEffect(() => {
    if (authenticated) {
      triggeredRef.current = true;
      try {
        window.sessionStorage.setItem(AUTO_PROMPT_KEY, "1");
      } catch {
        // Ignore storage restrictions
      }
      return;
    }
    if (!settled || modalOpen) return;

    const mountedAt = Date.now();

    const triggerAutoPopup = () => {
      if (triggeredRef.current) return;
      triggeredRef.current = true;
      try {
        window.sessionStorage.setItem(AUTO_PROMPT_KEY, "1");
      } catch {
        // Ignore storage restrictions
      }
      setPromptedOnce(true);
      onOpenAuthRef.current("register");
    };

    const timerId = !triggeredRef.current
      ? window.setTimeout(triggerAutoPopup, AUTO_DELAY_MS)
      : undefined;

    const handleScroll = (event: Event) => {
      const target = event.target;
      let scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      let maxScroll =
        document.documentElement.scrollHeight - document.documentElement.clientHeight;

      if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight + 40) {
        scrollTop = Math.max(scrollTop, target.scrollTop);
        maxScroll = Math.max(maxScroll, target.scrollHeight - target.clientHeight);
      }

      setScrolledDown(scrollTop > 220);

      if (
        !triggeredRef.current &&
        Date.now() - mountedAt >= MIN_DWELL_BEFORE_SCROLL_MS &&
        maxScroll > 180 &&
        scrollTop / maxScroll >= SCROLL_TRIGGER_RATIO
      ) {
        triggerAutoPopup();
      }
    };

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => {
      if (timerId !== undefined) window.clearTimeout(timerId);
      window.removeEventListener("scroll", handleScroll, { capture: true });
    };
  }, [authenticated, modalOpen, settled]);

  if (authenticated || !settled || modalOpen) return null;
  if (!promptedOnce && !scrolledDown) return null;

  if (collapsedToPill) {
    return (
      <div className="fixed bottom-4 right-4 z-40 sm:bottom-5 sm:right-5">
        <button
          type="button"
          onClick={() => {
            setCollapsedToPill(false);
            onOpenAuth("register");
          }}
          className="group flex items-center gap-2 rounded-full border border-white/25 bg-[#8e1f32] px-4 py-2.5 text-xs font-extrabold text-white shadow-xl shadow-rose-950/25 transition-all hover:-translate-y-0.5 hover:bg-[#741828]"
        >
          <Sparkles size={14} className="text-amber-300" />
          <span>Gia nhập CLB ngay</span>
        </button>
      </div>
    );
  }

  return (
    <aside
      aria-label="Lời mời đăng nhập và gia nhập câu lạc bộ"
      className="fixed bottom-3 left-3 right-3 z-40 mx-auto max-w-[400px] rounded-2xl border border-rose-200/90 bg-white/98 p-3.5 shadow-2xl shadow-slate-950/15 backdrop-blur-md fade-in sm:bottom-5 sm:left-auto sm:right-5 sm:mx-0 sm:p-4"
    >
      <div className="flex items-start justify-between gap-2.5">
        <div className="flex min-w-0 items-center gap-2.5">
          <Image
            src="/images/vju-logo.png"
            alt="Logo VJU"
            width={36}
            height={36}
            className="size-9 shrink-0 rounded-full bg-white p-0.5 object-contain ring-1 ring-slate-200"
          />
          <div className="min-w-0">
            <p className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wider text-[#8e1f32]">
              <Sparkles size={11} /> Cộng đồng Sinh viên VJU
            </p>
            <p className="truncate text-xs font-extrabold text-slate-900 sm:text-[13px]">
              Bạn đã chọn được CLB ưng ý?
            </p>
          </div>
        </div>
        <button
          type="button"
          aria-label="Thu gọn hộp mời đăng nhập"
          title="Thu gọn"
          onClick={() => setCollapsedToPill(true)}
          className="grid size-6 shrink-0 place-items-center rounded-full text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700"
        >
          <X size={14} />
        </button>
      </div>

      <p className="mt-2 text-[11.5px] leading-relaxed text-slate-600">
        Đăng nhập hoặc tạo tài khoản sinh viên chỉ trong 30 giây để nộp đơn gia nhập CLB và đăng ký Cộng tác viên (CTV) sự kiện.
      </p>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => onOpenAuth("login")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 text-xs font-bold text-slate-800 transition-colors hover:border-[#8e1f32]/40 hover:bg-white hover:text-[#8e1f32]"
        >
          <LogIn size={13} /> Đăng nhập
        </button>
        <button
          type="button"
          onClick={() => onOpenAuth("register")}
          className="inline-flex h-9 items-center justify-center gap-1.5 rounded-xl bg-[#8e1f32] px-3 text-xs font-bold text-white shadow-sm transition-colors hover:bg-[#741828]"
        >
          <UserPlus size={13} /> Gia nhập ngay
        </button>
      </div>
    </aside>
  );
}
