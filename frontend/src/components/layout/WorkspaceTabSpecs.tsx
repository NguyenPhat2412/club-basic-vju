import { ReactNode } from "react";
import {
  Award,
  BarChart3,
  Bell,
  Building2,
  CalendarCheck2,
  ClipboardCheck,
  ClipboardList,
  Compass,
  FileSpreadsheet,
  FileText,
  FolderArchive,
  History,
  Layers,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Settings,
  ShieldCheck,
  SlidersHorizontal,
  UserCircle,
  Users,
  UsersRound,
} from "lucide-react";

export type WorkspaceTabSpec = {
  id: string;
  label: string;
  groupLabel: string;
  href: string;
  tab?: string;
  tier?: "club" | "system";
  icon: ReactNode;
};

export const STARTER_PRIORITY = ["route:/dashboard"];

export function iconForTab(href: string, tab?: string, tier?: string): ReactNode {
  if (tab === "clubs") return <Building2 size={13.5} />;
  if (tab === "overview") return <BarChart3 size={13.5} />;
  if (tab === "applications") return <ClipboardList size={13.5} />;
  if (tab === "forms") return <FileSpreadsheet size={13.5} />;
  if (tab === "members") return <UsersRound size={13.5} />;
  if (tab === "departments") return <Layers size={13.5} />;
  if (tab === "events") return <CalendarCheck2 size={13.5} />;
  if (tab === "certificates") return <Award size={13.5} />;
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
  if (href === "/documents") return <FileText size={13.5} />;
  if (href === "/notifications?tab=campaigns" || tab === "campaigns") return <Megaphone size={13.5} />;
  if (href === "/notifications") return <Bell size={13.5} />;
  if (href === "/profile") return <UserCircle size={13.5} />;
  return <Compass size={13.5} />;
}

export function resolveTabId(pathname: string, currentTab: string | null, _currentTier?: string | null): string {
  void _currentTier;
  if (pathname === "/management") {
    return `mgmt:${currentTab || "clubs"}`;
  }
  if (pathname === "/notifications" && currentTab === "campaigns") {
    return "route:/notifications:campaigns";
  }
  if (pathname === "/documents") {
    return "route:/documents";
  }
  return `route:${pathname}`;
}

export const emptySubscribe = () => () => {};
export const TABS_SYNC_EVENT = "vju-workspace-tabs-sync";

export function workspaceTabsStorageKey(userId?: string): string {
  return `vju.workspace.tabs.v2:${userId || "guest"}`;
}

export function parseStoredTabIds(raw: string | null): string[] | null {
  if (raw === null) return null;
  try {
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter((x): x is string => typeof x === "string");
    }
  } catch {
    // ignore invalid JSON
  }
  return null;
}

export function resolveTabIdFromHref(href: string): string | null {
  const trimmed = href.trim();
  if (!trimmed || !trimmed.startsWith("/") || trimmed === "/home") return null;
  try {
    const url = new URL(trimmed, "http://vju.local");
    return resolveTabId(url.pathname, url.searchParams.get("tab"), url.searchParams.get("tier"));
  } catch {
    return null;
  }
}

export function writeWorkspaceTabIds(storageKey: string, next: string[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(storageKey, JSON.stringify(next));
    window.dispatchEvent(new Event(TABS_SYNC_EVENT));
  } catch {
    // ignore storage errors
  }
}

export function ensureWorkspaceTabOpen(storageKey: string, tabId: string, currentRouteTabId?: string) {
  if (typeof window === "undefined" || !tabId) return;
  try {
    const current = parseStoredTabIds(window.localStorage.getItem(storageKey));
    if (current !== null && current.length === 0 && currentRouteTabId && currentRouteTabId !== tabId) {
      recordPendingTabClose(currentRouteTabId, tabId);
    } else {
      clearPendingTabClose();
    }
    if (current === null) {
      writeWorkspaceTabIds(storageKey, [tabId]);
      return;
    }
    if (!current.includes(tabId)) {
      writeWorkspaceTabIds(storageKey, [...current, tabId]);
    }
  } catch {
    // ignore storage errors
  }
}

export type PendingTabClose = {
  closedIds: string[];
  targetId: string;
  expiresAt: number;
};

