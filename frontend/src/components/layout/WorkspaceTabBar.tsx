"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { ReactNode, useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import {
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  History,
  Layers,
  LayoutDashboard,
  MessageSquare,
  RotateCcw,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
  UsersRound,
  X,
} from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";

export type WorkspaceTabSpec = {
  id: string;
  label: string;
  groupLabel: string;
  href: string;
  tab?: string;
  tier?: "club" | "system";
  icon: ReactNode;
};

const STARTER_PRIORITY = [
  "route:/dashboard",
  "mgmt:clubs",
  "mgmt:overview",
  "mgmt:applications",
  "mgmt:members",
  "mgmt:events",
  "mgmt:tasks",
  "mgmt:chat",
  "docs:club",
  "route:/users",
  "route:/clubs",
  "route:/events",
  "route:/schedule",
];

function iconForTab(href: string, tab?: string, tier?: string): ReactNode {
  if (tab === "clubs") return <Building2 size={13.5} />;
  if (tab === "overview") return <BarChart3 size={13.5} />;
  if (tab === "applications") return <ClipboardList size={13.5} />;
  if (tab === "forms") return <FileSpreadsheet size={13.5} />;
  if (tab === "members") return <UsersRound size={13.5} />;
  if (tab === "departments") return <Layers size={13.5} />;
  if (tab === "events") return <CalendarCheck2 size={13.5} />;
  if (tab === "tasks") return <ClipboardCheck size={13.5} />;
  if (tab === "documents") return <FolderArchive size={13.5} />;
  if (tab === "chat") return <MessageSquare size={13.5} />;
  if (tab === "settings") return <SlidersHorizontal size={13.5} />;
  if (tier === "club") return <FolderArchive size={13.5} />;
  if (tier === "system") return <FileText size={13.5} />;
  if (href === "/dashboard") return <LayoutDashboard size={13.5} />;
  if (href === "/users") return <Users size={13.5} />;
  if (href === "/roles") return <ShieldCheck size={13.5} />;
  if (href === "/audit-logs") return <History size={13.5} />;
  if (href === "/settings") return <Settings size={13.5} />;
  if (href === "/clubs") return <Compass size={13.5} />;
  if (href === "/events") return <CalendarCheck2 size={13.5} />;
  if (href === "/schedule") return <ClipboardCheck size={13.5} />;
  if (href === "/applications") return <ClipboardList size={13.5} />;
  if (href === "/memberships") return <Building2 size={13.5} />;
  if (href === "/notifications") return <Bell size={13.5} />;
  if (href === "/profile") return <UserCircle size={13.5} />;
  return <Compass size={13.5} />;
}

export function resolveTabId(pathname: string, currentTab: string | null, currentTier: string | null): string {
  if (pathname === "/management") {
    return `mgmt:${currentTab || "clubs"}`;
  }
  if (pathname === "/documents") {
    return `docs:${currentTier === "system" ? "system" : "club"}`;
  }
  return `route:${pathname}`;
}

const emptySubscribe = () => () => {};
const TABS_SYNC_EVENT = "vju-workspace-tabs-sync";

function subscribeWorkspaceTabs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(TABS_SYNC_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(TABS_SYNC_EVENT, onStoreChange);
  };
}

