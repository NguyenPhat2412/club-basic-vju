"use client";

import { Suspense, useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter, useSearchParams } from "next/navigation";
import { useOptionalSession } from "@/hooks/useOptionalSession";
import { apiModel } from "@/lib/api";
import { useI18n } from "@/providers/I18nContext";
import { AuthModal, AuthModalMode } from "@/components/auth/AuthModal";
import { SmartAuthPrompt } from "@/components/auth/SmartAuthPrompt";
import { HomeHeaderHero } from "./HomeHeaderHero";
import { HomeClubsEventsSections } from "./HomeClubsEventsSections";
import { HomeOnboardingFooter } from "./HomeOnboardingFooter";

export function HomeLandingView({ initialAuthMode }: { initialAuthMode?: AuthModalMode } = {}) {
  return (
    <Suspense fallback={<main className="min-h-screen bg-slate-50" />}>
      <HomeLandingContent initialAuthMode={initialAuthMode} />
    </Suspense>
  );
}

function HomeLandingContent({ initialAuthMode }: { initialAuthMode?: AuthModalMode }) {
  useI18n();
  const session = useOptionalSession();
  const searchParams = useSearchParams();
  const authParam = searchParams.get("auth") ?? initialAuthMode ?? null;
  const clubsQuery = useQuery({
    queryKey: ["home", "public-clubs"],
    queryFn: () => apiModel.publicClubs("", "", 0, 12),
    retry: 1,
  });
  const eventsQuery = useQuery({
    queryKey: ["home", "public-events"],
    queryFn: () => apiModel.publicEvents(0, 6),
    retry: 1,
  });
  const router = useRouter();
  const queryClient = useQueryClient();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<AuthModalMode>("login");
  const [selectedCategory, setSelectedCategory] = useState<string>("");

  const categoriesQuery = useQuery({
    queryKey: ["home", "public-club-categories"],
    queryFn: () => apiModel.publicClubCategories(),
    retry: 1,
  });

  const allClubs = clubsQuery.data?.items ?? [];
  const categories = categoriesQuery.data ?? [];
  const featuredClubs = selectedCategory
    ? allClubs.filter((club) => club.activityField === selectedCategory)
    : allClubs;
  const featuredEvents = eventsQuery.data?.items ?? [];

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
    if (authParam && !session.user && !queryClient.getQueryData(["optional-me"])) {
      router.replace("/home", { scroll: false });
    }
  };

  const signOut = async () => {
    await apiModel.logout().catch(() => undefined);
    queryClient.setQueryData(["optional-me"], null);
    queryClient.setQueryData(["me"], null);
    queryClient.clear();
    router.replace("/home");
  };

  return (
    <main className="min-h-screen overflow-x-hidden bg-slate-50 text-slate-900">
      <HomeHeaderHero
        user={session.user}
        totalClubs={clubsQuery.data?.total}
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
        totalClubs={clubsQuery.data?.total}
        clubsPending={clubsQuery.isPending}
        clubsError={clubsQuery.isError ? clubsQuery.error : null}
        featuredEvents={featuredEvents}
        eventsPending={eventsQuery.isPending}
      />

      <HomeOnboardingFooter user={session.user} openAuthModal={openAuthModal} />

      <SmartAuthPrompt
        authenticated={!!session.user}
        settled={session.settled}
        modalOpen={effectiveModalOpen}
        onOpenAuth={openAuthModal}
      />
      <AuthModal open={effectiveModalOpen} initialMode={effectiveModalMode} onClose={closeAuthModal} />
    </main>
  );
}
