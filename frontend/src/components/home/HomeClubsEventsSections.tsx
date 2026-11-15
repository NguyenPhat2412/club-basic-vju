"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { ArrowRight, Calendar, Mail, MapPin, Search, Users, X } from "lucide-react";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { describeError } from "@/components/shared/ListPage";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { ClubItem, EventItem } from "@/types";
import { DbText, formatLocalizedCopy } from "./DbText";

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
  const { locale, localeMeta, tr } = useI18n();
  const m = HOME_MESSAGES[locale];
  const [previewClub, setPreviewClub] = useState<ClubItem | null>(null);
  const [onlyCtvEvents, setOnlyCtvEvents] = useState(false);

  const dateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [localeMeta.intlLocale]
  );

  const shortDayMonthFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        day: "2-digit",
        month: "2-digit",
      }),
    [localeMeta.intlLocale]
  );

  const timeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [localeMeta.intlLocale]
  );

  const formatDate = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : dateFmt.format(d);
  };

  const formatDayMonth = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    return Number.isNaN(d.getTime()) ? "" : shortDayMonthFmt.format(d);
  };

  const formatTimeRange = (startIso?: string, endIso?: string) => {
    if (!startIso) return "";
    const start = new Date(startIso);
    if (Number.isNaN(start.getTime())) return "";
    const startStr = timeFmt.format(start);
    if (!endIso) return startStr;
    const end = new Date(endIso);
    if (Number.isNaN(end.getTime())) return startStr;
    return `${startStr} – ${timeFmt.format(end)}`;
  };

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

  const ctvEventsCount = useMemo(
    () => featuredEvents.filter((ev) => ev.allowCtv).length,
    [featuredEvents]
  );

  const visibleEvents = useMemo(
    () => (onlyCtvEvents ? featuredEvents.filter((ev) => ev.allowCtv) : featuredEvents).slice(0, 6),
    [featuredEvents, onlyCtvEvents]
  );

  const hasClubFilter = selectedCategory !== "" || searchQuery.trim() !== "";

  return (
    <>
      <section className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12" id="cau-lac-bo">
        <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">{m.clubsSection.kicker}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
              {m.clubsSection.titlePrefix}
              <mark className="rounded-lg bg-amber-100/90 px-2 py-0.5 text-slate-900">
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

        <p className="mt-3 max-w-[65ch] text-base leading-7 text-slate-700">
          {formatLocalizedCopy(m.clubsSection.lead, locale)}
        </p>

        <div data-ui="club-finder" className="mt-6 rounded-2xl bg-white p-4 sm:p-5">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search
                size={17}
                className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
              />
              <input
                type="search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={m.clubsSection.searchPlaceholder}
                aria-label={m.clubsSection.searchAria}
                className="h-11 w-full rounded-xl bg-[#f8fafc] pl-10 pr-9 text-sm text-slate-900 placeholder:text-slate-400 focus:bg-white focus:outline-2 focus:outline-primary"
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
                className="h-11 shrink-0 rounded-xl bg-[#fff1f2] px-4 text-xs font-semibold text-primary transition-colors hover:bg-rose-100 sm:text-sm"
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
                    : "bg-[#f1f5f9] text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
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
                      : "bg-[#f1f5f9] text-slate-700 hover:bg-slate-200/80 hover:text-slate-900"
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
          <div className="mt-8 rounded-2xl bg-rose-50 p-6 text-sm text-rose-700">
            {m.clubsSection.loadErrorPrefix} <DbText value={describeError(clubsError)} />
          </div>
        ) : featuredClubs.length === 0 ? (
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
                className="mt-4 inline-flex h-10 items-center rounded-xl bg-primary px-4 text-sm font-semibold text-white hover:bg-[#741828]"
              >
                {m.clubsSection.showAllBtn}
              </button>
            )}
          </div>
        ) : (
          <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {featuredClubs.map((club) => {
              const clubEvents = eventsByClubId.get(club.id) ?? [];
              const localizedClubName = tr(club.name);
              return (
                <article
                  key={club.id}
                  className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white transition-transform duration-200 hover:-translate-y-0.5"
                >
                  <div>
                    <Link href={`/clubs?clubId=${club.id}`} className="block">
                      <ClubCoverBanner
                        name={localizedClubName}
                        code={club.code}
                        coverUrl={club.coverUrl}
                        className="h-44 w-full"
                      >
                        <div className="absolute left-3.5 top-3.5 flex flex-wrap items-center gap-1.5">
                          <span className="rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900">
                            {club.activityField ? (
                              <DbText value={club.activityField} />
                            ) : (
                              m.clubsSection.defaultField
                            )}
                          </span>
                        </div>
                        {clubEvents.length > 0 && (
                          <span className="absolute right-3.5 top-3.5 rounded-full bg-[#f3d4a6] px-2.5 py-1 text-xs font-bold text-slate-950 tabular-nums">
                            {m.clubsSection.openEventsBadge(clubEvents.length)}
                          </span>
                        )}
                      </ClubCoverBanner>
                    </Link>

                    <div className="px-5 pb-4 pt-4">
                      <div className="flex items-start gap-3">
                        <ClubAvatar
                          name={localizedClubName}
                          code={club.code}
                          logoUrl={club.logoUrl}
                          size="md"
                          className="mt-0.5"
                        />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-primary">{club.code}</p>
                          <Link href={`/clubs?clubId=${club.id}`} className="block">
                            <h3 className="mt-0.5 line-clamp-2 text-[17px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary">
                              <DbText value={club.name} />
                            </h3>
                          </Link>
                        </div>
                      </div>
                      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-700">
                        {club.description ? (
                          <DbText value={club.description} />
                        ) : (
                          m.clubsSection.defaultClubDesc
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 bg-[#f8fafc] px-5 py-3.5">
                    <button
                      type="button"
                      onClick={() => setPreviewClub(club)}
                      className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/70 hover:text-slate-900 sm:text-[13px]"
                    >
                      {m.clubsSection.quickView}
                    </button>
                    <Link
                      href={`/clubs?clubId=${club.id}`}
                      className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
                    >
                      <span>{m.clubsSection.applyClub}</span>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      <section id="hoat-dong" className="bg-white py-16 sm:py-22">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-14 lg:px-12">
          <div>
            <p className="text-sm font-semibold text-primary">{m.campusLife.kicker}</p>
            <h2 className="mt-2 max-w-lg font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[38px]">
              {formatLocalizedCopy(m.campusLife.title, locale)}
            </h2>
            <p className="mt-4 max-w-lg text-base leading-7 text-slate-700">
              {m.campusLife.bodyPart1}
              <mark className="rounded bg-amber-100/90 px-1.5 py-0.5 font-semibold text-amber-950">
                {m.campusLife.campusMyDinh}
              </mark>
              {m.campusLife.bodyPart2}
              <mark className="rounded bg-amber-100/90 px-1.5 py-0.5 font-semibold text-amber-950">
                {m.campusLife.campusHoaLac}
              </mark>
              {m.campusLife.bodyPart3}
            </p>
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href="/clubs"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#741828]"
              >
                <span>{m.campusLife.exploreClubsCta}</span>
                <ArrowRight size={15} />
              </Link>
              <Link
                href="/events"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#f1f5f9] px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200/80 hover:text-primary"
              >
                {m.campusLife.openEventsCta}
              </Link>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="overflow-hidden rounded-2xl bg-[#f8fafc] sm:col-span-2">
              <div
                className="h-52 w-full bg-cover bg-center sm:h-68"
                style={{ backgroundImage: "url('/images/clubs/vjua/gallery-2.jpg')" }}
              />
              <div className="px-5 py-4">
                <p className="text-xs font-semibold text-primary">{m.campusLife.mainPhotoKicker}</p>
                <p className="mt-0.5 text-[15px] font-bold text-slate-900">
                  {formatLocalizedCopy(m.campusLife.mainPhotoTitle, locale)}
                </p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-[#f8fafc]">
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: "url('/images/clubs/monozukuri/gallery-2.jpg')" }}
              />
              <div className="p-4">
                <p className="text-[15px] font-bold text-slate-900">{m.campusLife.card1Title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{m.campusLife.card1Desc}</p>
              </div>
            </div>
            <div className="overflow-hidden rounded-2xl bg-[#f8fafc]">
              <div
                className="h-40 w-full bg-cover bg-center"
                style={{ backgroundImage: "url('/images/clubs/ouvevju/cover.jpg')" }}
              />
              <div className="p-4">
                <p className="text-[15px] font-bold text-slate-900">{m.campusLife.card2Title}</p>
                <p className="mt-1 text-sm leading-6 text-slate-600">{m.campusLife.card2Desc}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section id="tin-tuc" className="mx-auto max-w-[1380px] px-5 py-14 sm:px-8 sm:py-20 lg:px-12">
        <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
          <div>
            <p className="text-sm font-semibold text-primary">{m.eventsSection.kicker}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
              {formatLocalizedCopy(m.eventsSection.title, locale)}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {ctvEventsCount > 0 && (
              <div className="inline-flex rounded-xl bg-white p-1" data-ui="event-filter">
                <button
                  type="button"
                  onClick={() => setOnlyCtvEvents(false)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                    !onlyCtvEvents
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {m.eventsSection.filterAll(featuredEvents.length)}
                </button>
                <button
                  type="button"
                  onClick={() => setOnlyCtvEvents(true)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                    onlyCtvEvents
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {m.eventsSection.filterCtv(ctvEventsCount)}
                </button>
              </div>
            )}
            <Link
              href="/events"
              className="inline-flex items-center gap-1.5 px-2 py-1.5 text-sm font-semibold text-primary hover:underline"
            >
              <span>{m.eventsSection.openPortal}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        {eventsPending ? (
          <div className="mt-7 grid gap-3">
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx} className="h-20 rounded-2xl bg-white" />
            ))}
          </div>
        ) : visibleEvents.length === 0 ? (
          <div className="mt-7 rounded-2xl bg-white p-8 text-center text-sm text-slate-600">
            {m.eventsSection.empty}
          </div>
        ) : (
          <div className="mt-7 grid gap-3">
            {visibleEvents.map((ev) => {
              const typeLabel = EVENT_TYPE_LABELS[ev.eventType];
              return (
                <Link
                  href={`/events?eventId=${ev.id}`}
                  key={ev.id}
                  className="group grid gap-3 rounded-2xl bg-white p-4 transition-colors hover:bg-[#fff1f2]/65 sm:p-5 lg:grid-cols-[160px_220px_1fr_auto] lg:items-center lg:gap-6"
                >
                  <div className="tabular-nums">
                    <p className="text-sm font-bold text-slate-900">{formatDate(ev.startTime)}</p>
                    <p className="mt-0.5 text-xs font-medium text-slate-600">
                      {formatTimeRange(ev.startTime, ev.endTime)}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-primary">
                      <DbText value={ev.clubName} />
                    </p>
                    <p className="mt-0.5 text-xs text-slate-500">
                      {typeLabel ? <DbText value={typeLabel} /> : m.eventsSection.defaultType}
                    </p>
                  </div>

                  <div className="min-w-0">
                    <p className="line-clamp-2 text-base font-bold text-slate-900 transition-colors group-hover:text-primary lg:truncate">
                      <DbText value={ev.title} />
                    </p>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-600 sm:text-[13px]">
                      {ev.location && (
                        <span className="inline-flex items-center gap-1">
                          <MapPin size={13} className="shrink-0 text-primary" />
                          <span>
                            <DbText value={ev.location} />
                          </span>
                        </span>
                      )}
                      {ev.maxParticipants ? (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Users size={13} className="shrink-0 text-slate-400" />
                          <span>{m.eventsSection.quota(ev.maxParticipants)}</span>
                        </span>
                      ) : null}
                      {ev.registrationDeadline ? (
                        <span className="inline-flex items-center gap-1 tabular-nums">
                          <Calendar size={13} className="shrink-0 text-slate-400" />
                          <span>
                            {m.eventsSection.deadline(formatDayMonth(ev.registrationDeadline))}
                          </span>
                        </span>
                      ) : null}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-3 lg:justify-end">
                    {ev.allowCtv ? (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-950">
                        {m.eventsSection.ctvOpenBadge}
                      </span>
                    ) : (
                      <span className="rounded-full bg-[#f1f5f9] px-3 py-1 text-xs font-semibold text-slate-700">
                        {m.eventsSection.clubEventBadge}
                      </span>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary sm:text-sm">
                      <span>{m.eventsSection.detailsLink}</span>
                      <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </section>

      {previewClub && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="club-preview-title"
          data-ui="club-quick-preview"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 fade-in"
          onClick={() => setPreviewClub(null)}
        >
          <div
            className="max-h-[90svh] w-full max-w-xl overflow-y-auto rounded-3xl bg-white"
            onClick={(e) => e.stopPropagation()}
          >
            <ClubCoverBanner
              name={tr(previewClub.name)}
              code={previewClub.code}
              coverUrl={previewClub.coverUrl}
              className="h-44 w-full"
            >
              <button
                type="button"
                aria-label={m.clubsSection.previewCloseAria}
                onClick={() => setPreviewClub(null)}
                className="absolute right-4 top-4 grid size-9 place-items-center rounded-full bg-slate-950/65 text-white transition-colors hover:bg-slate-950"
              >
                <X size={17} />
              </button>
              <span className="absolute left-4 top-4 rounded-full bg-white/95 px-3 py-1 text-xs font-semibold text-slate-900">
                {previewClub.activityField ? (
                  <DbText value={previewClub.activityField} />
                ) : (
                  m.clubsSection.defaultField
                )}
              </span>
            </ClubCoverBanner>

            <div className="p-6">
              <div className="flex items-start gap-3.5">
                <ClubAvatar
                  name={tr(previewClub.name)}
                  code={previewClub.code}
                  logoUrl={previewClub.logoUrl}
                  size="lg"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-primary">{previewClub.code}</p>
                  <h3 id="club-preview-title" className="mt-0.5 text-xl font-bold text-slate-900">
                    <DbText value={previewClub.name} />
                  </h3>
                  {previewClub.contactEmail && (
                    <p className="mt-1 inline-flex items-center gap-1.5 text-xs text-slate-600">
                      <Mail size={13} className="text-primary" />
                      <span>{previewClub.contactEmail}</span>
                    </p>
                  )}
                </div>
              </div>

              <p className="mt-4 text-sm leading-6 text-slate-700">
                {previewClub.description ? (
                  <DbText value={previewClub.description} />
                ) : (
                  m.clubsSection.defaultClubDesc
                )}
              </p>

              {(eventsByClubId.get(previewClub.id) ?? []).length > 0 && (
                <div className="mt-5 rounded-2xl bg-[#f8fafc] p-4">
                  <p className="text-xs font-semibold text-primary">
                    {m.clubsSection.previewUpcomingTitle}
                  </p>
                  <div className="mt-2.5 space-y-2">
                    {(eventsByClubId.get(previewClub.id) ?? []).slice(0, 2).map((ev) => (
                      <Link
                        key={ev.id}
                        href={`/events?eventId=${ev.id}`}
                        className="flex items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs transition-colors hover:bg-[#fff1f2]/70"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-bold text-slate-900">
                            <DbText value={ev.title} />
                          </p>
                          <p className="mt-0.5 text-slate-500 tabular-nums">
                            {formatDate(ev.startTime)} · {formatTimeRange(ev.startTime, ev.endTime)}
                          </p>
                        </div>
                        <span className="shrink-0 font-semibold text-primary">
                          {m.clubsSection.previewViewEvent}
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>
              )}

              <div className="mt-6 flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setPreviewClub(null)}
                  className="inline-flex h-11 items-center justify-center rounded-xl bg-[#f1f5f9] px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
                >
                  {m.clubsSection.previewClose}
                </button>
                <Link
                  href={`/clubs?clubId=${previewClub.id}`}
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-[#741828]"
                >
                  <span>{m.clubsSection.previewApplyCta}</span>
                  <ArrowRight size={15} />
                </Link>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
