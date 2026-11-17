"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ArrowRight, ChevronLeft, ChevronRight } from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { SessionUser } from "@/types";
import { formatLocalizedCopy } from "./DbText";
import { HomeSiteHeader } from "./HomeSiteHeader";

const SLIDE_INTERVAL_MS = 6500;

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

      <section className="relative isolate min-h-[520px] overflow-hidden bg-slate-950 sm:min-h-[590px] lg:min-h-[640px]">
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
        <div className="absolute inset-0 -z-10 bg-slate-950/62" />

        <div className="mx-auto flex min-h-[520px] max-w-[1380px] flex-col justify-between px-5 pb-7 pt-12 sm:min-h-[590px] sm:px-8 sm:pb-8 sm:pt-16 lg:min-h-[640px] lg:px-12 lg:pb-9 lg:pt-20">
          <div className="my-auto max-w-[680px]">
            <div key={`${locale}-${currentSlide.src}`} className="fade-in" aria-live="polite">
              <p className="text-sm font-semibold text-primary-on-dark sm:text-[15px]">
                {currentSlide.kicker}
              </p>
              <h1 className="mt-3 font-serif text-[30px] font-semibold leading-[1.12] tracking-[-0.02em] text-white sm:text-[46px] lg:text-[54px]">
                {currentSlide.titleLine1}
                <br />
                {currentSlide.titleLine2Prefix}
                <span className="italic text-primary-on-dark">{currentSlide.titleLine2Highlight}</span>
              </h1>
              <p className="mt-4 min-h-[84px] max-w-[56ch] text-base font-normal leading-7 text-white/95 sm:mt-5 sm:text-[17px] sm:leading-8">
                {formatLocalizedCopy(currentSlide.lead, locale)}
              </p>
            </div>

            <div className="mt-6 flex flex-col gap-3 sm:mt-7 sm:flex-row sm:flex-wrap">
              <a
                href="#cau-lac-bo"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-[15px] font-semibold text-white transition-colors hover:bg-primary-hover sm:w-auto"
              >
                <span>{m.hero.primaryCta}</span>
                <ArrowRight size={16} />
              </a>
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex min-h-12 w-full items-center justify-center rounded-xl bg-white px-6 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
                >
                  {m.hero.dashboardCta}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-white px-6 text-[15px] font-semibold text-slate-900 transition-colors hover:bg-slate-100 sm:w-auto"
                >
                  <span>{m.hero.registerCta}</span>
                  <ArrowRight size={15} className="text-primary" />
                </button>
              )}
            </div>
          </div>

          <div className="mt-10 flex flex-wrap items-center justify-between gap-3 pt-2">
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

      <section aria-label={m.facts.sectionAria} className="bg-secondary py-6 sm:py-8">
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
