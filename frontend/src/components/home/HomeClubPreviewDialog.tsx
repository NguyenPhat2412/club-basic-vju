"use client";

import Link from "next/link";
import { ArrowRight, Mail, X } from "lucide-react";
import { ClubAvatar, ClubCoverBanner } from "@/components/shared/ClubMedia";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { ClubItem, EventItem } from "@/types";
import { DbText } from "./DbText";
import { useHomeEventDateFormat } from "./useHomeEventDateFormat";

export function HomeClubPreviewDialog({
  previewClub,
  setPreviewClub,
  eventsByClubId,
}: {
  previewClub: ClubItem;
  setPreviewClub: (club: ClubItem | null) => void;
  eventsByClubId: Map<string, EventItem[]>;
}) {
  const { locale, tr } = useI18n();
  const m = HOME_MESSAGES[locale];
  const { formatDate, formatTimeRange } = useHomeEventDateFormat();

  return (
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
            <div className="mt-5 rounded-2xl bg-background p-4">
              <p className="text-xs font-semibold text-primary">
                {m.clubsSection.previewUpcomingTitle}
              </p>
              <div className="mt-2.5 space-y-2">
                {(eventsByClubId.get(previewClub.id) ?? []).slice(0, 2).map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events?eventId=${ev.id}`}
                    className="flex items-center justify-between gap-2 rounded-xl bg-white px-3.5 py-2.5 text-xs transition-colors hover:bg-accent/70"
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
              className="inline-flex h-11 items-center justify-center rounded-xl bg-secondary px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200"
            >
              {m.clubsSection.previewClose}
            </button>
            <Link
              href={`/clubs?clubId=${previewClub.id}`}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <span>{m.clubsSection.previewApplyCta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
