"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import {
  ArrowRight,
  CalendarCheck2,
  CheckCircle2,
  FileText,
  MessageSquareText,
  Sparkles,
  Users,
} from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { EVENT_TYPE_LABELS } from "@/forms/event/event-form";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { ClubItem, EventItem, SessionUser } from "@/types";
import { DbText, formatLocalizedCopy } from "./DbText";

type WorkspaceTab = "recruitment" | "events" | "operations";

interface HomeWorkspaceShowcaseProps {
  clubs: ClubItem[];
  events: EventItem[];
  user?: SessionUser;
  openAuthModal: (mode: AuthModalMode) => void;
}

export function HomeWorkspaceShowcase({
  clubs,
  events,
  user,
  openAuthModal,
}: HomeWorkspaceShowcaseProps) {
  const { locale, localeMeta } = useI18n();
  const w = HOME_MESSAGES[locale].workspace;
  const es = HOME_MESSAGES[locale].eventsSection;
  const [activeTab, setActiveTab] = useState<WorkspaceTab>("recruitment");
  const sampleClub = clubs[0];
  const previewEvents = events.slice(0, 3);

  const shortDateFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }),
    [localeMeta.intlLocale]
  );

  const shortTimeFmt = useMemo(
    () =>
      new Intl.DateTimeFormat(localeMeta.intlLocale, {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      }),
    [localeMeta.intlLocale]
  );

  const formatEventWindow = (iso?: string) => {
    if (!iso) return "";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return "";
    return `${shortTimeFmt.format(d)} · ${shortDateFmt.format(d)}`;
  };

  return (
    <section id="khong-gian-so" className="bg-secondary py-16 sm:py-22">
      <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
        <div className="flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">{w.kicker}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
              {formatLocalizedCopy(w.title, locale)}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              {formatLocalizedCopy(w.lead, locale)}
            </p>
          </div>

          <div className="flex shrink-0 flex-wrap items-center gap-3">
            {user ? (
              <Link
                href="/dashboard"
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                <span>{w.openWorkspaceCta}</span>
                <ArrowRight size={15} />
              </Link>
            ) : (
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
              >
                <span>{w.tryStudentCta}</span>
                <ArrowRight size={15} />
              </button>
            )}
            <Link
              href="/clubs"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-white px-5 text-sm font-semibold text-slate-800 transition-colors hover:bg-slate-200/70 hover:text-primary"
            >
              {w.viewDirectoryCta}
            </Link>
          </div>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-12 lg:items-stretch">
          <div className="flex flex-col gap-4 lg:col-span-5">
            <div className="relative min-h-[210px] flex-1 overflow-hidden rounded-3xl bg-slate-900">
              <div
                className="absolute inset-0 bg-cover transition-transform duration-500 hover:scale-105"
                style={{
                  backgroundImage: "url('/images/intro/campus-awards.jpg')",
                  backgroundPosition: "center 28%",
                }}
              />
              <div className="absolute inset-0 bg-slate-950/32" />
              <span className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1 text-xs font-bold text-foreground shadow-xs backdrop-blur-2xs">
                {w.photoBadge}
              </span>
              <div className="absolute inset-x-3.5 bottom-3.5 rounded-2xl bg-slate-950/75 px-4 py-2.5">
                <p className="text-xs font-medium leading-5 text-white/95">{w.photoCaption}</p>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
                  <Users size={18} className="shrink-0 text-primary" />
                  <span>{w.studentTitle}</span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {w.studentPart1}
                  <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
                    {w.studentHighlight}
                  </mark>
                  {w.studentPart2}
                </p>
              </div>

              <div className="rounded-2xl bg-white p-5">
                <div className="flex items-center gap-2.5 text-[15px] font-bold text-slate-900">
                  <Sparkles size={18} className="shrink-0 text-primary" />
                  <span>{w.boardTitle}</span>
                </div>
                <p className="mt-1.5 text-sm leading-6 text-slate-600">
                  {w.boardPart1}
                  <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
                    {w.boardHighlight}
                  </mark>
                  {w.boardPart2}
                </p>
              </div>
            </div>
          </div>

          <div
            data-ui="clubhub-workspace"
            className="flex flex-col justify-between rounded-3xl bg-white p-5 sm:p-6 lg:col-span-7"
          >
            <div>
              <div
                className="grid grid-cols-1 gap-1.5 rounded-2xl bg-secondary p-1.5 sm:grid-cols-3"
                role="tablist"
                aria-label={w.tabsAria}
              >
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "recruitment"}
                  onClick={() => setActiveTab("recruitment")}
                  className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-[13px] ${
                    activeTab === "recruitment"
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:bg-white/75 hover:text-slate-900"
                  }`}
                >
                  {w.tabRecruitment}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "events"}
                  onClick={() => setActiveTab("events")}
                  className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-[13px] ${
                    activeTab === "events"
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:bg-white/75 hover:text-slate-900"
                  }`}
                >
                  {w.tabEvents}
                </button>
                <button
                  type="button"
                  role="tab"
                  aria-selected={activeTab === "operations"}
                  onClick={() => setActiveTab("operations")}
                  className={`flex min-h-11 items-center justify-center rounded-xl px-3 py-2 text-center text-xs font-semibold transition-colors sm:text-[13px] ${
                    activeTab === "operations"
                      ? "bg-primary text-white"
                      : "text-slate-700 hover:bg-white/75 hover:text-slate-900"
                  }`}
                >
                  {w.tabOperations}
                </button>
              </div>
            </div>

            {activeTab === "recruitment" && (
              <div className="mt-5 flex flex-1 flex-col justify-between gap-4 fade-in" data-ui="panel-recruitment">
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3.5">
                    <div>
                      <p className="text-xs font-semibold text-primary">{w.recFormLabel}</p>
                      <p className="mt-0.5 text-[15px] font-bold text-slate-900">
                        {sampleClub ? <DbText value={sampleClub.name} /> : w.recSampleClubFallback}
                      </p>
                    </div>
                    <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                      {w.recOpenBadge}
                    </span>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="rounded-2xl bg-background p-4">
                      <p className="text-xs font-medium text-slate-500">{w.recChoice1Label}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{w.recChoice1Title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{w.recChoice1Desc}</p>
                    </div>
                    <div className="rounded-2xl bg-background p-4">
                      <p className="text-xs font-medium text-slate-500">{w.recChoice2Label}</p>
                      <p className="mt-1 text-sm font-bold text-slate-900">{w.recChoice2Title}</p>
                      <p className="mt-1 text-xs leading-5 text-slate-600">{w.recChoice2Desc}</p>
                    </div>
                  </div>

                  <div className="rounded-2xl bg-accent/75 p-4">
                    <p className="text-xs font-semibold text-primary">{w.recPipelineLabel}</p>
                    <div className="mt-3 grid grid-cols-3 gap-2 text-center text-xs font-semibold">
                      <div className="rounded-xl bg-white px-2.5 py-2.5 text-slate-900">{w.recStep1}</div>
                      <div className="rounded-xl bg-white px-2.5 py-2.5 text-slate-900">{w.recStep2}</div>
                      <div className="rounded-xl bg-primary px-2.5 py-2.5 text-white">{w.recStep3}</div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                  <span className="text-slate-600">{w.recFooterNote}</span>
                  <Link
                    href={sampleClub ? `/clubs?clubId=${sampleClub.id}` : "/clubs"}
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    <span>{w.recOpenSample}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "events" && (
              <div className="mt-5 flex flex-1 flex-col justify-between gap-4 fade-in" data-ui="panel-events">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl bg-background px-4 py-3">
                    <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
                      <CalendarCheck2 size={17} className="shrink-0 text-primary" />
                      <span>{w.evHeaderTitle}</span>
                    </div>
                    <span className="text-xs font-semibold text-emerald-700">{w.evHeaderBadge}</span>
                  </div>

                  {previewEvents.length > 0 ? (
                    previewEvents.map((ev) => {
                      const typeLabel = EVENT_TYPE_LABELS[ev.eventType];
                      return (
                        <Link
                          key={ev.id}
                          href={`/events?eventId=${ev.id}`}
                          className="group flex flex-col justify-between gap-2 rounded-2xl bg-background p-4 transition-colors hover:bg-accent/65 sm:flex-row sm:items-center"
                        >
                          <div className="min-w-0">
                            <p className="text-xs font-semibold text-primary">
                              <DbText value={ev.clubName} /> ·{" "}
                              {typeLabel ? <DbText value={typeLabel} /> : es.defaultType}
                            </p>
                            <p className="mt-0.5 truncate text-sm font-bold text-slate-900 group-hover:text-primary">
                              <DbText value={ev.title} />
                            </p>
                            <p className="mt-0.5 text-xs text-slate-600 tabular-nums">
                              {formatEventWindow(ev.startTime)}
                              {ev.location ? (
                                <>
                                  {" · "}
                                  <DbText value={ev.location} />
                                </>
                              ) : null}
                            </p>
                          </div>
                          <span className="inline-flex shrink-0 items-center gap-1 self-start rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-800 sm:self-center">
                            {ev.allowCtv ? w.evCtvBadge : w.evMemberBadge}
                            <ArrowRight size={12} className="text-primary" />
                          </span>
                        </Link>
                      );
                    })
                  ) : (
                    <div className="rounded-2xl bg-background p-5 text-sm text-slate-600">
                      {w.evSyncing}
                    </div>
                  )}
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600">
                    <CheckCircle2 size={14} className="shrink-0 text-emerald-600" />
                    {w.evFooterNote}
                  </span>
                  <Link
                    href="/events"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    <span>{w.evAllLink}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}

            {activeTab === "operations" && (
              <div className="mt-5 flex flex-1 flex-col justify-between gap-4 fade-in" data-ui="panel-operations">
                <div className="space-y-3.5">
                  <div className="rounded-2xl bg-background p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                        <MessageSquareText size={16} className="shrink-0 text-primary" />
                        {w.opsChannelName}
                      </span>
                      <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-800">
                        {w.opsOnlineBadge}
                      </span>
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-700">{w.opsQuote}</p>
                    <div className="mt-3 rounded-xl border border-primary/15 bg-accent/70 p-3 text-xs leading-5 text-foreground">
                      <span className="font-bold text-primary">{w.opsAiLabel}</span>
                      {w.opsAiSummary}
                    </div>
                  </div>

                  <div className="rounded-2xl bg-background p-4">
                    <p className="inline-flex items-center gap-2 text-sm font-bold text-slate-900">
                      <FileText size={16} className="shrink-0 text-primary" />
                      {w.opsVaultTitle}
                    </p>
                    <div className="mt-2.5 grid gap-2 sm:grid-cols-2">
                      <div className="rounded-xl bg-white px-3 py-2.5 text-xs">
                        <p className="font-semibold text-slate-900">Ke-hoach-Le-hoi-Viet-Nhat.pdf</p>
                        <p className="mt-0.5 text-slate-500">{w.opsDoc1Scope}</p>
                      </div>
                      <div className="rounded-xl bg-white px-3 py-2.5 text-xs">
                        <p className="font-semibold text-slate-900">So-tay-Cong-tac-vien-VJU.docx</p>
                        <p className="mt-0.5 text-slate-500">{w.opsDoc2Scope}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-sm">
                  <span className="text-xs font-medium text-slate-600">{w.opsVaultTitle}</span>
                  <Link
                    href="/documents"
                    className="inline-flex items-center gap-1.5 font-semibold text-primary hover:underline"
                  >
                    <span>{w.opsOpenVaultLink}</span>
                    <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
