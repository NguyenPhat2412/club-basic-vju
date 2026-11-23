"use client";

import Image from "next/image";
import Link from "next/link";
import { Menu, X } from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { NotificationBellDrawer } from "@/components/notification/NotificationBellDrawer";
import { LanguageSwitcher } from "@/components/shared/LanguageSwitcher";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { shortDisplayName } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import { SessionUser } from "@/types";

interface HomeSiteHeaderProps {
  user?: SessionUser;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openAuthModal: (mode: AuthModalMode) => void;
  signOut: () => void;
}

export function HomeSiteHeader({ user, menuOpen, setMenuOpen, openAuthModal, signOut }: HomeSiteHeaderProps) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xs">
      <div className="mx-auto flex min-h-[68px] max-w-[1380px] items-center justify-between gap-2 px-3.5 sm:min-h-[74px] sm:gap-4 sm:px-6 lg:px-6 xl:gap-6 xl:px-12">
        <Link
          href="/home"
          className="flex min-w-0 items-center gap-2.5 sm:shrink-0 sm:gap-3"
          aria-label={m.topBar.homeAria}
        >
          <Image
            src="/images/vju-logo.png"
            alt={m.topBar.university}
            width={44}
            height={44}
            className="size-9 shrink-0 rounded-full bg-slate-100 p-0.5 object-contain sm:size-11"
          />
          <span className="min-w-0">
            <span className="block truncate text-[11px] font-medium text-slate-600 sm:text-xs">
              <span className="sm:hidden">{m.topBar.logoSubCompact}</span>
              <span className="hidden lg:inline xl:hidden">{m.topBar.logoSubCompact}</span>
              <span className="hidden sm:inline lg:hidden xl:inline">{m.topBar.logoSubFull}</span>
            </span>
            <span className="block whitespace-nowrap font-display text-base font-extrabold tracking-tight text-slate-900 sm:text-[18px]">
              Club<span className="text-primary">Hub</span>
            </span>
          </span>
        </Link>

        <nav className="hidden items-center gap-4 lg:flex xl:gap-6" aria-label={m.nav.mainAria}>
          <a className="whitespace-nowrap text-[13px] font-bold text-primary xl:text-sm" href="#top">
            {m.nav.home}
          </a>
          <a
            className="whitespace-nowrap text-[13px] font-semibold text-slate-700 transition-colors hover:text-primary xl:text-sm"
            href="#cau-lac-bo"
          >
            {m.nav.clubs}
          </a>
          <a
            className="whitespace-nowrap text-[13px] font-semibold text-slate-700 transition-colors hover:text-primary xl:text-sm"
            href="#su-kien-ctv"
          >
            {m.nav.events}
          </a>
          <a
            className="whitespace-nowrap text-[13px] font-semibold text-slate-700 transition-colors hover:text-primary xl:text-sm"
            href="#khong-gian-so"
          >
            {m.nav.workspace}
          </a>
          <a
            className="whitespace-nowrap text-[13px] font-semibold text-slate-700 transition-colors hover:text-primary xl:text-sm"
            href="#lich-su-kien"
          >
            {m.nav.schedule}
          </a>
          {user && (
            <Link
              className="hidden whitespace-nowrap text-sm font-bold text-slate-800 transition-colors hover:text-primary xl:inline"
              href="/dashboard"
            >
              {m.nav.dashboard}
            </Link>
          )}
        </nav>

        <div className="flex shrink-0 items-center gap-2">
          <LanguageSwitcher variant="dropdown" size="sm" />
          <div className="hidden items-center gap-2 sm:flex">
            {user ? (
              <>
                <NotificationBellDrawer size="md" />
                <Link
                  href="/dashboard"
                  title={user.fullName || user.email}
                  className="max-w-[120px] shrink-0 truncate whitespace-nowrap rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200/80 hover:text-primary xl:max-w-[140px] xl:text-sm"
                >
                  {shortDisplayName(user.fullName, user.email)}
                </Link>
                <button
                  type="button"
                  onClick={signOut}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover xl:px-4 xl:text-sm"
                >
                  {m.nav.signOut}
                </button>
              </>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => openAuthModal("login")}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-slate-100 px-3.5 py-2 text-xs font-semibold text-slate-800 transition-colors hover:bg-slate-200/80 hover:text-primary lg:px-4 lg:text-sm"
                >
                  {m.nav.signIn}
                </button>
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="shrink-0 whitespace-nowrap rounded-xl bg-primary px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-primary-hover lg:px-4 lg:text-sm"
                >
                  {m.nav.joinNow}
                </button>
              </>
            )}
          </div>

          {!user ? (
            <button
              type="button"
              onClick={() => openAuthModal("register")}
              className="shrink-0 whitespace-nowrap rounded-xl bg-primary px-2.5 py-1.5 text-xs font-bold text-white sm:hidden"
            >
              {m.nav.joinShort}
            </button>
          ) : (
            <Link
              href="/dashboard"
              className="shrink-0 whitespace-nowrap rounded-xl bg-primary px-2.5 py-1.5 text-xs font-bold text-white sm:hidden"
            >
              {m.nav.enterClubShort}
            </Link>
          )}

          <button
            type="button"
            className="grid size-10 place-items-center rounded-xl bg-slate-100 text-slate-800 transition-colors hover:bg-slate-200 lg:hidden"
            onClick={() => setMenuOpen((open) => !open)}
            aria-label={menuOpen ? m.nav.closeMenu : m.nav.openMenu}
          >
            {menuOpen ? <X size={19} /> : <Menu size={19} />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav className="absolute left-0 right-0 top-full grid gap-1 bg-white px-5 pb-5 pt-2 lg:hidden">
          <MobileLink href="#top" onClick={() => setMenuOpen(false)}>
            {m.nav.home}
          </MobileLink>
          <MobileLink href="#cau-lac-bo" onClick={() => setMenuOpen(false)}>
            {m.nav.clubs}
          </MobileLink>
          <MobileLink href="#su-kien-ctv" onClick={() => setMenuOpen(false)}>
            {m.nav.events}
          </MobileLink>
          <MobileLink href="#khong-gian-so" onClick={() => setMenuOpen(false)}>
            {m.nav.workspaceMobile}
          </MobileLink>
          <MobileLink href="#lich-su-kien" onClick={() => setMenuOpen(false)}>
            {m.nav.schedule}
          </MobileLink>
          <MobileLink href="/clubs" onClick={() => setMenuOpen(false)}>
            {m.nav.clubsDirectory}
          </MobileLink>
          <MobileLink href="/events" onClick={() => setMenuOpen(false)}>
            {m.nav.eventsRegister}
          </MobileLink>
          {user ? (
            <>
              <MobileLink href="/dashboard" onClick={() => setMenuOpen(false)}>
                {m.nav.dashboard}
              </MobileLink>
              <MobileLink href="/applications" onClick={() => setMenuOpen(false)}>
                {m.nav.myApplications}
              </MobileLink>
              <MobileLink href="/memberships" onClick={() => setMenuOpen(false)}>
                {m.nav.myClubs}
              </MobileLink>
              <MobileLink href="/notifications" onClick={() => setMenuOpen(false)}>
                {m.nav.notifications}
              </MobileLink>
            </>
          ) : (
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => openAuthModal("login")}
                className="rounded-xl bg-slate-100 py-2.5 text-center text-sm font-semibold text-slate-800 hover:text-primary"
              >
                {m.nav.signIn}
              </button>
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="rounded-xl bg-primary py-2.5 text-center text-sm font-semibold text-white"
              >
                {m.nav.createAccount}
              </button>
            </div>
          )}
        </nav>
      )}
    </header>
  );
}

function MobileLink({
  href,
  onClick,
  children,
}: {
  href: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  const className =
    "rounded-xl px-3 py-2.5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-100 hover:text-primary";
  if (href.startsWith("#")) {
    return (
      <a href={href} onClick={onClick} className={className}>
        {children}
      </a>
    );
  }
  return (
    <Link href={href} onClick={onClick} className={className}>
      {children}
    </Link>
  );
}
