"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calendar, MapPin, ShieldCheck, Users } from "lucide-react";
import { useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { isYouthUnionCode } from "@/lib/club/youth-union";
import { clubSlugFromCode, resolveMediaUrl } from "@/lib/media";
import { useI18n } from "@/providers/I18nContext";
import { ClubItem, EventItem } from "@/types";
import { DbText, formatLocalizedCopy } from "./DbText";
import { useHomeEventDateFormat } from "./useHomeEventDateFormat";

type HomeEventFilter = "all" | "dtn" | "ctv";

export function HomeEventsSection({
  allClubs = [],
  featuredEvents,
  eventsPending,
}: {
  allClubs?: ClubItem[];
  featuredEvents: EventItem[];
  eventsPending: boolean;
}) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];
  const [filter, setFilter] = useState<HomeEventFilter>("all");
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const { formatDate, formatDayMonth, formatTimeRange } = useHomeEventDateFormat();
  const mediaCatalog = useClubMediaCatalog(true);

  const clubById = useMemo(() => {
    const map = new Map<string, ClubItem>();
    for (const c of allClubs) map.set(c.id, c);
    return map;
  }, [allClubs]);

  const dtnEventsCount = useMemo(
    () => featuredEvents.filter((ev) => isYouthUnionCode(ev.clubCode)).length,
    [featuredEvents],
  );
  const ctvEventsCount = useMemo(
    () => featuredEvents.filter((ev) => ev.allowCtv).length,
    [featuredEvents],
  );

  const visibleEvents = useMemo(() => {
    const filtered =
      filter === "dtn"
        ? featuredEvents.filter((ev) => isYouthUnionCode(ev.clubCode))
        : filter === "ctv"
          ? featuredEvents.filter((ev) => ev.allowCtv)
          : featuredEvents;
    return filtered.slice(0, 6);
  }, [featuredEvents, filter]);

  return (
    <section
      id="su-kien-ctv"
      className="mx-auto max-w-[1380px] scroll-mt-20 border-t border-border/60 px-5 py-14 sm:px-8 sm:py-20 lg:px-12"
    >
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-end">
        <div>
          <p className="text-sm font-semibold text-primary">{m.eventsSection.kicker}</p>
          <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
            {formatLocalizedCopy(m.eventsSection.title, locale)}
          </h2>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {(ctvEventsCount > 0 || dtnEventsCount > 0) && (
            <div className="inline-flex rounded-xl bg-white p-1" data-ui="event-filter">
              <button
                type="button"
                onClick={() => setFilter("all")}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                  filter === "all" ? "bg-primary text-white" : "text-slate-700 hover:text-slate-900"
                }`}
              >
                {m.eventsSection.filterAll(featuredEvents.length)}
              </button>
              {dtnEventsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("dtn")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                    filter === "dtn" ? "bg-primary text-white" : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  Đoàn TN ({dtnEventsCount})
                </button>
              )}
              {ctvEventsCount > 0 && (
                <button
                  type="button"
                  onClick={() => setFilter("ctv")}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors sm:text-[13px] ${
                    filter === "ctv" ? "bg-primary text-white" : "text-slate-700 hover:text-slate-900"
                  }`}
                >
                  {m.eventsSection.filterCtv(ctvEventsCount)}
                </button>
              )}
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
        <div className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, idx) => (
            <div key={idx} className="h-64 rounded-2xl bg-white" />
          ))}
        </div>
      ) : visibleEvents.length === 0 ? (
        <div className="mt-7 rounded-2xl bg-white p-8 text-center text-sm text-slate-600">
          {m.eventsSection.empty}
        </div>
      ) : (
        <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {visibleEvents.map((ev, idx) => {
            const typeLabel = EVENT_TYPE_LABELS[ev.eventType];
            const isDtn = isYouthUnionCode(ev.clubCode);
            const clubMedia = mediaCatalog.data?.clubs[clubSlugFromCode(ev.clubCode)];
            const clubCoverFallback = clubById.get(ev.clubId)?.coverUrl;
            const galleryFallback = clubMedia?.gallery.length
              ? clubMedia.gallery[idx % clubMedia.gallery.length]
              : clubMedia?.cover;
            const candidates = [
              resolveMediaUrl(ev.coverImageUrl),
              isDtn ? "/images/intro/campus-awards.jpg" : galleryFallback,
              resolveMediaUrl(clubCoverFallback),
            ].filter((u): u is string => Boolean(u));
            const coverSrc = candidates.find((u) => !failedImages[`${ev.id}:${u}`]) ?? null;
            const allowPublic = ev.allowPublicAttendees ?? ev.allowCtv;

            return (
              <Link
                href={`/events?eventId=${ev.id}`}
                key={ev.id}
                className="group flex flex-col overflow-hidden rounded-2xl border border-border/60 bg-white transition-all hover:border-primary/35 hover:shadow-sm"
              >
                <div className="relative h-40 w-full overflow-hidden bg-slate-100">
                  {coverSrc ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={coverSrc}
                      alt={ev.title}
                      loading="lazy"
                      onError={() =>
                        setFailedImages((prev) => ({ ...prev, [`${ev.id}:${coverSrc}`]: true }))
                      }
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-[1.03]"
                    />
                  ) : (
                    <div className="flex size-full flex-col items-center justify-center gap-1.5 bg-gradient-to-br from-primary/10 via-accent to-slate-100 text-primary">
                      <Calendar size={26} />
                      <span className="font-mono text-[11px] font-bold uppercase tracking-wider">
                        {ev.clubCode || "VJU EVENT"}
                      </span>
                    </div>
                  )}
                  <div className="absolute left-3 top-3 flex flex-wrap items-center gap-1.5">
                    {isDtn && (
                      <span className="inline-flex items-center gap-1 rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-bold text-white shadow-xs">
                        <ShieldCheck size={11} /> Đoàn TN Trường
                      </span>
                    )}
                    {ev.allowCtv ? (
                      <span className="rounded-full border border-primary/20 bg-white/95 px-2.5 py-0.5 text-[11px] font-bold text-primary shadow-xs">
                        {m.eventsSection.ctvOpenBadge}
                      </span>
                    ) : allowPublic ? (
                      <span className="rounded-full border border-slate-200 bg-white/95 px-2.5 py-0.5 text-[11px] font-semibold text-slate-800 shadow-xs">
                        Mở tham dự toàn trường
                      </span>
                    ) : (
                      <span className="rounded-full bg-white/90 px-2.5 py-0.5 text-[11px] font-semibold text-slate-700">
                        {m.eventsSection.clubEventBadge}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-1 flex-col justify-between gap-3 p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <span className="truncate font-bold text-primary"><DbText value={ev.clubName} /></span>
                      <span className="shrink-0 text-slate-500">
                        {typeLabel ? <DbText value={typeLabel} /> : m.eventsSection.defaultType}
                      </span>
                    </div>
                    <h3 className="line-clamp-2 text-[15px] font-bold leading-snug text-slate-900 transition-colors group-hover:text-primary">
                      <DbText value={ev.title} />
                    </h3>
                    <div className="space-y-1 pt-1 text-xs text-slate-600">
                      <p className="flex items-center gap-1.5 font-mono text-[11.5px] font-semibold text-slate-800">
                        <Calendar size={12} className="shrink-0 text-primary" />
                        <span>{formatDate(ev.startTime)} · {formatTimeRange(ev.startTime, ev.endTime)}</span>
                      </p>
                      {ev.location && (
                        <p className="flex items-center gap-1.5 truncate">
                          <MapPin size={12} className="shrink-0 text-primary" />
                          <span className="truncate"><DbText value={ev.location} /></span>
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 border-t border-border/60 pt-2.5 text-[11.5px] text-slate-500">
                    <div className="flex items-center gap-3 tabular-nums">
                      {ev.maxParticipants ? (
                        <span className="inline-flex items-center gap-1">
                          <Users size={12} className="text-slate-400" />
                          {m.eventsSection.quota(ev.maxParticipants)}
                        </span>
                      ) : null}
                      {ev.registrationDeadline ? (
                        <span>{m.eventsSection.deadline(formatDayMonth(ev.registrationDeadline))}</span>
                      ) : null}
                    </div>
                    <span className="inline-flex shrink-0 items-center gap-1 font-semibold text-primary">
                      <span>{m.eventsSection.detailsLink}</span>
                      <ArrowRight size={13} className="transition-transform group-hover:translate-x-0.5" />
                    </span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </section>
  );
}
