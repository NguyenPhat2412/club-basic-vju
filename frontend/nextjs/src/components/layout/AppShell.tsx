"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ReactNode, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell, Building2, ChevronDown, ClipboardList, Compass, FileText, KeyRound, LogOut, Menu, Moon,
  PanelLeftClose, PanelLeftOpen, ShieldCheck, Sun, Users, UsersRound,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { useSession } from "@/hooks/useSession";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "./ChangePasswordModal";

type NavItem = { href: string; label: string; icon: ReactNode; show?: boolean };
type NavGroup = { title: string; items: NavItem[] };

export function AppShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useSession();
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") { e.preventDefault(); setCollapsed((v) => !v); } };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const manage = ["application.view", "application.review", "member.view", "department.member.add"].some(session.can);
  const groups: NavGroup[] = ([
    { title: "1. Câu lạc bộ", items: [
      { href: "/clubs", label: "Khám phá CLB", icon: <Compass /> },
      { href: "/applications", label: "Đơn đăng ký của tôi", icon: <ClipboardList /> },
      { href: "/memberships", label: "CLB đã tham gia", icon: <UsersRound /> },
      { href: "/notifications", label: "Thông báo", icon: <Bell /> },
    ] },
    { title: "2. Quản lý CLB", items: [
      { href: "/management", label: "Hồ sơ & thành viên", icon: <ShieldCheck />, show: manage },
      { href: "/documents", label: "Kho tài liệu", icon: <FileText />, show: session.can("document.view") },
    ] },
    { title: "3. Hệ thống", items: [
      { href: "/users", label: "Tài khoản", icon: <Users />, show: session.can("user.view") },
    ] },
  ] as NavGroup[]).map((g) => ({ ...g, items: g.items.filter((i) => i.show !== false) })).filter((g) => g.items.length > 0);

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.clear();
    router.replace("/login");
  };

  const toggleGroup = (title: string) => setClosedGroups((prev) => {
    const next = new Set(prev);
    if (next.has(title)) next.delete(title); else next.add(title);
    return next;
  });

  const sidebar = (
    <aside className={cn("flex h-full flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width]", collapsed ? "w-[3.25rem]" : "w-64")}>
      <div className="flex h-14 items-center gap-2.5 border-b border-border/40 px-3">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-[11px] font-black text-primary-foreground">VJU</span>
        {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-[13.5px] font-black tracking-tight">ClubHub</p><p className="truncate text-[11px] font-medium text-muted-foreground">Trường ĐH Việt Nhật</p></div>}
        <button aria-label={collapsed ? "Mở rộng menu" : "Thu gọn menu"} title="Ctrl+B" onClick={() => setCollapsed((v) => !v)}
          className="hidden size-7 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent lg:flex">
          {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-3 overflow-y-auto px-2 py-2 pb-4">
        {groups.map((group) => {
          const open = !closedGroups.has(group.title);
          return (
            <div key={group.title}>
              {!collapsed && (
                <button onClick={() => toggleGroup(group.title)} className="flex w-full items-center justify-between rounded-md px-2 py-2 hover:bg-muted/60">
                  <span className="truncate text-[11px] font-bold uppercase tracking-wider text-muted-foreground/80">{group.title}</span>
                  <ChevronDown className={cn("size-3.5 text-muted-foreground transition-transform", !open && "-rotate-90")} />
                </button>
              )}
              {(open || collapsed) && (
                <ul className="mt-0.5 grid gap-0.5">
                  {group.items.map((item) => {
                    const active = pathname === item.href || pathname.startsWith(item.href + "/");
                    return (
                      <li key={item.href}>
                        <Link href={item.href} title={item.label} onClick={() => setMobileOpen(false)}
                          className={cn("flex h-8 items-center gap-2 rounded-md p-2 text-sm [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-primary",
                            active ? "border border-primary/25 bg-primary/10 font-bold text-primary" : "border border-transparent hover:bg-sidebar-accent",
                            collapsed && "justify-center")}>
                          {item.icon}{!collapsed && <span className="truncate">{item.label}</span>}
                        </Link>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </nav>
    </aside>
  );

  return (
    <div className="flex h-svh min-h-0 w-full overflow-hidden bg-background">
      <div className="hidden lg:block">{sidebar}</div>
      {mobileOpen && <div className="fixed inset-0 z-50 flex bg-black/50 lg:hidden" onClick={() => setMobileOpen(false)}><div onClick={(e) => e.stopPropagation()}>{sidebar}</div></div>}
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar onMenu={() => setMobileOpen(true)} name={session.user?.fullName || session.user?.email} subtitle={session.user?.studentCode || session.user?.email}
          onPassword={() => setPasswordOpen(true)} onSignOut={signOut} />
        <main data-design-system="admin-v1" className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">{session.user ? children : null}</main>
      </div>
      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function Topbar({ onMenu, name, subtitle, onPassword, onSignOut }: { onMenu: () => void; name?: string; subtitle?: string; onPassword: () => void; onSignOut: () => void }) {
  const [now, setNow] = useState<Date | null>(null);
  const [dark, setDark] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => setNow(new Date());
    const timer = setTimeout(tick, 0);
    const interval = setInterval(tick, 1000);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, []);

  useEffect(() => {
    const stored = (() => { try { return localStorage.getItem("vju-theme"); } catch { return null; } })();
    const initial = stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
    document.documentElement.classList.toggle("dark", initial);
    const timer = setTimeout(() => setDark(initial), 0);
    return () => clearTimeout(timer);
  }, []);

  const toggleTheme = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    try { localStorage.setItem("vju-theme", next ? "dark" : "light"); } catch { /* storage unavailable */ }
  };

  return (
    <header className="relative z-40 flex min-h-14 shrink-0 select-none items-center justify-between gap-1 border-b border-border/40 bg-background px-3 py-1 sm:gap-3 sm:px-4">
      <div className="flex min-w-0 items-center gap-2">
        <button aria-label="Mở menu" onClick={onMenu} className="flex size-8 items-center justify-center rounded-md hover:bg-muted lg:hidden"><Menu size={18} /></button>
        <span className="hidden items-center gap-2 rounded-lg border border-border/60 px-2.5 py-1.5 text-xs font-bold sm:inline-flex">
          <Building2 size={14} className="text-primary" /> TRƯỜNG ĐẠI HỌC VIỆT NHẬT
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-2">
        {now && (
          <span className="hidden items-center gap-2 rounded-lg border border-border/50 bg-secondary/40 px-2.5 py-1 text-xs shadow-2xs md:inline-flex">
            <b className="font-mono font-bold">{now.toLocaleTimeString("vi-VN")}</b>
            <span className="text-muted-foreground">{now.toLocaleDateString("vi-VN", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" })}</span>
          </span>
        )}
        <button aria-label="Chuyển giao diện sáng/tối" onClick={toggleTheme} className="relative h-8 w-[60px] rounded-full border border-border/70 bg-muted/70 p-0.5">
          <span className={cn("flex size-6 items-center justify-center rounded-full bg-background shadow-sm transition-transform", dark && "translate-x-7")}>
            {dark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-primary" />}
          </span>
        </button>
        <div className="relative">
          <button onClick={() => setMenuOpen((v) => !v)} className="flex items-center gap-2 rounded-lg px-2 py-1 hover:bg-muted" aria-haspopup="menu" aria-expanded={menuOpen}>
            <div className="hidden text-right sm:block"><p className="max-w-40 truncate text-sm font-bold">{name ?? "…"}</p><p className="max-w-40 truncate text-[11px] text-muted-foreground">{subtitle}</p></div>
            <span className="flex size-8 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{(name ?? "?").slice(0, 1).toUpperCase()}</span>
          </button>
          {menuOpen && (
            <div role="menu" className="panel-modal absolute right-0 top-11 z-50 w-52 p-1.5 fade-in" onMouseLeave={() => setMenuOpen(false)}>
              <button role="menuitem" onClick={() => { setMenuOpen(false); onPassword(); }} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm hover:bg-muted"><KeyRound size={14} className="text-primary" /> Đổi mật khẩu</button>
              <button role="menuitem" onClick={onSignOut} className="flex w-full items-center gap-2 rounded-md px-2.5 py-2 text-sm text-destructive hover:bg-destructive/10"><LogOut size={14} /> Đăng xuất</button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
