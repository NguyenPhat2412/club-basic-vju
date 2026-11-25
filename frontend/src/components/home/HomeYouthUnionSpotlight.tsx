"use client";

import Link from "next/link";
import { ArrowRight, Calendar, ShieldCheck, Sparkles } from "lucide-react";
import { ClubCoverBanner } from "@/components/shared/ClubMedia";
import { unitApplyCtaLabel } from "@/lib/club/youth-union";
import type { ClubItem, EventItem } from "@/types";
import { DbText } from "./DbText";

export function HomeYouthUnionSpotlight({
  youthUnion,
  events,
}: {
  youthUnion: ClubItem;
  events: EventItem[];
}) {
  const topEvents = events.slice(0, 2);

  return (
    <div className="mt-6 overflow-hidden rounded-2xl border border-primary/25 bg-white shadow-xs">
      <div className="grid lg:grid-cols-[1.05fr_1.25fr]">
        <ClubCoverBanner
          name={youthUnion.name}
          code={youthUnion.code}
          coverUrl={youthUnion.coverUrl}
          className="h-52 w-full lg:h-full lg:min-h-[240px]"
        >
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900/75 via-slate-900/20 to-transparent" />
          <div className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-full bg-primary px-3 py-1 text-[11px] font-bold tracking-wide text-white shadow-sm">
            <ShieldCheck size={13} />
            ĐOÀN TRƯỜNG ĐẠI HỌC VIỆT NHẬT · DOANVJU
          </div>
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-white/80">
              Đơn vị tổ chức phong trào &amp; cấp chứng nhận cấp Trường
            </p>
            <h3 className="mt-1 font-serif text-xl font-bold leading-snug sm:text-2xl">
              <DbText value={youthUnion.name} />
            </h3>
          </div>
        </ClubCoverBanner>

        <div className="flex flex-col justify-between gap-4 p-5 sm:p-6">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-accent px-2.5 py-1 text-[11px] font-bold text-primary">
                <Sparkles size={12} /> Tiêu điểm Đoàn Thanh niên
              </span>
              <span className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-slate-700">
                {events.length > 0 ? `${events.length} hoạt động đang mở` : "Điều phối 12 CLB sinh viên VJU"}
              </span>
            </div>

            <p className="line-clamp-3 text-sm leading-6 text-slate-700">
              {youthUnion.description ? (
                <DbText value={youthUnion.description} />
              ) : (
                "Tổ chức chính trị - xã hội của sinh viên Trường Đại học Việt Nhật (ĐHQGHN), điều phối phong trào tình nguyện, học thuật, tuyển CTV sự kiện cấp Trường và chứng thực hoạt động sinh viên."
              )}
            </p>

            {topEvents.length > 0 && (
              <div className="space-y-1.5 rounded-xl border border-border/70 bg-background p-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Hoạt động nổi bật từ Đoàn Trường
                </p>
                {topEvents.map((ev) => (
                  <Link
                    key={ev.id}
                    href={`/events?eventId=${ev.id}`}
                    className="flex items-center justify-between gap-2 rounded-lg px-2 py-1.5 text-xs transition-colors hover:bg-white"
                  >
                    <span className="flex min-w-0 items-center gap-1.5 font-semibold text-slate-900">
                      <Calendar size={12} className="shrink-0 text-primary" />
                      <span className="truncate"><DbText value={ev.title} /></span>
                    </span>
                    <ArrowRight size={13} className="shrink-0 text-primary" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-2.5 pt-1">
            <Link
              href={`/clubs/${youthUnion.id}`}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-primary px-4 text-xs font-bold text-white transition-colors hover:bg-primary-hover sm:text-sm"
            >
              <span>Trang Đoàn Trường</span>
              <ArrowRight size={14} />
            </Link>
            <Link
              href={`/clubs/${youthUnion.id}/apply`}
              className="inline-flex h-10 items-center gap-1.5 rounded-xl border border-primary/30 bg-accent px-4 text-xs font-bold text-primary transition-colors hover:bg-primary/15 sm:text-sm"
            >
              {unitApplyCtaLabel(youthUnion.code)}
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
