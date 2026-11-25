"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ReactNode, Suspense, useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { authApi } from "@/api/auth/auth.api";
import { buildNavigationSections, resolveActiveNavMeta } from "@/config/navigation";
import {
  useGlobalRealtimeNotifications,
  useUnreadNotificationSummary,
} from "@/hooks/notification/useGlobalRealtimeNotifications";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { useI18n } from "@/providers/I18nContext";
import { AuthModal, AuthModalMode } from "@/components/auth/AuthModal";
import { SmartAuthPrompt } from "@/components/auth/SmartAuthPrompt";
import { ChangePasswordModal } from "./ChangePasswordModal";
import { FirstLoginPassword } from "./FirstLoginPassword";
import { SidebarNav } from "./SidebarNav";
import { Topbar } from "./Topbar";
import { WorkspaceEmptyState } from "./WorkspaceEmptyState";
import { WorkspaceTabBar } from "./WorkspaceTabBar";
import {
  ensureWorkspaceTabOpen,
  parseStoredTabIds,
  resolveTabId,
  resolveTabIdFromHref,
  subscribeWorkspaceTabs,
  workspaceTabsStorageKey,
} from "./WorkspaceTabSpecs";

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
  const currentTier = searchParams.get("tier");
  const authParam = searchParams.get("auth");
  const router = useRouter();
  const queryClient = useQueryClient();
  const session = useOptionalSession();
  const { locale, tr } = useI18n();
  const tabsStorageKey = workspaceTabsStorageKey(session.user?.id);
  const rawStoredTabs = useSyncExternalStore(
    subscribeWorkspaceTabs,
    () => {
      try {
        return window.localStorage.getItem(tabsStorageKey);
      } catch {
        return null;
      }
    },
    () => null
  );
  const parsedStoredTabs = parseStoredTabIds(rawStoredTabs);
  const isWorkspaceEmpty = Boolean(
    session.user && !session.mustChangePassword && parsedStoredTabs !== null && parsedStoredTabs.length === 0
  );

  const handleOpenHref = useCallback(
    (href: string) => {
      const tabId = resolveTabIdFromHref(href);
      if (tabId) {
        const currentRouteTabId = resolveTabId(pathname, currentTab, currentTier);
        ensureWorkspaceTabOpen(tabsStorageKey, tabId, currentRouteTabId);
      }
    },
    [currentTab, currentTier, pathname, tabsStorageKey]
  );

  const publicClubRoute =
    pathname === "/clubs" || pathname.startsWith("/clubs/") || pathname === "/events";
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [closedSections, setClosedSections] = useState<Set<string>>(new Set());
  const [closedGroups, setClosedGroups] = useState<Set<string>>(new Set());
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");

  useEffect(() => {
    if (session.settled && !session.user && !publicClubRoute) {
      router.replace("/home?auth=login");
    }
  }, [publicClubRoute, router, session.settled, session.user]);

  const urlAuthMode: AuthModalMode | null =
    session.settled && !session.user && (authParam === "login" || authParam === "register")
      ? authParam
      : null;
  const effectiveModalOpen = !session.user && (authModalOpen || urlAuthMode !== null);
  const effectiveModalMode: AuthModalMode = authModalOpen ? authModalMode : (urlAuthMode ?? "login");

  useEffect(() => {
    if (session.settled && session.user && authParam) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("auth");
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  }, [authParam, pathname, router, searchParams, session.settled, session.user]);

  const openAuthModal = (mode: AuthModalMode) => {
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    if (authParam) {
      const nextParams = new URLSearchParams(searchParams.toString());
      nextParams.delete("auth");
      const query = nextParams.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }
  };

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

  const sections = buildNavigationSections({
    authenticated: Boolean(session.user),
    mustChangePassword: Boolean(session.mustChangePassword),
    can: session.can,
    hasGlobal: session.hasGlobal,
  });

  const activeNavMeta = resolveActiveNavMeta(sections, pathname, currentTab, currentTier);
  const canManageWorkspace = sections.some((s) =>
    s.groups.some((g) => g.items.some((i) => i.href.startsWith("/management")))
  );
  const realtimeReady = Boolean(session.user && !session.mustChangePassword);
  useGlobalRealtimeNotifications({
    enabled: realtimeReady,
    currentUserId: session.user?.id,
  });
  const unreadSummary = useUnreadNotificationSummary(realtimeReady);

  const signOut = async () => {
    await queryClient.cancelQueries();
    const { clearChatMessageCache } = await import("@/lib/chat-message-cache");
    clearChatMessageCache();
    queryClient.setQueryData(qk.optionalMe(), null);
    queryClient.setQueryData(qk.me(), null);
    queryClient.removeQueries({ queryKey: qk.me("permissions") });
    queryClient.removeQueries({ queryKey: qk.optionalMe("permissions") });
    await authApi.logout().catch(() => undefined);
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

  return (
    <div className="flex h-svh min-h-0 w-full overflow-hidden bg-background text-foreground">
      <div className="hidden h-full shrink-0 lg:block">
        <SidebarNav
          collapsed={collapsed}
          onToggleCollapsed={() => setCollapsed((v) => !v)}
          onCloseMobile={() => setMobileOpen(false)}
          sections={sections}
          closedSections={closedSections}
          closedGroups={closedGroups}
          onToggleSection={toggleSection}
          onToggleGroup={toggleGroup}
          pathname={isWorkspaceEmpty ? "" : pathname}
          currentTab={isWorkspaceEmpty ? null : currentTab}
          currentTier={isWorkspaceEmpty ? null : currentTier}
          user={session.user}
          mustChangePassword={session.mustChangePassword}
          unreadSummary={unreadSummary.data}
          onSignOut={signOut}
          onOpenHref={handleOpenHref}
        />
      </div>

      {mobileOpen && (
        <div
          className="fixed inset-0 z-50 flex bg-black/50 backdrop-blur-2xs lg:hidden"
          onClick={() => setMobileOpen(false)}
        >
          <div className="h-full" onClick={(e) => e.stopPropagation()}>
            <SidebarNav
              isMobile
              collapsed={collapsed}
              onToggleCollapsed={() => setCollapsed((v) => !v)}
              onCloseMobile={() => setMobileOpen(false)}
              sections={sections}
              closedSections={closedSections}
              closedGroups={closedGroups}
              onToggleSection={toggleSection}
              onToggleGroup={toggleGroup}
              pathname={isWorkspaceEmpty ? "" : pathname}
              currentTab={isWorkspaceEmpty ? null : currentTab}
              currentTier={isWorkspaceEmpty ? null : currentTier}
              user={session.user}
              mustChangePassword={session.mustChangePassword}
              unreadSummary={unreadSummary.data}
              onSignOut={signOut}
              onOpenHref={handleOpenHref}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <Topbar
          groupLabel={isWorkspaceEmpty ? tr("Không gian làm việc") : activeNavMeta.groupLabel}
          pageTitle={isWorkspaceEmpty ? tr("Bắt đầu nhanh") : activeNavMeta.pageTitle}
          pathname={isWorkspaceEmpty ? "" : pathname}
          sections={sections}
          canManageWorkspace={canManageWorkspace}
          onMenu={() => setMobileOpen(true)}
          authenticated={!!session.user}
          name={session.user?.fullName || session.user?.email}
          subtitle={session.user?.studentCode || session.user?.email}
          onPassword={() => setPasswordOpen(true)}
          onProfile={() => {
            handleOpenHref("/profile");
            router.push("/profile");
          }}
          onSignOut={signOut}
          onLogin={() => openAuthModal("login")}
          onRegister={() => openAuthModal("register")}
          notificationsActive={!isWorkspaceEmpty && pathname === "/notifications"}
          onOpenHref={handleOpenHref}
        />

        {!session.mustChangePassword && (session.user || publicClubRoute) && (
          <WorkspaceTabBar
            sections={sections}
            pathname={pathname}
            currentTab={currentTab}
            currentTier={currentTier}
            authenticated={Boolean(session.user)}
            userId={session.user?.id}
          />
        )}

        <main
          key={locale}
          data-design-system="admin-v1"
          className="@container workspace-canvas flex min-h-0 min-w-0 flex-1 flex-col overflow-x-hidden overflow-y-auto"
        >
          {session.user && session.mustChangePassword ? (
            <FirstLoginPassword email={session.user.email} />
          ) : isWorkspaceEmpty ? (
            <WorkspaceEmptyState
              sections={sections}
              userName={session.user?.fullName || session.user?.email}
              onOpenShortcut={(href) => {
                handleOpenHref(href);
                router.push(href);
              }}
            />
          ) : session.user || publicClubRoute ? (
            children
          ) : null}
        </main>
      </div>

      <ChangePasswordModal open={passwordOpen} onClose={() => setPasswordOpen(false)} />
      <SmartAuthPrompt
        authenticated={!!session.user}
        settled={session.settled}
        modalOpen={effectiveModalOpen}
        onOpenAuth={openAuthModal}
      />
      <AuthModal
        open={effectiveModalOpen}
        initialMode={effectiveModalMode}
        onClose={closeAuthModal}
        onSuccessRedirect={null}
      />
    </div>
  );
}
