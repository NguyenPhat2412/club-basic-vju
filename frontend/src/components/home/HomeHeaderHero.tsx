"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { SessionUser } from "@/types";
import { HomeSiteHeader } from "./HomeSiteHeader";

const SLIDE_INTERVAL_MS = 6500;

const STREAMLINED_HERO = {
  vi: {
    titlePrefix: "Tìm nơi ",
    titleHighlight: "bạn thuộc về.",
    subtitle: "Khám phá 12+ câu lạc bộ và Đoàn Thanh niên VJU, ứng tuyển trực tuyến theo ban chuyên môn và theo dõi lịch hoạt động cá nhân.",
    applyCta: "Ứng tuyển CLB",
    scheduleCta: "Công việc & Lịch cá nhân",
  },
  en: {
    titlePrefix: "Find where ",
    titleHighlight: "you belong.",
    subtitle: "Explore 12+ VJU student clubs and Youth Union units, apply online by department, and track your personal schedule.",
    applyCta: "Apply to a Club",
    scheduleCta: "Tasks & Personal Schedule",
  },
  ja: {
    titlePrefix: "自分の居場所を",
    titleHighlight: "見つけよう。",
    subtitle: "VJUの12以上の学生クラブ・青年団を探索し、希望部署へオンライン応募して個人スケジュールを一元管理できます。",
    applyCta: "クラブに応募する",
    scheduleCta: "タスク・個人スケジュール",
  },
} as const;

interface HomeHeaderHeroProps {
  user?: SessionUser;
  totalClubs?: number;
  totalEvents?: number;
  ctvEventsCount?: number;
  menuOpen: boolean;
  setMenuOpen: React.Dispatch<React.SetStateAction<boolean>>;
  openAuthModal: (mode: AuthModalMode) => void;
  signOut: () => void;
}

