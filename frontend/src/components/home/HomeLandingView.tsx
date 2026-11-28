"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { qk } from "@/lib/api/query-keys";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { apiModel } from "@/lib/api";
import { useI18n } from "@/providers/I18nContext";
import { AuthModal, AuthModalMode } from "@/components/auth/AuthModal";
import { SmartAuthPrompt } from "@/components/auth/SmartAuthPrompt";
import { SystemGlobalBanner } from "@/components/layout/SystemGlobalBanner";
import { HomeHeaderHero } from "./HomeHeaderHero";
import { HomeClubsEventsSections } from "./HomeClubsEventsSections";
import { HomeWorkspaceShowcase } from "./HomeWorkspaceShowcase";
import { HomeCampusLifeSection } from "./HomeCampusLifeSection";
import { HomeOnboardingFooter } from "./HomeOnboardingFooter";

export function HomeLandingView({ initialAuthMode }: { initialAuthMode?: AuthModalMode } = {}) {
  return (
    <Suspense fallback={<main className="min-h-svh bg-background" />}>
      <HomeLandingContent initialAuthMode={initialAuthMode} />
    </Suspense>
  );
}

function HomeLandingContent({ initialAuthMode }: { initialAuthMode?: AuthModalMode }) {
  const { tr } = useI18n();
  const session = useOptionalSession();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth") ?? initialAuthMode ?? null;

  const clubsQuery = useQuery({
    queryKey: qk.home("public-clubs"),
    queryFn: () => apiModel.publicClubs("", "", 0, 24),
    retry: 1,
  });
  const eventsQuery = useQuery({
    queryKey: qk.home("public-events"),
    queryFn: () => apiModel.publicEvents(0, 12),
    retry: 1,
  });
  const categoriesQuery = useQuery({
    queryKey: qk.home("public-club-categories"),
    queryFn: () => apiModel.publicClubCategories(),
    retry: 1,
  });

  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [selectedCategory, setSelectedCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const allClubs = useMemo(() => clubsQuery.data?.items ?? [], [clubsQuery.data?.items]);
  const categories = categoriesQuery.data ?? [];
  const featuredEvents = useMemo(() => eventsQuery.data?.items ?? [], [eventsQuery.data?.items]);

  const featuredClubs = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return allClubs.filter((club) => {
      if (selectedCategory && club.activityField !== selectedCategory) return false;
      if (!q) return true;
      const fieldRaw = club.activityField ?? "";
      const descRaw = club.description ?? "";
      return (
        club.name.toLowerCase().includes(q) ||
        tr(club.name).toLowerCase().includes(q) ||
        club.code.toLowerCase().includes(q) ||
        fieldRaw.toLowerCase().includes(q) ||
        tr(fieldRaw).toLowerCase().includes(q) ||
        descRaw.toLowerCase().includes(q) ||
        tr(descRaw).toLowerCase().includes(q)
      );
    });
  }, [allClubs, searchQuery, selectedCategory, tr]);

  const ctvEventsCount = useMemo(
    () => featuredEvents.filter((ev) => ev.allowCtv).length,
    [featuredEvents]
  );

  const urlAuthMode: AuthModalMode | null =
    session.settled && !session.user && (authParam === "login" || authParam === "register")
      ? authParam
      : null;
  const effectiveModalOpen = !session.user && (authModalOpen || urlAuthMode !== null);
  const effectiveModalMode: AuthModalMode = authModalOpen ? authModalMode : (urlAuthMode ?? "login");

  useEffect(() => {
    if (session.settled && session.user && authParam) {
      router.replace("/dashboard");
    }
  }, [authParam, router, session.settled, session.user]);

  const openAuthModal = (mode: AuthModalMode) => {
    setMenuOpen(false);
    setAuthModalMode(mode);
    setAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setAuthModalOpen(false);
    if (authParam && !session.user && !queryClient.getQueryData(qk.optionalMe())) {
      router.replace("/home", { scroll: false });
    }
  };

  const signOut = async () => {
    const { clearChatMessageCache } = await import("@/lib/chat-message-cache");
    clearChatMessageCache();
    await apiModel.logout().catch(() => undefined);
    queryClient.setQueryData(qk.optionalMe(), null);
    queryClient.setQueryData(qk.me(), null);
    queryClient.clear();
    router.replace("/home");
  };

  return (
    <main id="top" className="min-h-svh overflow-x-clip bg-background text-foreground">
      <SystemGlobalBanner
        isAdmin={Boolean(session.user && session.can("system.settings.manage"))}
        showPublicMaintenance
      />
      <div data-no-i18n="true">
        <HomeHeaderHero
          user={session.user}
          totalClubs={clubsQuery.data?.total}
          totalEvents={eventsQuery.data?.total}
          ctvEventsCount={ctvEventsCount}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          openAuthModal={openAuthModal}
          signOut={signOut}
        />

        <HomeClubsEventsSections
          allClubs={allClubs}
          featuredClubs={featuredClubs}
          categories={categories}
          selectedCategory={selectedCategory}
          setSelectedCategory={setSelectedCategory}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
          totalClubs={clubsQuery.data?.total}
          clubsPending={clubsQuery.isPending}
          clubsError={clubsQuery.isError ? clubsQuery.error : null}
          featuredEvents={featuredEvents}
          eventsPending={eventsQuery.isPending}
        />

        <HomeWorkspaceShowcase
          clubs={allClubs}
          events={featuredEvents}
          user={session.user}
          openAuthModal={openAuthModal}
        />

        <HomeCampusLifeSection />

        <HomeOnboardingFooter user={session.user} openAuthModal={openAuthModal} />

        <SmartAuthPrompt
          authenticated={!!session.user}
          settled={session.settled}
          modalOpen={effectiveModalOpen}
          onOpenAuth={openAuthModal}
        />
      </div>
      <AuthModal open={effectiveModalOpen} initialMode={effectiveModalMode} onClose={closeAuthModal} />
    </main>
  );
}
