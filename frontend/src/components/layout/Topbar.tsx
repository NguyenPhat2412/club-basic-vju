"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Bell, KeyRound, LogOut, Menu, Users } from "lucide-react";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

export function Topbar({
  groupLabel,
  pageTitle,
  onMenu,
  authenticated,
  name,
  subtitle,
  onPassword,
  onProfile,
  onSignOut,
  onLogin,
  onRegister,
  notificationsActive,
}: {
  groupLabel?: string;
  pageTitle: string;
  onMenu: () => void;
  authenticated: boolean;
  name?: string;
  subtitle?: string;
  onPassword: () => void;
  onProfile: () => void;
  onSignOut: () => void;
  onLogin: () => void;
  onRegister: () => void;
  notificationsActive: boolean;
}) {
  const { localeMeta, tr } = useI18n();
  const [now, setNow] = useState<Date | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(timer);
      clearInterval(interval);
    };
  }, []);

  return (
    <header className="relative z-40 flex h-13 shrink-0 select-none items-center justify-between gap-3 border-b border-border bg-white px-4 sm:px-6">
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={tr("Mở menu")}
          onClick={onMenu}
          className="flex size-8 items-center justify-center rounded-lg border border-border bg-white text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={16} />
        </button>
        {groupLabel && (
          <>
            <span className="hidden truncate text-xs font-medium text-slate-500 sm:inline">
              {groupLabel}
            </span>
            <span className="hidden text-xs text-slate-300 sm:inline">/</span>
          </>
        )}
        <h2 className="truncate text-[13.5px] font-bold text-slate-900">{pageTitle}</h2>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <LanguageSwitcher variant="dropdown" size="sm" />

        {now && (
          <span
            data-no-i18n="true"
            className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs xl:inline-flex"
          >
            <b className="font-mono font-bold text-primary">
              {now.toLocaleTimeString(localeMeta.intlLocale)}
            </b>
            <span className="text-slate-500">
              {now.toLocaleDateString(localeMeta.intlLocale, {
                weekday: "short",
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
              })}
            </span>
          </span>
        )}

        {authenticated ? (
          <>
            <Link
              href="/notifications"
              aria-label="Thông báo"
              title="Thông báo"
              className={cn(
                "grid size-8 place-items-center rounded-lg border border-slate-200 bg-white text-slate-600 transition-colors hover:bg-slate-50 hover:text-primary",
                notificationsActive && "border-primary/30 bg-primary/8 text-primary"
              )}
            >
              <Bell size={15} />
            </Link>

            <div className="relative">
              <button
                type="button"
                onClick={() => setMenuOpen((v) => !v)}
                className="flex items-center gap-2 rounded-lg border border-transparent px-2 py-1 transition-colors hover:border-slate-200 hover:bg-slate-50"
                aria-haspopup="menu"
                aria-expanded={menuOpen}
              >
                <div className="hidden text-right sm:block">
                  <p className="max-w-36 truncate text-xs font-bold text-slate-900">{name ?? "Tài khoản"}</p>
                  <p className="max-w-36 truncate text-[10px] text-slate-500">{subtitle}</p>
                </div>
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground shadow-2xs">
                  {(name ?? "V").slice(0, 1).toUpperCase()}
                </span>
              </button>

              {menuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setMenuOpen(false)}
                    aria-hidden="true"
                  />
                  <div
                    role="menu"
                    className="panel-modal absolute right-0 top-11 z-50 w-52 p-1.5 fade-in"
                    onMouseLeave={() => setMenuOpen(false)}
                  >
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onProfile();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Users size={14} className="text-primary" /> Hồ sơ cá nhân
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenuOpen(false);
                        onPassword();
                      }}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <KeyRound size={14} className="text-primary" /> Đổi mật khẩu
                    </button>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={onSignOut}
                      className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-xs font-medium text-destructive hover:bg-destructive/10"
                    >
                      <LogOut size={14} /> Đăng xuất
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Gia nhập ngay
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
