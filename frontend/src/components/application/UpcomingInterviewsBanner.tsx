"use client";

import Link from "next/link";
import { ArrowRight, CalendarClock, ExternalLink, MapPin } from "lucide-react";
import type { ApplicationSummary } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import { formatDateTime, safeExternalHref } from "@/lib/utils";
import {
  extractUpcomingInterviews,
  formatInterviewCountdown,
} from "@/forms/application/interview-scheduling";

interface UpcomingInterviewsBannerProps {
  applications: readonly ApplicationSummary[];
  onSelectApplication?: (applicationId: string) => void;
  nowMs?: number;
}

export function UpcomingInterviewsBanner({
  applications,
  onSelectApplication,
  nowMs,
}: UpcomingInterviewsBannerProps) {
  const upcoming = extractUpcomingInterviews(applications, nowMs);
  if (upcoming.length === 0) return null;

  return (
    <section
      aria-label="Lịch phỏng vấn sắp tới"
      className="rounded-xl border border-primary/25 bg-card p-4 shadow-2xs"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2.5">
          <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarClock size={16} />
          </span>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-sm font-bold text-foreground">
                Lịch phỏng vấn / First Meeting sắp tới
              </h2>
              <Badge tone="primary" dot={false}>
                {upcoming.length} lịch hẹn
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              Hãy kiểm tra thời gian, địa điểm và ghi chú từ Ban Chủ nhiệm CLB trước buổi hẹn.
            </p>
          </div>
        </div>
        {!onSelectApplication && (
          <Link
            href="/applications"
            className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
          >
            Xem đơn của tôi <ArrowRight size={13} />
          </Link>
        )}
      </div>

      <ul className="mt-3 grid gap-2.5 md:grid-cols-2">
        {upcoming.map((app) => {
          const locationHref = safeExternalHref(app.interviewLocation);
          const countdown = app.interviewAt ? formatInterviewCountdown(app.interviewAt, nowMs) : "";
          return (
            <li
              key={app.id}
              className="flex flex-col justify-between gap-2.5 rounded-lg border border-border bg-background p-3"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-foreground">{app.clubName}</p>
                    <p className="font-mono text-[11px] font-semibold text-primary">
                      {formatDateTime(app.interviewAt)}
                    </p>
                  </div>
                  {countdown && (
                    <Badge tone="primary" dot={false}>
                      {countdown}
                    </Badge>
                  )}
                </div>

                {app.interviewLocation && (
                  <p className="flex items-start gap-1.5 text-xs text-foreground">
                    <MapPin size={13} className="mt-0.5 shrink-0 text-primary" />
                    {locationHref ? (
                      <a
                        href={locationHref}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 break-all font-medium text-primary underline"
                      >
                        {app.interviewLocation}
                        <ExternalLink size={11} className="shrink-0" />
                      </a>
                    ) : (
                      <span className="break-words font-medium">{app.interviewLocation}</span>
                    )}
                  </p>
                )}

                {app.interviewNote && (
                  <p className="line-clamp-2 whitespace-pre-line text-xs text-muted-foreground">
                    {app.interviewNote}
                  </p>
                )}
              </div>

              <div className="flex items-center justify-end border-t border-border/60 pt-2">
                {onSelectApplication ? (
                  <button
                    type="button"
                    onClick={() => onSelectApplication(app.id)}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Xem chi tiết đơn <ArrowRight size={12} />
                  </button>
                ) : (
                  <Link
                    href={`/applications?applicationId=${app.id}`}
                    className="inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
                  >
                    Xem chi tiết đơn <ArrowRight size={12} />
                  </Link>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
