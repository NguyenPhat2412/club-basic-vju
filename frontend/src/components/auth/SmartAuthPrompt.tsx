"use client";

import { useEffect, useState } from "react";
import { UserPlus, X } from "lucide-react";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { AuthModalMode } from "./AuthModal";

const DISMISSED_KEY = "vju_clubhub_prompt_dismissed_v1";
const SCROLL_SHOW_PX = 680;

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
  const { locale } = useI18n();
  const copy = HOME_MESSAGES[locale].smartPrompt;

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return window.sessionStorage.getItem(DISMISSED_KEY) === "1";
    } catch {
      return false;
    }
  });
  const [scrolledDeep, setScrolledDeep] = useState(false);

  useEffect(() => {
    if (authenticated || !settled || modalOpen || dismissed) return;

    const handleScroll = (event: Event) => {
      const target = event.target;
      let scrollTop = window.scrollY || document.documentElement.scrollTop || 0;
      if (target instanceof HTMLElement && target.scrollHeight > target.clientHeight + 40) {
        scrollTop = Math.max(scrollTop, target.scrollTop);
      }
      setScrolledDeep(scrollTop > SCROLL_SHOW_PX);
    };

    window.addEventListener("scroll", handleScroll, { capture: true, passive: true });
    return () => window.removeEventListener("scroll", handleScroll, { capture: true });
  }, [authenticated, dismissed, modalOpen, settled]);

  if (authenticated || !settled || modalOpen || dismissed || !scrolledDeep) return null;

  const dismiss = () => {
    setDismissed(true);
    try {
      window.sessionStorage.setItem(DISMISSED_KEY, "1");
    } catch {
      // Ignore storage restrictions
    }
  };

  return (
    <aside
      data-no-i18n="true"
      aria-label={copy.ariaLabel}
      className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full border border-border bg-card/95 py-2 pl-4 pr-2 text-foreground shadow-lg backdrop-blur-xs fade-in sm:bottom-5 sm:right-5"
    >
      <button
        type="button"
        onClick={() => onOpenAuth("register")}
        className="inline-flex items-center gap-2 text-xs font-semibold text-foreground transition-colors hover:text-primary sm:text-[13px]"
      >
        <UserPlus size={14} className="text-primary" />
        <span>{copy.ctaText}</span>
      </button>
      <button
        type="button"
        onClick={() => onOpenAuth("login")}
        className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary-hover"
      >
        {copy.signIn}
      </button>
      <button
        type="button"
        aria-label={copy.dismissAria}
        onClick={dismiss}
        className="grid size-6 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
      >
        <X size={13} />
      </button>
    </aside>
  );
}
