"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, ChevronLeft, ChevronRight } from "lucide-react";
import type { NavSection } from "@/config/navigation";
import { cn } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import { WorkspaceTabItem } from "./WorkspaceTabItem";
import { WorkspaceTabMenu } from "./WorkspaceTabMenu";
import {
  clearPendingTabClose,
  computeCloseTabTransition,
  computeOpenTabIds,
  emptySubscribe,
  getActivePendingTabClose,
  iconForTab,
  recordPendingTabClose,
  resolveEffectiveActiveTabId,
  resolveTabId,
  STARTER_PRIORITY,
  subscribeWorkspaceTabs,
  TABS_SYNC_EVENT,
  type WorkspaceTabSpec,
} from "./WorkspaceTabSpecs";

export { resolveTabId };
export type { WorkspaceTabSpec };

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

  const storageKey = `vju.workspace.tabs.v2:${userId || "guest"}`;
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
      map.set("route:/dashboard", { id: "route:/dashboard", label: tr("Tổng quan"), groupLabel: tr("Bảng điều khiển"), href: "/dashboard", icon: iconForTab("/dashboard") });
    }
    for (const sec of sections) {
      for (const grp of sec.groups) {
        for (const item of grp.items) {
          const id = item.tab ? `mgmt:${item.tab}` : item.tier ? `docs:${item.tier}` : `route:${item.href}`;
          if (!map.has(id)) {
            map.set(id, { id, label: tr(item.label), groupLabel: tr(grp.label), href: item.href, tab: item.tab, tier: item.tier, icon: iconForTab(item.href, item.tab, item.tier) });
          }
        }
      }
    }
    if (authenticated && !map.has("route:/documents")) {
      map.set("route:/documents", { id: "route:/documents", label: tr("Tài liệu & Quy chế"), groupLabel: tr("Hoạt động & Tài liệu"), href: "/documents", icon: iconForTab("/documents") });
    }
    return map;
  }, [authenticated, sections, tr]);

  const rawActiveId = resolveTabId(pathname, currentTab, currentTier);
  const pendingClose = getActivePendingTabClose();
  const activeId = resolveEffectiveActiveTabId(rawActiveId, pendingClose);
  const catalogIds = useMemo(() => new Set(catalog.keys()), [catalog]);

  const defaultStarterIds = useMemo(() => {
    const picked = STARTER_PRIORITY.filter((id) => catalog.has(id)).slice(0, 2);
    if (catalog.has(activeId) && !picked.includes(activeId)) {
      picked.push(activeId);
    }
    return picked.length > 0 ? picked : Array.from(catalog.keys()).slice(0, 1);
  }, [activeId, catalog]);

  const openIds = useMemo(
    () =>
      computeOpenTabIds({
        storedIds,
        defaultStarterIds,
        catalogIds,
        rawActiveId,
        pending: pendingClose,
      }),
    [catalogIds, defaultStarterIds, pendingClose, rawActiveId, storedIds],
  );

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

  // Sync newly visited active tab to external localStorage (ignoring tabs currently closing in flight)
  useEffect(() => {
    const inFlight = getActivePendingTabClose();
    if (inFlight) {
      if (!inFlight.closedIds.includes(rawActiveId)) {
        clearPendingTabClose();
      } else {
        return;
      }
    }
    if (!isClient || !catalog.has(rawActiveId)) return;
    if (storedIds && !storedIds.includes(rawActiveId)) {
      persistIds([...storedIds, rawActiveId]);
    } else if (!storedIds && !defaultStarterIds.includes(rawActiveId)) {
      persistIds([...defaultStarterIds, rawActiveId]);
    }
  }, [catalog, defaultStarterIds, isClient, persistIds, rawActiveId, storedIds]);

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
    clearPendingTabClose();
    setHoveredTip(null);
    setMenuOpen(false);
    router.push(buildHref(spec));
  };

  const closeTab = (id: string) => {
    const transition = computeCloseTabTransition({
      openIds,
      closingId: id,
      effectiveActiveId: activeId,
    });
    if (!transition) return;
    setHoveredTip(null);
    if (transition.nextActiveId) {
      recordPendingTabClose(id, transition.nextActiveId);
    }
    persistIds(transition.nextIds);
    if (transition.nextActiveId) {
      const fallbackSpec = catalog.get(transition.nextActiveId);
      if (fallbackSpec) {
        router.push(buildHref(fallbackSpec));
      }
    }
  };

  const closeOtherTabs = () => {
    clearPendingTabClose();
    const keep = catalog.has(activeId) ? [activeId] : openIds.slice(0, 1);
    persistIds(keep);
    setMenuOpen(false);
  };

  const closeAllToOverview = () => {
    const fallback = catalog.has("route:/dashboard")
      ? "route:/dashboard"
      : (Array.from(catalog.keys())[0] ?? activeId);
    if (fallback !== rawActiveId) {
      recordPendingTabClose(rawActiveId, fallback);
    } else {
      clearPendingTabClose();
    }
    persistIds([fallback]);
    setMenuOpen(false);
    const spec = catalog.get(fallback);
    if (spec && fallback !== rawActiveId) {
      router.push(buildHref(spec));
    }
  };

  const resetStarterTabs = () => {
    clearPendingTabClose();
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
            <WorkspaceTabItem
              key={spec.id}
              spec={spec}
              isActive={isActive}
              canClose={canClose}
              tabRef={(el) => {
                tabRefs.current[spec.id] = el;
              }}
              activateTab={activateTab}
              closeTab={closeTab}
              setHoveredTip={setHoveredTip}
            />
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
          <WorkspaceTabMenu
            openSpecs={openSpecs}
            activeId={activeId}
            activateTab={activateTab}
            closeTab={closeTab}
            resetStarterTabs={resetStarterTabs}
            closeOtherTabs={closeOtherTabs}
            closeAllToOverview={closeAllToOverview}
          />
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
