import { ReactNode } from "react";
import {
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

export const STARTER_PRIORITY = [
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

export function iconForTab(href: string, tab?: string, tier?: string): ReactNode {
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

export const emptySubscribe = () => () => {};
export const TABS_SYNC_EVENT = "vju-workspace-tabs-sync";

export function subscribeWorkspaceTabs(onStoreChange: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener("storage", onStoreChange);
  window.addEventListener(TABS_SYNC_EVENT, onStoreChange);
  return () => {
    window.removeEventListener("storage", onStoreChange);
    window.removeEventListener(TABS_SYNC_EVENT, onStoreChange);
  };
}
