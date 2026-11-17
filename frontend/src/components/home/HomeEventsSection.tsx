"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { ArrowRight, Calendar, MapPin, Users } from "lucide-react";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { EventItem } from "@/types";
import { DbText, formatLocalizedCopy } from "./DbText";
import { useHomeEventDateFormat } from "./useHomeEventDateFormat";

export function HomeEventsSection({
  featuredEvents,
  eventsPending,
}: {
  featuredEvents: EventItem[];
  eventsPending: boolean;
}) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];
  const [onlyCtvEvents, setOnlyCtvEvents] = useState(false);
  const { formatDate, formatDayMonth, formatTimeRange } = useHomeEventDateFormat();

  const ctvEventsCount = useMemo(
    () => featuredEvents.filter((ev) => ev.allowCtv).length,
    [featuredEvents]
  );

  const visibleEvents = useMemo(
    () => (onlyCtvEvents ? featuredEvents.filter((ev) => ev.allowCtv) : featuredEvents).slice(0, 6),
    [featuredEvents, onlyCtvEvents]
  );

  return (
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
                className="group grid gap-3 rounded-2xl bg-white p-4 transition-colors hover:bg-accent/65 sm:p-5 lg:grid-cols-[160px_220px_1fr_auto] lg:items-center lg:gap-6"
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
                    <span className="rounded-full border border-primary/20 bg-accent px-3 py-1 text-xs font-bold text-primary">
                      {m.eventsSection.ctvOpenBadge}
                    </span>
                  ) : (
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-slate-700">
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
  );
}