let pendingCloseState: PendingTabClose | null = null;

export function recordPendingTabClose(closedId: string, targetId: string, ttlMs = 5_000) {
  const now = Date.now();
  const prev = pendingCloseState && now < pendingCloseState.expiresAt ? pendingCloseState.closedIds : [];
  const nextClosed = prev.includes(closedId) ? prev : [...prev, closedId];
  pendingCloseState = {
    closedIds: nextClosed.filter((id) => id !== targetId),
    targetId,
    expiresAt: now + ttlMs,
  };
}

export function getActivePendingTabClose(now = Date.now()): PendingTabClose | null {
  if (!pendingCloseState) return null;
  if (now >= pendingCloseState.expiresAt) {
    pendingCloseState = null;
    return null;
  }
  return pendingCloseState;
}

export function clearPendingTabClose() {
  pendingCloseState = null;
}

export function resolveEffectiveActiveTabId(
  rawActiveId: string,
  pending: PendingTabClose | null,
): string {
  if (pending && pending.closedIds.includes(rawActiveId)) {
    return pending.targetId;
  }
  return rawActiveId;
}

export function computeOpenTabIds({
  storedIds,
  defaultStarterIds,
  catalogIds,
  rawActiveId,
  pending,
}: {
  storedIds: string[] | null;
  defaultStarterIds: string[];
  catalogIds: ReadonlySet<string>;
  rawActiveId: string;
  pending: PendingTabClose | null;
}): string[] {
  // Explicit empty array means the user closed all tabs (Google/IDE empty workspace mode)
  if (storedIds !== null && storedIds.length === 0) {
    return [];
  }
  const effectiveActiveId = resolveEffectiveActiveTabId(rawActiveId, pending);
  const blocked = pending && pending.closedIds.includes(rawActiveId) ? new Set(pending.closedIds) : null;
  const base = storedIds && storedIds.length > 0 ? storedIds : defaultStarterIds;
  const valid = base.filter((id) => catalogIds.has(id) && !blocked?.has(id));
  const ensured = valid.length > 0 ? [...valid] : defaultStarterIds.filter((id) => !blocked?.has(id));
  if (catalogIds.has(effectiveActiveId) && !ensured.includes(effectiveActiveId)) {
    ensured.push(effectiveActiveId);
  }
  return ensured;
}

export function computeNextPersistedTabIds({
  storedIds,
  defaultStarterIds,
  catalogIds,
  rawActiveId,
}: {
  storedIds: string[] | null;
  defaultStarterIds: string[];
  catalogIds: ReadonlySet<string>;
  rawActiveId: string;
}): string[] | null {
  if (!catalogIds.has(rawActiveId)) return null;
  // Never auto-resurrect tabs while user intentionally closed all tabs
  if (storedIds !== null && storedIds.length === 0) return null;
  if (storedIds && storedIds.length > 0) {
    return storedIds.includes(rawActiveId) ? null : [...storedIds, rawActiveId];
  }
  const initial = defaultStarterIds.filter((id) => catalogIds.has(id));
  if (!initial.includes(rawActiveId)) {
    initial.push(rawActiveId);
  }
  return initial.length > 0 ? initial : [rawActiveId];
}

export function computeCloseTabTransition({
  openIds,
  closingId,
  effectiveActiveId,
}: {
  openIds: string[];
  closingId: string;
  effectiveActiveId: string;
}): { nextIds: string[]; nextActiveId: string | null } | null {
  if (openIds.length === 0 || !openIds.includes(closingId)) return null;
  const idx = openIds.indexOf(closingId);
  const nextIds = openIds.filter((item) => item !== closingId);
  if (nextIds.length === 0) {
    return { nextIds: [], nextActiveId: null };
  }
  if (closingId !== effectiveActiveId) {
    return { nextIds, nextActiveId: null };
  }
  const fallbackId = nextIds[Math.min(idx, nextIds.length - 1)] ?? nextIds[0] ?? null;
  return { nextIds, nextActiveId: fallbackId };
}

export function subscribeWorkspaceTabs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(TABS_SYNC_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(TABS_SYNC_EVENT, onStoreChange);
  };
}