export function WorkspaceTabBar({
  sections,
  pathname,
  currentTab,
  currentTier,
  authenticated,
  userId,
}: {
  sections: NavSection[];
  pathname: string;
  currentTab: string | null;
  currentTier: string | null;
  authenticated: boolean;
  userId?: string;
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const currentClubId = searchParams.get("clubId");
  const { tr } = useI18n();
  const isClient = useSyncExternalStore(emptySubscribe, () => true, () => false);

  const storageKey = `vju.workspace.tabs.v1:${userId || "guest"}`;
  const stripRef = useRef<HTMLDivElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const tabRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const rawStoredJson = useSyncExternalStore(
    subscribeWorkspaceTabs,
    () => {
      try {
        return window.localStorage.getItem(storageKey);
      } catch {
        return null;
      }
    },
    () => null
  );

  const storedIds = useMemo<string[] | null>(() => {
    if (!rawStoredJson) return null;
    try {
      const parsed = JSON.parse(rawStoredJson);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter((x): x is string => typeof x === "string");
      }
    } catch {
      // ignore invalid JSON
    }
    return null;
  }, [rawStoredJson]);

  const [menuOpen, setMenuOpen] = useState(false);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);
  const [hoveredTip, setHoveredTip] = useState<{ label: string; x: number; y: number } | null>(null);

  const catalog = useMemo(() => {
    const map = new Map<string, WorkspaceTabSpec>();
    if (authenticated) {
      map.set("route:/dashboard", {
        id: "route:/dashboard",
        label: tr("Tổng quan"),
        groupLabel: tr("Bảng điều khiển"),
        href: "/dashboard",
        icon: iconForTab("/dashboard"),
      });
    }

    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          const id = item.tab
            ? `mgmt:${item.tab}`
            : item.tier
              ? `docs:${item.tier}`
              : `route:${item.href}`;
          if (!map.has(id)) {
            map.set(id, {
              id,
              label: tr(item.label),
              groupLabel: tr(grp.label),
              href: item.href,
              tab: item.tab,
              tier: item.tier,
              icon: iconForTab(item.href, item.tab, item.tier),
            });
          }
        }
      }
    }
    return map;
  }, [authenticated, sections, tr]);

  const activeId = resolveTabId(pathname, currentTab, currentTier);

  const defaultStarterIds = useMemo(() => {
    const picked = STARTER_PRIORITY.filter((id) => catalog.has(id)).slice(0, 9);
    if (catalog.has(activeId) && !picked.includes(activeId)) {
      picked.push(activeId);
    }
    return picked.length > 0 ? picked : Array.from(catalog.keys()).slice(0, 6);
  }, [activeId, catalog]);

  const openIds = useMemo(() => {
    const base = storedIds && storedIds.length > 0 ? storedIds : defaultStarterIds;
    const valid = base.filter((id) => catalog.has(id));
    const ensured = valid.length > 0 ? [...valid] : [...defaultStarterIds];
    if (catalog.has(activeId) && !ensured.includes(activeId)) {
      ensured.push(activeId);
    }
    return ensured;
  }, [activeId, catalog, defaultStarterIds, storedIds]);

  const persistIds = useCallback(
    (next: string[]) => {
      try {
        window.localStorage.setItem(storageKey, JSON.stringify(next));
        window.dispatchEvent(new Event(TABS_SYNC_EVENT));
      } catch {
        // ignore storage errors
      }
    },
    [storageKey]
  );

  // Sync newly visited active tab to external localStorage
  useEffect(() => {
    if (!isClient || !storedIds) return;
    if (catalog.has(activeId) && !storedIds.includes(activeId)) {
      persistIds([...storedIds.filter((id) => catalog.has(id)), activeId]);
    }
  }, [activeId, catalog, isClient, persistIds, storedIds]);

  const updateScrollState = useCallback(() => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    updateScrollState();
    const el = stripRef.current;
    if (!el) return;
    const ro = new ResizeObserver(updateScrollState);
    ro.observe(el);
    return () => ro.disconnect();
  }, [openIds.length, updateScrollState]);

  useEffect(() => {
    const activeNode = tabRefs.current[activeId];
    if (activeNode) {
      activeNode.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "nearest" });
    }
    const t = setTimeout(updateScrollState, 180);
    return () => clearTimeout(t);
  }, [activeId, updateScrollState]);

  useEffect(() => {
    if (!menuOpen) return;
    const onOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [menuOpen]);

  const buildHref = (spec: WorkspaceTabSpec) => {
    if (spec.tab && currentClubId && spec.href.startsWith("/management?")) {
      const params = new URLSearchParams(spec.href.split("?")[1] ?? "");
      params.set("clubId", currentClubId);
      return `/management?${params.toString()}`;
    }
    return spec.href;
  };

  const activateTab = (spec: WorkspaceTabSpec) => {
    setHoveredTip(null);
    setMenuOpen(false);
    router.push(buildHref(spec));
  };

  const closeTab = (id: string) => {
    if (openIds.length <= 1) return;
    setHoveredTip(null);
    const idx = openIds.indexOf(id);
    const next = openIds.filter((item) => item !== id);
    persistIds(next);
    if (id === activeId) {
      const fallbackId = next[Math.min(idx, next.length - 1)] ?? next[0];
      const fallbackSpec = fallbackId ? catalog.get(fallbackId) : undefined;
      if (fallbackSpec) {
        router.push(buildHref(fallbackSpec));
      }
    }
  };

  const closeOtherTabs = () => {
    const keep = catalog.has(activeId) ? [activeId] : openIds.slice(0, 1);
    if (authenticated && catalog.has("route:/dashboard") && !keep.includes("route:/dashboard")) {
      keep.unshift("route:/dashboard");
    }
    persistIds(keep);
    setMenuOpen(false);
  };

  const closeAllToOverview = () => {
    const fallback = catalog.has("route:/dashboard")
      ? "route:/dashboard"
      : (Array.from(catalog.keys())[0] ?? activeId);
    persistIds([fallback]);
    setMenuOpen(false);
    const spec = catalog.get(fallback);
    if (spec && fallback !== activeId) {
      router.push(buildHref(spec));
    }
  };

  const resetStarterTabs = () => {
    persistIds(defaultStarterIds);
    setMenuOpen(false);
  };

  const openSpecs = openIds.map((id) => catalog.get(id)).filter((s): s is WorkspaceTabSpec => Boolean(s));
  if (openSpecs.length === 0) return null;

  return (
    <div className="relative z-35 flex h-10 w-full min-w-0 max-w-full shrink-0 select-none items-center gap-1 border-b border-slate-200 bg-white px-2 sm:px-3">
      {/* Left scroll arrow */}
      <button
        type="button"
        aria-label={tr("Cuộn dải tab sang trái")}
        disabled={!canScrollLeft}
        onClick={() => stripRef.current?.scrollBy({ left: -220, behavior: "smooth" })}
        className={cn(
          "grid size-7 shrink-0 place-items-center rounded-md transition-colors",
          canScrollLeft
            ? "text-slate-500 hover:bg-slate-100 hover:text-slate-900"
            : "cursor-default text-slate-300"
        )}
      >
        <ChevronLeft size={14} />
      </button>

      {/* Scrollable multi-tab strip */}
      <div
        ref={stripRef}
        role="tablist"
        aria-label={tr("Các trang quản lý đang mở")}
        onScroll={() => {
          setHoveredTip(null);
          updateScrollState();
        }}
        className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto py-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {openSpecs.map((spec) => {
          const isActive = spec.id === activeId;
          const canClose = openSpecs.length > 1;
          return (
            <div
              key={spec.id}
              ref={(el) => {
                tabRefs.current[spec.id] = el;
              }}
              role="tab"
              aria-selected={isActive}
              tabIndex={0}
              onClick={() => activateTab(spec)}
              onAuxClick={(e) => {
                if (e.button === 1 && canClose) {
                  e.preventDefault();
                  closeTab(spec.id);
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  activateTab(spec);
                }
              }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setHoveredTip({
                  label: spec.label,
                  x: rect.left + rect.width / 2,
                  y: rect.bottom + 7,
                });
              }}
              onMouseLeave={() => setHoveredTip(null)}
              className={cn(
                "group relative flex h-7.5 shrink-0 cursor-pointer items-center gap-1.5 rounded-lg px-2.5 text-xs transition-all focus-visible:outline-2 focus-visible:outline-primary",
                isActive
                  ? "border border-slate-200/95 bg-white font-bold text-slate-900 shadow-2xs before:absolute before:inset-x-2 before:-top-[1px] before:h-[2.5px] before:rounded-full before:bg-primary"
                  : "border border-transparent bg-slate-50/55 font-medium text-slate-600 hover:border-slate-200/70 hover:bg-slate-100/90 hover:text-slate-900"
              )}
            >
              <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400 group-hover:text-slate-600")}>
                {spec.icon}
              </span>
              <span
                className={cn(
                  "truncate",
                  isActive ? "max-w-[180px] sm:max-w-[240px]" : "max-w-[92px] sm:max-w-[112px]"
                )}
              >
                {spec.label}
              </span>
              {canClose && (
                <button
                  type="button"
                  aria-label={`${tr("Đóng tab")} ${spec.label}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    closeTab(spec.id);
                  }}
                  className={cn(
                    "ml-0.5 grid size-4 shrink-0 place-items-center rounded-sm transition-colors hover:bg-slate-200/80 hover:text-slate-900",
                    isActive
                      ? "text-slate-400"
                      : "text-slate-400 opacity-70 group-hover:opacity-100"
                  )}
                >
                  <X size={11.5} />
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* Right scroll arrow (visible when overflowing right) */}
      {canScrollRight && (
        <button
          type="button"
          aria-label={tr("Cuộn dải tab sang phải")}
          onClick={() => stripRef.current?.scrollBy({ left: 220, behavior: "smooth" })}
          className="grid size-7 shrink-0 place-items-center rounded-md text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <ChevronRight size={14} />
        </button>
      )}

      {/* Right tab counter & manager dropdown matching "10 v" in reference UI */}
      <div ref={menuRef} className="relative flex shrink-0 items-center border-l border-slate-200 pl-1.5">
        <button
          type="button"
          data-no-i18n="true"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          aria-label={tr("Quản lý danh sách tab đang mở")}
          onClick={() => setMenuOpen((v) => !v)}
          className={cn(
            "inline-flex h-7 items-center gap-1 rounded-md px-2 text-xs font-bold tabular-nums transition-colors",
            menuOpen ? "bg-primary/10 text-primary" : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
          )}
        >
          <span>{openSpecs.length}</span>
          <ChevronDown size={13} className={cn("transition-transform", menuOpen && "rotate-180")} />
        </button>

        {menuOpen && (
          <div
            role="menu"
            className="panel-modal absolute right-0 top-9 z-50 w-68 overflow-hidden p-1.5 fade-in"
          >
            <div className="px-2.5 py-1.5 text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
              {tr("Trang đang mở")} ({openSpecs.length})
            </div>
            <div className="max-h-64 space-y-0.5 overflow-y-auto">
              {openSpecs.map((spec) => {
                const isActive = spec.id === activeId;
                return (
                  <div
                    key={spec.id}
                    className={cn(
                      "flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors",
                      isActive ? "bg-primary/8 font-bold text-primary" : "text-slate-700 hover:bg-slate-50"
                    )}
                  >
                    <button
                      type="button"
                      onClick={() => activateTab(spec)}
                      className="flex min-w-0 flex-1 items-center gap-2 text-left"
                    >
                      <span className={cn("shrink-0", isActive ? "text-primary" : "text-slate-400")}>
                        {spec.icon}
                      </span>
                      <div className="min-w-0">
                        <p className="truncate">{spec.label}</p>
                        <p className="truncate text-[10px] font-normal text-slate-400">{spec.groupLabel}</p>
                      </div>
                    </button>
                    {openSpecs.length > 1 && (
                      <button
                        type="button"
                        aria-label={`${tr("Đóng tab")} ${spec.label}`}
                        onClick={() => closeTab(spec.id)}
                        className="rounded p-1 text-slate-400 hover:bg-slate-200/70 hover:text-slate-800"
                      >
                        <X size={12} />
                      </button>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1.5">
              <button
                type="button"
                onClick={resetStarterTabs}
                className="flex w-full items-center gap-2 rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                <RotateCcw size={13} className="text-primary" /> {tr("Khôi phục bộ tab quản lý chuẩn")}
              </button>
              <button
                type="button"
                onClick={closeOtherTabs}
                className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-slate-700 hover:bg-slate-100"
              >
                {tr("Đóng các tab khác")}
              </button>
              <button
                type="button"
                onClick={closeAllToOverview}
                className="flex w-full items-center rounded-md px-2.5 py-1.5 text-left text-xs font-medium text-destructive hover:bg-destructive/10"
              >
                {tr("Thu gọn về Tổng quan")}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Floating dark tooltip below hovered tab matching reference screenshot */}
      {isClient &&
        hoveredTip &&
        createPortal(
          <div
            role="tooltip"
            style={{
              left: `${Math.min(Math.max(hoveredTip.x, 56), window.innerWidth - 56)}px`,
              top: `${hoveredTip.y}px`,
            }}
            className="pointer-events-none fixed z-[80] -translate-x-1/2 rounded-md bg-slate-800 px-2.5 py-1 text-[11px] font-semibold whitespace-nowrap text-white shadow-lg"
          >
            <span className="absolute -top-1 left-1/2 size-2 -translate-x-1/2 rotate-45 bg-slate-800" />
            <span className="relative">{hoveredTip.label}</span>
          </div>,
          document.body
        )}
    </div>
  );
}
