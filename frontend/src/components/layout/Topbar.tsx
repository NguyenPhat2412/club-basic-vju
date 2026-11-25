"use client";

import { useState } from "react";
import { ChevronDown, KeyRound, LogOut, Menu, Users } from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { UnitSwitcher } from "@/components/layout/UnitSwitcher";
import { NotificationBellDrawer } from "@/components/notification/NotificationBellDrawer";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { shortDisplayName } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

function userInitials(name?: string): string {
  const clean = (name ?? "").trim();
  if (!clean) return "U";
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}

export function Topbar({
  groupLabel,
  pageTitle,
  pathname,
  canManageWorkspace,
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
  onOpenHref,
}: {
  groupLabel?: string;
  pageTitle: string;
  pathname: string;
  sections?: NavSection[];
  canManageWorkspace: boolean;
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
  onOpenHref?: (href: string) => void;
}) {
  void pathname;
  void canManageWorkspace;
  void onOpenHref;
  const { tr } = useI18n();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="relative z-40 flex h-11 w-full min-w-0 max-w-full shrink-0 select-none items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 sm:px-4">
      {/* Left: Mobile menu + Page Title */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label={tr("Mở menu")}
          onClick={onMenu}
          className="flex size-7.5 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-700 hover:bg-slate-100 lg:hidden"
        >
          <Menu size={15} />
        </button>
        {groupLabel && (
          <>
            <span className="hidden truncate text-xs font-medium text-slate-400 xl:inline">
              {groupLabel}
            </span>
            <span className="hidden text-xs text-slate-300 xl:inline">/</span>
          </>
        )}
        <h2 className="truncate text-[13px] font-bold tracking-tight text-slate-900">
          {pageTitle}
        </h2>
      </div>

      {/* Right: Unit Switcher + Notifications + Lang + User Pill */}
      <div className="flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        {authenticated && <UnitSwitcher compact />}

        {authenticated && <NotificationBellDrawer active={notificationsActive} size="sm" />}

        <LanguageSwitcher variant="dropdown" size="sm" />

        {authenticated ? (
          <div className="relative">
            <button
              type="button"
              onClick={() => setMenuOpen((v) => !v)}
              title={name ?? "Tài khoản"}
              className="flex h-8 items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-1.5 transition-colors hover:border-slate-300 hover:bg-slate-50 sm:px-2"
              aria-haspopup="menu"
              aria-expanded={menuOpen}
            >
              <span className="flex size-6 items-center justify-center rounded-full bg-slate-800 text-[10.5px] font-bold tracking-tight text-white">
                {userInitials(name)}
              </span>
              <span className="hidden max-w-24 truncate text-xs font-semibold text-slate-800 2xl:inline">
                {shortDisplayName(name)}
              </span>
              <ChevronDown size={13} className="text-slate-500" />
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
                  className="panel-modal absolute right-0 top-10 z-50 w-56 p-1.5 fade-in"
                  onMouseLeave={() => setMenuOpen(false)}
                >
                  <div className="border-b border-slate-100 px-2.5 py-2">
                    <p className="truncate text-xs font-bold text-slate-900">{name}</p>
                    {subtitle && <p className="truncate text-[11px] text-slate-500">{subtitle}</p>}
                  </div>
                  <div className="mt-1 space-y-0.5">
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
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={onLogin}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đăng nhập
            </button>
            <button
              type="button"
              onClick={onRegister}
              className="rounded-lg bg-primary px-2.5 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Gia nhập
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