export function HomeHeaderHero({
  user,
  totalClubs,
  totalEvents,
  ctvEventsCount = 0,
  menuOpen,
  setMenuOpen,
  openAuthModal,
  signOut,
}: HomeHeaderHeroProps) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];
  const heroCopy = STREAMLINED_HERO[locale];
  const slides = m.hero.slides;
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const timer = window.setInterval(
      () => setActiveSlide((i) => (i + 1) % slides.length),
      SLIDE_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [activeSlide, slides.length]);

  const currentSlide = slides[activeSlide] ?? slides[0];

  return (
    <>
      <div className="bg-primary px-4 py-2 text-center text-[13px] font-medium text-primary-foreground">
        <span>{m.topBar.university}</span>
        <span className="hidden sm:inline">
          {" · "}
          <span className="font-semibold text-primary-on-dark">{m.topBar.campuses}</span>
        </span>
      </div>

      <HomeSiteHeader
        user={user}
        menuOpen={menuOpen}
        setMenuOpen={setMenuOpen}
        openAuthModal={openAuthModal}
        signOut={signOut}
      />

      <section className="relative isolate min-h-[420px] overflow-hidden bg-slate-950 sm:min-h-[470px] lg:min-h-[520px]">
        {slides.map((slide, i) => (
          <div
            key={slide.src}
            aria-hidden
            className={`absolute inset-0 -z-20 bg-cover transition-opacity duration-1000 ${
              i === activeSlide ? "opacity-100" : "opacity-0"
            }`}
            style={{ backgroundImage: `url('${slide.src}')`, backgroundPosition: slide.position }}
          />
        ))}
        <div className="absolute inset-0 -z-10 bg-slate-950/65" />

        <div className="mx-auto flex min-h-[420px] max-w-[1380px] flex-col justify-between px-5 pb-6 pt-10 sm:min-h-[470px] sm:px-8 sm:pb-7 sm:pt-12 lg:min-h-[520px] lg:px-12 lg:pb-8 lg:pt-14">
          <div className="my-auto max-w-[660px]">
            <p className="text-sm font-semibold text-primary-on-dark sm:text-[15px]">
              {currentSlide.kicker}
            </p>
            <h1 className="mt-2.5 font-serif text-[32px] font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[54px]">
              {heroCopy.titlePrefix}
              <span className="italic text-primary-on-dark">{heroCopy.titleHighlight}</span>
            </h1>
            <p className="mt-3.5 max-w-[54ch] text-base font-normal leading-7 text-white/95 sm:text-[17px]">
              {heroCopy.subtitle}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
              <a
                href="#cau-lac-bo"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-[15px] font-semibold text-primary-foreground shadow-sm transition-colors hover:bg-primary-hover sm:w-auto"
              >
                <span>{heroCopy.applyCta}</span>
                <ArrowRight size={16} />
              </a>
              {user ? (
                <>
                  <Link
                    href="/dashboard"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-card px-5 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
                  >
                    {m.hero.dashboardCta}
                  </Link>
                  <Link
                    href="/schedule"
                    className="inline-flex min-h-12 w-full items-center justify-center rounded-xl border border-white/30 bg-slate-950/45 px-5 text-[15px] font-semibold text-white transition-colors hover:bg-slate-900/70 sm:w-auto"
                  >
                    {heroCopy.scheduleCta}
                  </Link>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-card px-6 text-[15px] font-semibold text-foreground transition-colors hover:bg-secondary sm:w-auto"
                >
                  <span>{m.hero.registerCta}</span>
                  <ArrowRight size={15} className="text-primary" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-8 flex flex-wrap items-center justify-between gap-3 pt-2">
            <span className="rounded-full bg-slate-950/60 px-3.5 py-1.5 text-[13px] font-medium text-white/95">
              {currentSlide.caption}
            </span>

            <div className="flex items-center gap-2 rounded-full bg-slate-950/60 px-2 py-1">
              <button
                type="button"
                onClick={() => setActiveSlide((activeSlide - 1 + slides.length) % slides.length)}
                aria-label={m.hero.prevSlideAria}
                className="grid size-7 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              >
                <ChevronLeft size={17} />
              </button>

              <div className="flex items-center gap-0.5">
                {slides.map((slide, i) => (
                  <button
                    key={slide.src}
                    type="button"
                    onClick={() => setActiveSlide(i)}
                    aria-label={m.hero.viewSlideAria(slide.caption)}
                    aria-current={i === activeSlide}
                    className="group grid h-6 w-4 place-items-center"
                  >
                    <span
                      className={`h-2 rounded-full transition-colors ${
                        i === activeSlide
                          ? "w-4 bg-primary-on-dark"
                          : "w-2 bg-white/55 group-hover:bg-white/90"
                      }`}
                    />
                  </button>
                ))}
              </div>

              <button
                type="button"
                onClick={() => setActiveSlide((activeSlide + 1) % slides.length)}
                aria-label={m.hero.nextSlideAria}
                className="grid size-7 place-items-center rounded-full text-white/85 transition-colors hover:bg-white/15 hover:text-white"
              >
                <ChevronRight size={17} />
              </button>
            </div>
          </div>
        </div>
      </section>

      <section aria-label={m.facts.sectionAria} className="bg-secondary py-5 sm:py-6">
        <div className="mx-auto grid max-w-[1380px] gap-3.5 px-5 sm:grid-cols-2 sm:px-8 lg:grid-cols-4 lg:px-12">
          <Link
            href="/clubs"
            className="group rounded-2xl bg-card p-5 transition-colors hover:bg-accent/75"
          >
            <p className="font-serif text-2xl font-semibold text-primary tabular-nums sm:text-[26px]">
              {m.facts.clubsTitle(totalClubs)}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{m.facts.clubsDesc}</p>
          </Link>

          <Link
            href="/events"
            className="group rounded-2xl bg-card p-5 transition-colors hover:bg-accent/75"
          >
            <p className="font-serif text-2xl font-semibold text-slate-900 tabular-nums sm:text-[26px]">
              {m.facts.eventsTitle(totalEvents)}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {ctvEventsCount > 0 ? (
                <>
                  {m.facts.eventsCtvPrefix}
                  <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
                    {m.facts.eventsCtvHighlight(ctvEventsCount)}
                  </mark>
                  {m.facts.eventsCtvSuffix}
                </>
              ) : (
                m.facts.eventsFallback
              )}
            </p>
          </Link>

          <Link
            href="/applications"
            className="group rounded-2xl bg-card p-5 transition-colors hover:bg-accent/75"
          >
            <p className="font-serif text-2xl font-semibold text-slate-900 sm:text-[26px]">
              {m.facts.deptsTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">
              {m.facts.deptsPrefix}
              <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
                {m.facts.deptsHighlight}
              </mark>
              {m.facts.deptsSuffix}
            </p>
          </Link>

          <a
            href="#khong-gian-so"
            className="group rounded-2xl bg-card p-5 transition-colors hover:bg-accent/75"
          >
            <p className="font-serif text-2xl font-semibold text-slate-900 sm:text-[26px]">
              {m.facts.opsTitle}
            </p>
            <p className="mt-1 text-sm leading-6 text-slate-700">{m.facts.opsDesc}</p>
          </a>
        </div>
      </section>
    </>
  );
}
