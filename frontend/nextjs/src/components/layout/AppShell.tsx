"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Bell, BookOpen, ChevronDown, ClipboardList, Compass, KeyRound, LogOut, Menu, ShieldCheck, Users, UsersRound, X } from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "./ChangePasswordModal";

type NavLink = { href: string; label: string; icon: ReactNode; visible?: boolean };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [menuOpen, setMenuOpen] = useState(false);
  const [clubMenuOpen, setClubMenuOpen] = useState(false);
  const [managementMenuOpen, setManagementMenuOpen] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [passwordOpen, setPasswordOpen] = useState(false);

  const canManage = ["application.view", "application.review", "member.view", "department.member.add"].some(session.can);
  const clubLinks: NavLink[] = [
    { href: "/clubs", label: "Khám phá câu lạc bộ", icon: <Compass size={16} /> },
    { href: "/memberships", label: "CLB đang tham gia", icon: <UsersRound size={16} /> },
    { href: "/applications", label: "Đơn đăng ký của tôi", icon: <ClipboardList size={16} /> },
    { href: "/notifications", label: "Thông báo", icon: <Bell size={16} /> },
  ];
  const managementLinks: NavLink[] = [
    { href: "/management", label: "Quản lý câu lạc bộ", icon: <ShieldCheck size={16} />, visible: canManage },
    { href: "/documents", label: "Kho tài liệu", icon: <BookOpen size={16} />, visible: session.can("document.view") },
    { href: "/users", label: "Tài khoản", icon: <Users size={16} />, visible: session.can("user.view") },
    { href: "/roles", label: "Vai trò & phân quyền", icon: <KeyRound size={16} />, visible: session.can("role.view") },
  ].filter((item) => item.visible && !session.mustChangePassword);

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.clear();
    router.replace("/home");
  };

  const isActive = (href: string) => pathname === href || pathname.startsWith(`${href}/`);
  const linkClass = (href: string) => cn("inline-flex min-h-10 items-center gap-2 border-b-2 px-2 text-[12px] font-medium transition-colors", isActive(href) ? "border-[#8e1f32] text-[#8e1f32]" : "border-transparent text-[#4d4944] hover:text-[#8e1f32]");

  return (
    <div className="flex min-h-svh flex-col bg-background text-foreground">
      <div className="bg-[#8e1f32] px-4 py-1.5 text-center text-[9px] font-semibold tracking-[.16em] text-white sm:text-[10px]">TRƯỜNG ĐẠI HỌC VIỆT NHẬT · ĐẠI HỌC QUỐC GIA HÀ NỘI</div>
      <header className="sticky top-0 z-40 border-b border-border bg-card/95 backdrop-blur-xl">
        <div className="mx-auto flex min-h-[76px] max-w-[1440px] items-center justify-between gap-4 px-4 sm:px-7 lg:px-10">
          <Link href="/home" className="flex shrink-0 items-center gap-3" aria-label="VJU ClubHub">
            <span className="grid size-11 place-items-center rounded-full border border-[#b58b54] text-[11px] font-black tracking-widest text-[#8e1f32]">VJU</span>
            <span className="hidden border-l border-border pl-3 sm:block"><span className="block text-[9px] font-semibold uppercase tracking-[.14em] text-muted-foreground">Vietnam Japan University</span><span className="mt-1 block text-[16px] font-semibold tracking-wide">CLUB<span className="font-normal text-[#8e1f32]">HUB</span></span></span>
          </Link>

          <nav className="hidden h-[76px] items-center gap-4 lg:flex" aria-label="Điều hướng chính">
            <Link href="/dashboard" className={linkClass("/dashboard")}>Dashboard</Link>
            <div className="relative" onMouseEnter={() => setClubMenuOpen(true)} onMouseLeave={() => setClubMenuOpen(false)}>
              <button onClick={() => setClubMenuOpen((open) => !open)} aria-expanded={clubMenuOpen} className={cn("inline-flex min-h-10 items-center gap-1 border-b-2 px-2 text-[12px] font-medium transition-colors", clubLinks.some((item) => isActive(item.href)) ? "border-[#8e1f32] text-[#8e1f32]" : "border-transparent text-[#4d4944] hover:text-[#8e1f32]")}>Câu lạc bộ <ChevronDown size={13} /></button>
              {clubMenuOpen && <Dropdown className="left-0"><DropdownLinks links={clubLinks} active={isActive} onNavigate={() => setClubMenuOpen(false)} /></Dropdown>}
            </div>
            {managementLinks.length > 0 && <div className="relative" onMouseEnter={() => setManagementMenuOpen(true)} onMouseLeave={() => setManagementMenuOpen(false)}>
              <button onClick={() => setManagementMenuOpen((open) => !open)} aria-expanded={managementMenuOpen} className={cn("inline-flex min-h-10 items-center gap-1 border-b-2 px-2 text-[12px] font-medium transition-colors", managementLinks.some((item) => isActive(item.href)) ? "border-[#8e1f32] text-[#8e1f32]" : "border-transparent text-[#4d4944] hover:text-[#8e1f32]")}>Quản lý <ChevronDown size={13} /></button>
              {managementMenuOpen && <Dropdown className="left-0"><DropdownLinks links={managementLinks} active={isActive} onNavigate={() => setManagementMenuOpen(false)} /></Dropdown>}
            </div>}
          </nav>

          <div className="hidden items-center gap-2 lg:flex">
            <Link href="/notifications" aria-label="Thông báo" className={cn("grid size-9 place-items-center transition-colors hover:text-[#8e1f32]", isActive("/notifications") && "text-[#8e1f32]")}><Bell size={17} /></Link>
            <div className="relative">
              <button onClick={() => setProfileMenuOpen((open) => !open)} aria-haspopup="menu" aria-expanded={profileMenuOpen} className="flex items-center gap-2 border-l border-border pl-3 text-left">
                <span className="grid size-9 place-items-center rounded-full bg-[#8e1f32] text-[13px] font-semibold text-white">{(session.user?.fullName || session.user?.email || "V").slice(0, 1).toUpperCase()}</span>
                <span className="max-w-36"><span className="block truncate text-[11px] font-semibold">{session.user?.fullName || session.user?.email}</span><span className="block truncate text-[9px] text-muted-foreground">Tài khoản VJU</span></span><ChevronDown size={13} />
              </button>
              {profileMenuOpen && <div role="menu" className="panel-modal absolute right-0 top-12 z-50 w-52 p-1.5 shadow-xl">
                <button role="menuitem" onClick={() => { setProfileMenuOpen(false); router.push("/profile"); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-muted"><Users size={14} /> Hồ sơ cá nhân</button>
                <button role="menuitem" onClick={() => { setProfileMenuOpen(false); setPasswordOpen(true); }} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs hover:bg-muted"><KeyRound size={14} /> Đổi mật khẩu</button>
                <button role="menuitem" onClick={signOut} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-xs text-destructive hover:bg-destructive/10"><LogOut size={14} /> Đăng xuất</button>
              </div>}
            </div>
          </div>

          <button onClick={() => setMenuOpen((open) => !open)} aria-label={menuOpen ? "Đóng menu" : "Mở menu"} className="grid size-10 place-items-center border border-border lg:hidden">{menuOpen ? <X size={19} /> : <Menu size={19} />}</button>
        </div>
        {menuOpen && <nav className="absolute left-0 right-0 top-full max-h-[calc(100vh-6rem)] overflow-y-auto border-b border-border bg-card px-4 py-3 shadow-xl lg:hidden">
          <Link href="/dashboard" onClick={() => setMenuOpen(false)} className="block border-b border-border py-3 text-[13px] font-medium">Dashboard</Link>
          <p className="pb-1 pt-4 text-[9px] font-bold uppercase tracking-[.17em] text-muted-foreground">Câu lạc bộ</p>
          {clubLinks.map((item) => <MobileNavLink key={item.href} item={item} active={isActive(item.href)} close={() => setMenuOpen(false)} />)}
          {managementLinks.length > 0 && <><p className="pb-1 pt-4 text-[9px] font-bold uppercase tracking-[.17em] text-muted-foreground">Quản lý</p>{managementLinks.map((item) => <MobileNavLink key={item.href} item={item} active={isActive(item.href)} close={() => setMenuOpen(false)} />)}</>}
          <p className="mt-3 border-t border-border pt-3 text-[11px] text-muted-foreground">{session.user?.fullName || session.user?.email}</p>
          <Link href="/profile" onClick={() => setMenuOpen(false)} className="block py-3 text-[12px]">Hồ sơ cá nhân</Link>
          <button onClick={signOut} className="py-2 text-[12px] font-semibold text-[#8e1f32]">Đăng xuất</button>
        </nav>}
      </header>

      <main data-design-system="vju-app" className="flex min-h-0 flex-1 flex-col overflow-y-auto">{session.user ? children : null}</main>
      <footer className="border-t border-border bg-card px-4 py-3 text-center text-[9px] tracking-wide text-muted-foreground sm:text-left"><div className="mx-auto flex max-w-[1440px] flex-col gap-1 sm:flex-row sm:justify-between"><span>VJU ClubHub · Cổng thông tin câu lạc bộ sinh viên</span><span>Trường Đại học Việt Nhật · ĐHQGHN</span></div></footer>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function Dropdown({ children, className }: { children: ReactNode; className: string }) { return <div className={cn("panel-modal absolute top-[calc(100%-1px)] z-50 min-w-60 border border-border bg-card p-1.5 shadow-xl", className)}>{children}</div>; }
function DropdownLinks({ links, active, onNavigate }: { links: NavLink[]; active: (href: string) => boolean; onNavigate: () => void }) { return <>{links.map((item) => <Link key={item.href} href={item.href} onClick={onNavigate} className={cn("flex items-center gap-3 px-3 py-2.5 text-[12px] transition-colors hover:bg-[#8e1f32]/5 hover:text-[#8e1f32]", active(item.href) && "bg-[#8e1f32]/5 font-semibold text-[#8e1f32]")}>{item.icon}<span>{item.label}</span></Link>)}</>; }
function MobileNavLink({ item, active, close }: { item: NavLink; active: boolean; close: () => void }) { return <Link href={item.href} onClick={close} className={cn("flex items-center gap-3 border-b border-border/70 py-3 text-[12px]", active ? "font-semibold text-[#8e1f32]" : "text-foreground")}>{item.icon}{item.label}</Link>; }
