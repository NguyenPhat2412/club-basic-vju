"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  Bell,
  ChevronDown,
  FileText,
  KeyRound,
  LogOut,
  Menu,
  Network,
  PanelLeftClose,
  PanelLeftOpen,
  ShieldCheck,
  UserCheck,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import { apiModel } from "@/lib/api";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { CLUB_WORKSPACE_KEYS } from "@/hooks/useSession";
import { useThemePreference } from "@/hooks/useThemePreference";
import { cn } from "@/lib/utils";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { FirstLoginPassword } from "./FirstLoginPassword";

type SubNavItem = {
  href: string;
  label: string;
  tab?: string;
  visible?: boolean;
};

type NavParentGroup = {
  id: string;
  label: string;
  icon: ReactNode;
  items: SubNavItem[];
};

type NavSection = {
  id: string;
  title?: string;
  groups: NavParentGroup[];
};

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <Suspense fallback={<div className="flex h-svh w-full bg-background" />}>
      <AppShellInner>{children}</AppShellInner>
    </Suspense>
  );
}

function AppShellInner({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const currentTab = searchParams.get("tab");
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  useThemePreference();

  const publicClubRoute = pathname === "/clubs";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
  const [passwordOpen, setPasswordOpen] = useState(false);

  useEffect(() => {
    if (session.settled && !session.user && !publicClubRoute) {
      router.replace("/login");
    }
  }, [publicClubRoute, router, session.settled, session.user]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        setCollapsed((v) => !v);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  const hasAnyPerm = (keys: string[]) => keys.some(session.can);

  const canDept = hasAnyPerm([
    "department.view",
    "department.create",
    "department.update",
    "department.activate",
    "department.inactive",
  ]);
  const canClubSettings = hasAnyPerm([
    "club.create",
    "club.update",
    "club.active",
    "club.inactive",
    "notification.send",
  ]);
  const canMembers = hasAnyPerm([
    "member.view",
    "member.view_detail",
    "member.add",
    "member.update",
    "member.remove",
    "department.member.view",
    "department.member.add",
    "department.member.remove",
  ]);
  const canApplications = hasAnyPerm([
    "application.view",
    "application.view_detail",
    "application.review",
    "application.approve",
    "application.reject",
    "application.update",
    "application.delete",
  ]);
  const canForms = hasAnyPerm([
    "application.manage_form",
    "application.review",
    "application.approve",
    "application.view",
  ]);
  const canEvents = hasAnyPerm([
    "event.view",
    "event.create",
    "event.update",
    "event.attendance",
  ]);
  const canTasks = hasAnyPerm(["task.view", "task.create", "task.verify"]);
  const canChat = hasAnyPerm(["chat.view", "chat.send", "chat.summarize"]);
  const canAnyClubWorkspace = CLUB_WORKSPACE_KEYS.some(session.can) || session.can("club.create");

  const rawSections: NavSection[] = [
    {
      id: "sec-personal",
      groups: [
        {
          id: "grp-portal",
          label: "Cổng cá nhân",
          icon: <UserCheck size={15} />,
          items: [
            { href: "/clubs", label: "Khám phá câu lạc bộ", visible: true },
            { href: "/memberships", label: "CLB đang tham gia", visible: !!session.user },
            { href: "/applications", label: "Đơn đăng ký của tôi", visible: !!session.user },
            { href: "/schedule", label: "Lịch & Công việc của tôi", visible: !!session.user },
            { href: "/notifications", label: "Thông báo của tôi", visible: !!session.user },
            { href: "/documents", label: "Quy chế và nội quy", visible: !!session.user && session.can("document.view") },
            { href: "/profile", label: "Hồ sơ cá nhân", visible: !!session.user },
          ],
        },
      ],
    },
    {
      id: "sec-club",
      title: "2. CÂU LẠC BỘ & NHÂN SỰ",
      groups: [
        {
          id: "grp-org",
          label: "Cơ cấu nội bộ",
          icon: <Network size={15} />,
          items: [
            {
              href: "/management?tab=departments",
              tab: "departments",
              label: "Phòng ban chuyên môn",
              visible: canDept,
            },
            {
              href: "/management?tab=settings",
              tab: "settings",
              label: "Thông tin & Chi nhánh CLB",
              visible: canClubSettings,
            },
            {
              href: "/management?tab=members",
              tab: "members",
              label: "Thành viên & Phân ban",
              visible: canMembers,
            },
          ],
        },
        {
          id: "grp-hr",
          label: "Quản lý nhân sự CLB",
          icon: <UsersRound size={15} />,
          items: [
            {
              href: "/management?tab=applications",
              tab: "applications",
              label: "Hồ sơ ứng tuyển",
              visible: canApplications || (canAnyClubWorkspace && !canDept && !canMembers && !canEvents && !canTasks && !canChat && !canClubSettings),
            },
            {
              href: "/management?tab=forms",
              tab: "forms",
              label: "Biểu mẫu tuyển thành viên",
              visible: canForms,
            },
          ],
        },
        {
          id: "grp-ops",
          label: "Báo cáo & Điều phối",
          icon: <FileText size={15} />,
          items: [
            {
              href: "/management?tab=events",
              tab: "events",
              label: "Sự kiện & Điểm danh",
              visible: canEvents,
            },
            {
              href: "/management?tab=tasks",
              tab: "tasks",
              label: "Báo cáo công việc",
              visible: canTasks,
            },
            {
              href: "/management?tab=chat",
              tab: "chat",
              label: "Kênh trao đổi & AI",
              visible: canChat,
            },
          ],
        },
      ],
    },
    {
      id: "sec-system",
      title: "3. QUẢN TRỊ HỆ THỐNG",
      groups: [
        {
          id: "grp-sys",
          label: "Cấu hình & Phân quyền",
          icon: <ShieldCheck size={15} />,
          items: [
            { href: "/users", label: "Hồ sơ tài khoản", visible: session.can("user.view") },
            { href: "/roles", label: "Chức vụ & Phân quyền", visible: session.can("role.view") },
            { href: "/audit-logs", label: "Nhật ký hệ thống", visible: session.can("audit.view") },
          ],
        },
      ],
    },
  ];

  const sections: NavSection[] = rawSections
    .map((sec) => ({
      ...sec,
      groups: sec.groups
        .map((grp) => ({
          ...grp,
          items: grp.items.filter((item) => item.visible !== false && !session.mustChangePassword),
        }))
        .filter((grp) => grp.items.length > 0),
    }))
    .filter((sec) => sec.groups.length > 0);

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.clear();
    router.replace("/home");
  };

  const toggleSection = (id: string) =>
    setClosedSections((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleGroup = (id: string) =>
    setClosedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const isSubItemActive = (item: SubNavItem) => {
    if (item.tab) {
      if (pathname !== "/management") return false;
      if (!currentTab) return item.tab === "applications";
      return currentTab === item.tab;
    }
    return pathname === item.href || pathname.startsWith(`${item.href}/`);
  };

  const isOverviewActive = pathname === "/dashboard";

  const activeNavMeta = (() => {
    if (isOverviewActive) {
      return { groupLabel: "Bảng điều khiển", pageTitle: "Tổng quan hệ thống" };
    }
    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          if (isSubItemActive(item)) {
            return { groupLabel: grp.label, pageTitle: item.label };
          }
        }
      }
    }
    if (pathname === "/management") {
      return { groupLabel: "Câu lạc bộ & Nhân sự", pageTitle: "Không gian quản lý CLB" };
    }
    if (pathname === "/profile") {
      return { groupLabel: "Cổng cá nhân", pageTitle: "Hồ sơ cá nhân" };
    }
    return { groupLabel: "Cổng thông tin", pageTitle: "Hệ thống CLB sinh viên" };
  })();

  const sidebarContent = (isMobile = false) => {
    const isCollapsed = !isMobile && collapsed;
    return (
      <aside
        className={cn(
          "flex h-full select-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
          isCollapsed ? "w-13" : "w-56"
        )}
      >
        {/* Cột trái - Header thương hiệu */}
        <div className="flex h-13 shrink-0 items-center justify-between gap-2 border-b border-sidebar-border px-3">
          <Link
            href="/home"
            className="flex min-w-0 items-center gap-2.5"
            aria-label="VJU ClubHub"
          >
            <Image
              src="/images/vju-logo.png"
              alt="Logo Trường Đại học Việt Nhật (VJU)"
              width={36}
              height={36}
              className="size-9 shrink-0 rounded-full bg-white p-0.5 object-contain shadow-xs ring-1 ring-border/70"
            />
            {!isCollapsed && (
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[13px] font-extrabold tracking-tight text-foreground">
                  CLUB<span className="text-primary">HUB</span>
                </p>
                <p className="truncate text-[10px] font-medium text-muted-foreground">
                  ĐH Việt Nhật · ĐHQGHN
                </p>
              </div>
            )}
          </Link>
          {isMobile ? (
            <button
              type="button"
              aria-label="Đóng menu"
              onClick={() => setMobileOpen(false)}
              className="flex size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
            >
              <X size={14} />
            </button>
          ) : (
            <button
              type="button"
              aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
              title="Thu gọn / Mở rộng (Ctrl+B)"
              onClick={() => setCollapsed((v) => !v)}
              className="hidden size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent lg:flex"
            >
              {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
            </button>
          )}
        </div>

        {/* Danh sách điều hướng phân cấp kiểu cây */}
        <nav
          aria-label="Điều hướng chính"
          className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2"
        >
          {/* Mục đơn trên cùng: Tổng quan */}
          {session.user && !session.mustChangePassword && (
            <Link
              href="/dashboard"
              title="Tổng quan"
              onClick={() => setMobileOpen(false)}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
                isOverviewActive
                  ? "bg-primary/10 font-semibold text-primary shadow-2xs"
                  : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900",
                isCollapsed && "justify-center px-1.5"
              )}
            >
              <span className="shrink-0 text-primary">
                <UserCheck size={15} />
              </span>
              {!isCollapsed && <span className="truncate">Tổng quan</span>}
            </Link>
          )}

          {sections.map((section) => {
            const sectionOpen = !closedSections.has(section.id);
            return (
              <div key={section.id} className={cn(section.title && "pt-1.5")}>
                {section.title && !isCollapsed && (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.id)}
                    className="flex w-full items-center justify-between rounded-md px-2.5 py-1 text-left transition-colors hover:bg-sidebar-accent/40"
                  >
                    <span className="truncate text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
                      {section.title}
                    </span>
                    <ChevronDown
                      className={cn(
                        "size-3 shrink-0 text-muted-foreground transition-transform duration-150",
                        !sectionOpen && "-rotate-90"
                      )}
                    />
                  </button>
                )}

                {(sectionOpen || isCollapsed) && (
                  <div className="mt-0.5 space-y-0.5">
                    {section.groups.map((group) => {
                      const groupOpen = !closedGroups.has(group.id);
                      const hasActiveChild = group.items.some(isSubItemActive);

                      if (isCollapsed) {
                        const firstHref = group.items[0]?.href ?? "/dashboard";
                        return (
                          <Link
                            key={group.id}
                            href={firstHref}
                            title={`${group.label}: ${group.items.map((i) => i.label).join(", ")}`}
                            onClick={() => setMobileOpen(false)}
                            className={cn(
                              "flex items-center justify-center rounded-lg p-2 transition-colors",
                              hasActiveChild
                                ? "bg-primary/10 text-primary"
                                : "text-primary/85 hover:bg-sidebar-accent"
                            )}
                          >
                            {group.icon}
                          </Link>
                        );
                      }

                      return (
                        <div key={group.id} className="space-y-0.5">
                          <button
                            type="button"
                            onClick={() => toggleGroup(group.id)}
                            className={cn(
                              "flex w-full items-center justify-between gap-1.5 rounded-lg px-2.5 py-1.5 text-left text-xs transition-colors hover:bg-sidebar-accent/60",
                              hasActiveChild ? "font-semibold text-foreground" : "font-medium text-foreground/90"
                            )}
                          >
                            <span className="flex min-w-0 items-center gap-2">
                              <span className="shrink-0 text-primary">{group.icon}</span>
                              <span className="truncate">{group.label}</span>
                            </span>
                            <ChevronDown
                              className={cn(
                                "size-3.5 shrink-0 text-muted-foreground transition-transform duration-150",
                                !groupOpen && "-rotate-90"
                              )}
                            />
                          </button>

                          {groupOpen && (
                            <ul className="ml-3.5 space-y-0.5 border-l border-border/80 pl-2 pt-0.5">
                              {group.items.map((item) => {
                                const active = isSubItemActive(item);
                                return (
                                  <li key={item.href}>
                                    <Link
                                      href={item.href}
                                      onClick={() => setMobileOpen(false)}
                                      className={cn(
                                        "flex items-center gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                                        active
                                          ? "bg-primary/10 font-semibold text-primary"
                                          : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                                      )}
                                    >
                                      <span
                                        className={cn(
                                          "size-1 shrink-0 rounded-full border transition-colors",
                                          active
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground/70 bg-transparent"
                                        )}
                                      />
                                      <span className="truncate">{item.label}</span>
                                    </Link>
                                  </li>
                                );
                              })}
                            </ul>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        {/* Chân Sidebar: Thông tin tóm tắt tài khoản */}
        {!isCollapsed && session.user && (
          <div className="border-t border-sidebar-border p-2">
            <div className="flex items-center justify-between gap-1.5 rounded-lg bg-sidebar-accent/50 px-2.5 py-1.5">
              <div className="min-w-0 leading-tight">
                <p className="truncate text-[11px] font-bold text-foreground">
                  {session.user.fullName || session.user.email}
                </p>
                <p className="truncate text-[10px] text-muted-foreground">
                  {session.user.studentCode || session.user.email}
                </p>
              </div>
              <button
                type="button"
                title="Đăng xuất"
                aria-label="Đăng xuất"
                onClick={signOut}
                className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
              >
                <LogOut size={13} />
              </button>
            </div>
          </div>
        )}
      </aside>
    );
  };

  return (
    <div className="flex h-svh min-h-0 w-full overflow-hidden bg-background text-foreground">
      {/* Cột trái: Sidebar cố định trên Desktop */}
      <div className="hidden h-full shrink-0 lg:block">{sidebarContent(false)}</div>

      {/* Ngăn kéo Sidebar trên Mobile */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-2xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            {sidebarContent(true)}
          </div>
        </div>
      )}

      {/* Cột phải: Thanh tiêu đề trên cùng (Topbar) + Nội dung chính */}
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          groupLabel={activeNavMeta.groupLabel}
          pageTitle={activeNavMeta.pageTitle}
          onMenu={() => setMobileOpen(true)}
          authenticated={!!session.user}
          name={session.user?.fullName || session.user?.email}
          subtitle={session.user?.studentCode || session.user?.email}
          onPassword={() => setPasswordOpen(true)}
          onProfile={() => router.push("/profile")}
          onSignOut={signOut}
          notificationsActive={pathname === "/notifications"}
        />

        <main
          data-design-system="admin-v1"
          className="flex min-h-0 min-w-0 flex-1 flex-col overflow-y-auto bg-background"
        >
          {session.user && session.mustChangePassword ? (
            <FirstLoginPassword email={session.user.email} />
          ) : session.user || publicClubRoute ? (
            children
          ) : null}
        </main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
    </div>
  );
}

function Topbar({
  groupLabel,
  pageTitle,
  onMenu,
  authenticated,
  name,
  subtitle,
  onPassword,
  onProfile,
  onSignOut,
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
  notificationsActive: boolean;
}) {
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
      {/* Cụm tiêu đề ngữ cảnh bên trái */}
      <div className="flex min-w-0 items-center gap-2">
        <button
          type="button"
          aria-label="Mở menu"
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

      {/* Cụm công cụ & tài khoản bên phải */}
      <div className="flex shrink-0 items-center gap-2.5">
        {now && (
          <span className="hidden items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs md:inline-flex">
            <b className="font-mono font-bold text-primary">{now.toLocaleTimeString("vi-VN")}</b>
            <span className="text-slate-500">
              {now.toLocaleDateString("vi-VN", {
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
              )}
            </div>
          </>
        ) : (
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              Đăng nhập
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:opacity-90"
            >
              Đăng ký
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
