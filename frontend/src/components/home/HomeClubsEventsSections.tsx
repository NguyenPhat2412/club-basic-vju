"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Search, X } from "lucide-react";
import { describeError } from "@/components/shared/ListPage";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { isYouthUnion } from "@/lib/club/youth-union";
import { ClubItem, EventItem } from "@/types";
import { DbText, formatLocalizedCopy } from "./DbText";
import { HomeClubCard } from "./HomeClubCard";
import { HomeClubPreviewDialog } from "./HomeClubPreviewDialog";
import { HomeEventsSection } from "./HomeEventsSection";
import { HomeYouthUnionSpotlight } from "./HomeYouthUnionSpotlight";

interface HomeClubsEventsSectionsProps {
  allClubs: ClubItem[];
  featuredClubs: ClubItem[];
  categories: string[];
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  searchQuery: string;
  setSearchQuery: (q: string) => void;
  totalClubs?: number;
  clubsPending: boolean;
  clubsError: unknown;
  featuredEvents: EventItem[];
  eventsPending: boolean;
}

export function HomeClubsEventsSections({
  allClubs,
  featuredClubs,
  categories,
  selectedCategory,
  setSelectedCategory,
  searchQuery,
  setSearchQuery,
  totalClubs,
  clubsPending,
  clubsError,
  featuredEvents,
  eventsPending,
}: HomeClubsEventsSectionsProps) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];
  const [previewClub, setPreviewClub] = useState<ClubItem | null>(null);

  useEffect(() => {
    if (!previewClub) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewClub(null);
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [previewClub]);

  const eventsByClubId = useMemo(() => {
    const map = new Map<string, EventItem[]>();
    for (const ev of featuredEvents) {
      const list = map.get(ev.clubId) ?? [];
      list.push(ev);
      map.set(ev.clubId, list);
    }
    return map;
  }, [featuredEvents]);

  const hasClubFilter = selectedCategory !== "" || searchQuery.trim() !== "";
  const youthUnionClub = useMemo(() => allClubs.find((c) => isYouthUnion(c)) ?? null, [allClubs]);
  const regularFeaturedClubs = useMemo(
    () => (hasClubFilter ? featuredClubs : featuredClubs.filter((c) => !isYouthUnion(c))),
    [featuredClubs, hasClubFilter],
  );

  return (
    <>
      <section className="mx-auto max-w-[1380px] scroll-mt-20 px-5 py-10 sm:px-8 sm:py-14 lg:px-12" id="cau-lac-bo">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">{m.clubsSection.kicker}</p>
            <h2 className="mt-1.5 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[38px]">
              {m.clubsSection.titlePrefix}
              <mark className="rounded-lg bg-accent px-2 py-0.5 text-primary">
                {m.clubsSection.titleHighlight}
              </mark>
            </h2>
          </div>
          <Link
            href="/clubs"
            className="inline-flex items-center gap-2 pb-1 text-sm font-semibold text-primary hover:underline"
          >
            <span>{m.clubsSection.openDirectory(totalClubs)}</span>
            <ArrowRight size={15} />
          </Link>
        </div>

        <p className="mt-2.5 max-w-[60ch] text-sm leading-6 text-slate-700 sm:text-[15px]">
          {formatLocalizedCopy(m.clubsSection.lead, locale)}
        </p>

        {!clubsPending && !hasClubFilter && youthUnionClub && (
          <HomeYouthUnionSpotlight
            youthUnion={youthUnionClub}
            events={eventsByClubId.get(youthUnionClub.id) ?? []}
          />
        )}

        <div data-ui="club-finder" className="mt-6 rounded-2xl bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                maxLength={200}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={m.clubsSection.searchPlaceholder}
                aria-label={m.clubsSection.searchAria}
                className="h-11 w-full rounded-xl bg-background pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-2 focus:outline-primary"
              />
              {searchQuery && (
                <button
                  type="button"
                  aria-label={m.clubsSection.clearSearchAria}
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2.5 top-1/2 grid size-6 -translate-y-1/2 place-items-center rounded-full text-slate-400 hover:bg-slate-200/70 hover:text-slate-700"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {hasClubFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setSearchQuery("");
                }}
                className="h-11 shrink-0 rounded-xl bg-accent px-4 text-xs font-semibold text-primary transition-colors hover:bg-primary/15 sm:text-sm"
              >
                {m.clubsSection.resetFilter}
              </button>
            )}
          </div>

          {categories.length > 0 && (
            <div className="mt-3.5 flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedCategory("")}
                className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                  selectedCategory === ""
                    ? "bg-primary text-white"
                    : "bg-secondary text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                }`}
              >
                {m.clubsSection.allCategories(allClubs.length)}
              </button>
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                    selectedCategory === cat
                      ? "bg-primary text-white"
                      : "bg-secondary text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
                  }`}
                >
                  <DbText value={cat} />
                </button>
              ))}
            </div>
          )}

          {!clubsPending && allClubs.length > 0 && (
            <p className="mt-3 text-xs font-medium text-slate-500 tabular-nums">
              {m.clubsSection.showingCount(featuredClubs.length, allClubs.length)}
            </p>
          )}
        </div>

        {clubsPending ? (
          <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="h-80 rounded-2xl bg-white" />
            ))}
          </div>
        ) : clubsError ? (
          <div className="mt-8 rounded-2xl bg-destructive/10 p-6 text-sm text-destructive">
            {m.clubsSection.loadErrorPrefix} <DbText value={describeError(clubsError)} />
          </div>
        ) : regularFeaturedClubs.length === 0 ? (
          <div className="mt-8 rounded-2xl bg-white p-10 text-center">
            <p className="text-base font-semibold text-slate-900">{m.clubsSection.emptyTitle}</p>
            <p className="mt-1 text-sm text-slate-600">{m.clubsSection.emptyDesc}</p>
            {hasClubFilter && (
              <button
                type="button"
                onClick={() => {
                  setSelectedCategory("");
                  setSearchQuery("");
                }}
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-primary-hover"
              >
                {m.clubsSection.showAllBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {regularFeaturedClubs.map((club) => (
              <HomeClubCard
                key={club.id}
                club={club}
                clubEvents={eventsByClubId.get(club.id) ?? []}
                setPreviewClub={setPreviewClub}
              />
            ))}
          </div>
        )}
      </section>

      <HomeEventsSection allClubs={allClubs} featuredEvents={featuredEvents} eventsPending={eventsPending} />

      {previewClub && (
        <HomeClubPreviewDialog
          previewClub={previewClub}
          setPreviewClub={setPreviewClub}
          eventsByClubId={eventsByClubId}
        />
      )}
    </>
  );
}
