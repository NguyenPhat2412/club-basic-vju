"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { ClubAvatar, ClubCoverBanner, useClubMediaCatalog } from "@/components/shared/ClubMedia";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { clubSlugFromCode } from "@/lib/media";
import { useI18n } from "@/providers/I18nContext";
import { ClubItem, EventItem } from "@/types";
import { DbText } from "./DbText";

export function HomeClubCard({
  club,
  clubEvents,
  setPreviewClub,
}: {
  club: ClubItem;
  clubEvents: EventItem[];
  setPreviewClub: (club: ClubItem) => void;
}) {
  const { locale, tr } = useI18n();
  const m = HOME_MESSAGES[locale];
  const localizedClubName = tr(club.name);
  const mediaCatalog = useClubMediaCatalog(true);
  const clubMedia = mediaCatalog.data?.clubs[clubSlugFromCode(club.code)];
  return (
    <article
      className="group flex flex-col justify-between overflow-hidden rounded-2xl bg-white transition-transform duration-200 hover:-translate-y-0.5"
    >
      <div>
        <Link href={`/clubs/${club.id}`} className="block">
          <ClubCoverBanner
            name={localizedClubName}
            code={club.code}
            coverUrl={club.coverUrl}
            fallbackUrl={clubMedia?.cover ?? undefined}
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
              <span className="absolute right-3.5 top-3.5 rounded-full bg-card/95 px-2.5 py-1 text-xs font-bold text-primary shadow-xs backdrop-blur-2xs tabular-nums">
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
              fallbackUrl={clubMedia?.logo ?? undefined}
              size="md"
              className="mt-0.5"
            />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold text-primary">{club.code}</p>
              <Link href={`/clubs/${club.id}`} className="block">
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

      <div className="flex items-center justify-between gap-2 bg-background px-5 py-3.5">
        <button
          type="button"
          onClick={() => setPreviewClub(club)}
          className="rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-200/70 hover:text-slate-900 sm:text-[13px]"
        >
          {m.clubsSection.quickView}
        </button>
        <Link
          href={`/clubs/${club.id}`}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
        >
          <span>{m.clubsSection.applyClub}</span>
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      </div>
    </article>
  );
}
