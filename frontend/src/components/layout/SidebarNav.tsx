"use client";

import Image from "next/image";
import Link from "next/link";
import { useRef, useState, type FocusEvent, type MouseEvent } from "react";
import { ChevronDown, LayoutDashboard, LogOut, PanelLeftClose, PanelLeftOpen, X } from "lucide-react";
import { isNavItemActive, NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import type { User } from "@/types/user/user.types";

export function SidebarNav({
  isMobile = false,
  collapsed,
  onToggleCollapsed,
  onCloseMobile,
  sections,
  closedSections,
  closedGroups,
  onToggleSection,
  onToggleGroup,
  pathname,
  currentTab,
  user,
  mustChangePassword,
  onSignOut,
}: {
  isMobile?: boolean;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onCloseMobile: () => void;
  sections: NavSection[];
  closedSections: Set<string>;
  closedGroups: Set<string>;
  onToggleSection: (id: string) => void;
  onToggleGroup: (id: string) => void;
  pathname: string;
  currentTab: string | null;
  user?: User | null;
  mustChangePassword?: boolean;
  onSignOut: () => void;
}) {
  const { t, tr } = useI18n();
  const isCollapsed = !isMobile && collapsed;
  const isOverviewActive = pathname === "/dashboard";
  // fixed-position flyout: the nav scrolls (overflow clips absolute children), so it can't live inside it
  type Tip = { label: string; items?: { href: string; label: string; active: boolean }[]; top: number; left: number };
  const [tip, setTip] = useState<Tip | null>(null);
  const closeTimer = useRef<number | undefined>(undefined);
  const keepTip = () => window.clearTimeout(closeTimer.current);
  // short delay so the pointer can travel from the icon into the flyout
  const hideTip = () => {
    keepTip();
    closeTimer.current = window.setTimeout(() => setTip(null), 150);
  };
  const showTip = (label: string, el: HTMLElement, items?: Tip["items"]) => {
    keepTip();
    const r = el.getBoundingClientRect();
    const height = items ? 40 + items.length * 30 : 0;
    setTip({ label, items, top: items ? Math.max(8, Math.min(r.top, window.innerHeight - height - 8)) : r.top + r.height / 2, left: r.right + 8 });
  };
  const tipProps = (label: string, items?: Tip["items"]) =>
    isCollapsed
      ? {
          "aria-label": label,
          onMouseEnter: (e: MouseEvent<HTMLElement>) => showTip(label, e.currentTarget, items),
          onFocus: (e: FocusEvent<HTMLElement>) => showTip(label, e.currentTarget, items),
          onMouseLeave: hideTip,
          onBlur: hideTip,
        }
      : {};

  return (
    <aside
      className={cn(
        "flex h-full select-none flex-col border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        isMobile ? "w-64 max-w-[82vw] sm:w-72" : isCollapsed ? "w-13" : "w-56"
      )}
    >
      <div
        className={cn(
          "flex shrink-0 border-b border-sidebar-border",
          isCollapsed ? "flex-col items-center gap-1.5 py-2" : "h-13 items-center justify-between gap-2 px-3"
        )}
      >
        <Link href="/home" className="flex min-w-0 shrink-0 items-center gap-2.5" aria-label="VJU ClubHub">
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
                {t("sidebar.universitySub")}
              </p>
            </div>
          )}
        </Link>
        {isMobile ? (
          <button
            type="button"
            aria-label="Đóng menu"
            onClick={onCloseMobile}
            className="flex size-8 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent"
          >
            <X size={16} />
          </button>
        ) : (
          <button
            type="button"
            aria-label={isCollapsed ? "Mở rộng sidebar" : "Thu gọn sidebar"}
            title={isCollapsed ? undefined : "Thu gọn / Mở rộng (Ctrl+B)"}
            onClick={onToggleCollapsed}
            {...tipProps("Mở rộng (Ctrl+B)")}
            className="hidden size-6 items-center justify-center rounded-md text-muted-foreground hover:bg-sidebar-accent lg:flex"
          >
            {isCollapsed ? <PanelLeftOpen size={14} /> : <PanelLeftClose size={14} />}
          </button>
        )}
      </div>

      <nav aria-label="Điều hướng chính" className="flex-1 space-y-0.5 overflow-y-auto px-2 py-2">
        {user && !mustChangePassword && (
          <Link
            href="/dashboard"
            title={isCollapsed ? undefined : tr("Tổng quan")}
            onClick={onCloseMobile}
            {...tipProps(tr("Tổng quan"))}
            className={cn(
              "flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-colors",
              isOverviewActive
                ? "bg-primary/10 font-semibold text-primary shadow-2xs"
                : "font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900",
              isCollapsed && "justify-center px-1.5"
            )}
          >
            <span className="shrink-0 text-primary">
              <LayoutDashboard size={15} />
            </span>
            {!isCollapsed && <span className="truncate">{tr("Tổng quan")}</span>}
          </Link>
        )}

        {sections.map((section) => {
          const sectionOpen = !closedSections.has(section.id);
          return (
            <div key={section.id} className={cn(section.title && "pt-1.5")}>
              {section.title && !isCollapsed && (
                <button
                  type="button"
                  onClick={() => onToggleSection(section.id)}
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
                    const hasActiveChild = group.items.some((item) =>
                      isNavItemActive(item, pathname, currentTab)
                    );

                    if (isCollapsed) {
                      const firstHref = group.items[0]?.href ?? "/dashboard";
                      return (
                        <Link
                          key={group.id}
                          href={firstHref}
                          onClick={onCloseMobile}
                          {...tipProps(
                            group.label,
                            group.items.map((i) => ({ href: i.href, label: i.label, active: isNavItemActive(i, pathname, currentTab) }))
                          )}
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
                          onClick={() => onToggleGroup(group.id)}
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
                              const active = isNavItemActive(item, pathname, currentTab);
                              return (
                                <li key={item.href}>
                                  <Link
                                    href={item.href}
                                    onClick={onCloseMobile}
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

      {isCollapsed && tip && !tip.items && (
        <div
          role="tooltip"
          style={{ top: tip.top, left: tip.left }}
          className="pointer-events-none fixed z-[60] -translate-y-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-medium text-white shadow-lg"
        >
          {tip.label}
        </div>
      )}
      {isCollapsed && tip?.items && (
        <div
          style={{ top: tip.top, left: tip.left }}
          onMouseEnter={keepTip}
          onMouseLeave={hideTip}
          onFocus={keepTip}
          onBlur={hideTip}
          className="fade-in fixed z-[60] min-w-48 rounded-xl border border-border bg-popover p-1.5 text-popover-foreground shadow-lg"
        >
          {/* invisible bridge over the 8px gap so the pointer never "leaves" on the way in */}
          <span aria-hidden className="absolute inset-y-0 -left-2 w-2" />
          <p className="px-2 pb-1 pt-0.5 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">{tip.label}</p>
          <ul className="space-y-0.5">
            {tip.items.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  onClick={() => {
                    setTip(null);
                    onCloseMobile();
                  }}
                  className={cn(
                    "flex items-center gap-2 whitespace-nowrap rounded-lg px-2 py-1.5 text-xs transition-colors",
                    item.active ? "bg-primary/10 font-semibold text-primary" : "text-foreground/80 hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <span className={cn("size-1 shrink-0 rounded-full", item.active ? "bg-primary" : "bg-muted-foreground/60")} />
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}

      {!isCollapsed && user && (
        <div className="border-t border-sidebar-border p-2">
          <div className="flex items-center justify-between gap-1.5 rounded-lg bg-sidebar-accent/50 px-2.5 py-1.5">
            <div className="min-w-0 leading-tight">
              <p className="truncate text-[11px] font-bold text-foreground">
                {user.fullName || user.email}
              </p>
              <p className="truncate text-[10px] text-muted-foreground">
                {user.studentCode || user.email}
              </p>
            </div>
            <button
              type="button"
              title="Đăng xuất"
              aria-label="Đăng xuất"
              onClick={onSignOut}
              className="flex size-6 shrink-0 items-center justify-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            >
              <LogOut size={13} />
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
