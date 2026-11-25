"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Mail, MapPin, Plus } from "lucide-react";
import { AuthModalMode } from "@/components/auth/AuthModal";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { SessionUser } from "@/types";
import { formatLocalizedCopy } from "./DbText";

interface HomeOnboardingFooterProps {
  user?: SessionUser;
  openAuthModal: (mode: AuthModalMode) => void;
}

const LEGAL_LINKS_COPY = {
  vi: { privacy: "Chính sách bảo mật", dataDeletion: "Hướng dẫn xoá dữ liệu" },
  en: { privacy: "Privacy Policy", dataDeletion: "Data Deletion" },
  ja: { privacy: "プライバシーポリシー", dataDeletion: "データ削除ガイド" },
} as const;

export function HomeOnboardingFooter({ user, openAuthModal }: HomeOnboardingFooterProps) {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];

  return (
    <>
      <section id="quy-trinh" className="scroll-mt-20 border-t border-border/60 bg-white py-16 sm:py-22">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div>
              <p className="text-sm font-semibold text-primary">{m.onboarding.kicker}</p>
              <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
                {formatLocalizedCopy(m.onboarding.title, locale)}
              </h2>
            </div>
            {!user && (
              <button
                type="button"
                onClick={() => openAuthModal("register")}
                className="inline-flex items-center gap-2 self-start text-sm font-semibold text-primary hover:underline sm:self-auto"
              >
                <span>{m.onboarding.createAccountLink}</span>
                <ArrowRight size={15} />
              </button>
            )}
          </div>

          <ol className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {m.onboarding.steps.map((item) => (
              <li
                key={item.stage}
                className="group flex flex-col overflow-hidden rounded-2xl bg-background transition-colors hover:bg-accent/60"
              >
                <div className="relative h-40 w-full overflow-hidden bg-slate-900">
                  <div
                    className="absolute inset-0 bg-cover transition-transform duration-500 group-hover:scale-105"
                    style={{
                      backgroundImage: `url('${item.img}')`,
                      backgroundPosition: item.pos,
                    }}
                  />
                  <div className="absolute inset-0 bg-slate-950/22" />
                  <span className="absolute left-3.5 top-3.5 inline-flex rounded-full bg-white/95 px-3 py-1 text-xs font-bold text-primary">
                    {item.stage}
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-[17px] font-bold leading-snug text-slate-900">{item.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-700">{item.desc}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section id="khoanh-khac" className="scroll-mt-20 bg-secondary py-16 sm:py-22">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="max-w-2xl">
            <p className="text-sm font-semibold text-primary">{m.galleryFaq.galleryKicker}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[40px]">
              {formatLocalizedCopy(m.galleryFaq.galleryTitle, locale)}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              {formatLocalizedCopy(m.galleryFaq.galleryLead, locale)}
            </p>
          </div>

          <div className="mt-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {m.galleryFaq.photos.map((photo) => (
              <Link
                key={photo.src}
                href="/clubs"
                className={`group relative overflow-hidden rounded-3xl bg-slate-900 ${
                  photo.wide
                    ? "h-64 sm:col-span-2 sm:h-72 lg:col-span-2"
                    : "h-56 sm:h-64 lg:h-64"
                }`}
              >
                <div
                  className="absolute inset-0 bg-cover transition-transform duration-500 group-hover:scale-105"
                  style={{
                    backgroundImage: `url('${photo.src}')`,
                    backgroundPosition: photo.pos,
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/25 transition-colors group-hover:bg-slate-950/15" />
                <span className="absolute left-3.5 top-3.5 rounded-full bg-white/95 px-3 py-1 text-[11px] font-semibold text-slate-900">
                  {photo.tag}
                </span>
                <div className="absolute inset-x-3 bottom-3 rounded-2xl bg-slate-950/75 px-3.5 py-2.5">
                  <span className="line-clamp-1 text-xs font-semibold text-white sm:text-[13px]">
                    {photo.label}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section id="hoi-dap" className="scroll-mt-20 bg-white py-16 sm:py-22">
        <div className="mx-auto grid max-w-[1380px] gap-8 px-5 sm:px-8 lg:grid-cols-12 lg:items-start lg:gap-12 lg:px-12">
          <div className="lg:col-span-5">
            <p className="text-sm font-semibold text-primary">{m.galleryFaq.faqKicker}</p>
            <h2 className="mt-2 font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[38px]">
              {m.galleryFaq.faqTitle}
            </h2>
            <p className="mt-3 text-base leading-7 text-slate-700">
              {formatLocalizedCopy(m.galleryFaq.faqLead, locale)}
            </p>

            <div className="mt-6 overflow-hidden rounded-3xl bg-background">
              <div className="relative h-44 w-full overflow-hidden bg-slate-900">
                <div
                  className="absolute inset-0 bg-cover"
                  style={{
                    backgroundImage: "url('/images/clubs/vjub/cover.jpg')",
                    backgroundPosition: "center 38%",
                  }}
                />
                <div className="absolute inset-0 bg-slate-950/28" />
                <span className="absolute left-4 top-4 rounded-full bg-card/95 px-3 py-1 text-xs font-bold text-foreground shadow-xs backdrop-blur-2xs">
                  {m.galleryFaq.faqCardBadge}
                </span>
              </div>
              <div className="p-5">
                <p className="text-base font-bold text-slate-900">{m.galleryFaq.faqCardTitle}</p>
                <p className="mt-2 text-sm leading-6 text-slate-700">
                  {m.galleryFaq.faqCardDescPrefix}
                  <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
                    {m.galleryFaq.faqCardEmailHighlight}
                  </mark>
                  {m.galleryFaq.faqCardDescSuffix}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 lg:col-span-7">
            {m.galleryFaq.faqs.map((faq, idx) => (
              <details
                key={faq.q}
                open={idx === 0}
                className="group rounded-2xl bg-background px-5 py-4 transition-colors open:bg-accent/55"
              >
                <summary className="flex cursor-pointer list-none items-start justify-between gap-3 text-[15px] font-bold text-slate-900 [&::-webkit-details-marker]:hidden">
                  <span>{faq.q}</span>
                  <Plus
                    size={18}
                    className="mt-0.5 shrink-0 text-primary transition-transform duration-200 group-open:rotate-45"
                  />
                </summary>
                <p className="mt-2.5 text-sm leading-6 text-slate-700">{faq.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-secondary/70 py-12 sm:py-16">
        <div className="mx-auto max-w-[1380px] px-5 sm:px-8 lg:px-12">
          <div className="flex flex-col items-start justify-between gap-6 rounded-3xl border border-border border-l-4 border-l-primary bg-card p-6 shadow-xs sm:p-10 lg:flex-row lg:items-center">
            <div className="max-w-2xl">
              <p className="text-sm font-semibold text-primary">{m.closing.kicker}</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold leading-[1.16] text-foreground sm:text-[36px]">
                {m.closing.titlePrefix}
                <span className="italic text-primary">{m.closing.titleHighlight}</span>
                {m.closing.titleSuffix}
              </h2>
              <p className="mt-3 text-base leading-7 text-muted-foreground">
                {formatLocalizedCopy(m.closing.lead, locale)}
              </p>
            </div>

            <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row sm:flex-wrap">
              {user ? (
                <Link
                  href="/dashboard"
                  className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover sm:w-auto"
                >
                  <span>{m.closing.dashboardCta}</span>
                  <ArrowRight size={16} />
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => openAuthModal("register")}
                  className="inline-flex h-12 w-full items-center justify-center gap-2.5 rounded-xl bg-primary px-6 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary-hover sm:w-auto"
                >
                  <span>{m.closing.joinCta}</span>
                  <ArrowRight size={16} />
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <footer className="bg-white text-slate-700">
        <div className="mx-auto grid max-w-[1380px] gap-10 px-5 py-14 sm:px-8 md:grid-cols-2 lg:grid-cols-[1.35fr_0.95fr_0.95fr_1.15fr] lg:px-12">
          <div>
            <div className="flex items-center gap-3">
              <Image
                src="/images/vju-logo.png"
                alt={m.topBar.university}
                width={42}
                height={42}
                className="size-10 shrink-0 rounded-full bg-slate-100 p-0.5 object-contain"
              />
              <div>
                <span className="block font-display text-lg font-extrabold tracking-tight text-slate-900">
                  Club<span className="text-primary">Hub</span>
                </span>
                <span className="block text-xs font-medium text-slate-500">
                  {m.topBar.logoSubFull}
                </span>
              </div>
            </div>
            <p className="mt-4 max-w-sm text-sm leading-6 text-slate-600">
              {formatLocalizedCopy(m.footer.desc, locale)}
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {m.footer.pillars.map((pillar) => (
                <span
                  key={pillar}
                  className="rounded-full bg-background px-2.5 py-1 text-xs font-semibold text-slate-700"
                >
                  {pillar}
                </span>
              ))}
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">{m.footer.studentColTitle}</p>
            <div className="mt-3.5 grid gap-2.5 text-sm text-slate-700">
              <Link className="transition-colors hover:text-primary" href="/clubs">
                {m.nav.clubsDirectory}
              </Link>
              <Link className="transition-colors hover:text-primary" href="/events">
                {m.nav.eventsRegister}
              </Link>
              <Link className="transition-colors hover:text-primary" href="/applications">
                {m.nav.myApplications}
              </Link>
              <Link className="transition-colors hover:text-primary" href="/memberships">
                {m.nav.myClubs}
              </Link>
              <Link className="transition-colors hover:text-primary" href="/notifications">
                {m.nav.notifications}
              </Link>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">{m.footer.opsColTitle}</p>
            <div className="mt-3.5 grid gap-2.5 text-sm text-slate-700">
              <Link className="transition-colors hover:text-primary" href="/dashboard">
                {m.nav.dashboard}
              </Link>
              <a className="transition-colors hover:text-primary" href="#khong-gian-so">
                {m.nav.workspaceMobile}
              </a>
              <Link className="transition-colors hover:text-primary" href="/documents">
                {m.footer.opsVaultLink}
              </Link>
              <a className="transition-colors hover:text-primary" href="#quy-trinh">
                {m.footer.opsOnboardingLink}
              </a>
              <a className="transition-colors hover:text-primary" href="#hoi-dap">
                {m.footer.opsFaqLink}
              </a>
            </div>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-900">
              {formatLocalizedCopy(m.footer.universityTitle, locale)}
            </p>
            <div className="mt-3.5 space-y-2.5 text-sm leading-6 text-slate-700">
              <p className="flex items-start gap-2">
                <MapPin size={15} className="mt-1 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-slate-900">
                    {m.footer.campusMyDinhLabel}
                  </strong>{" "}
                  {m.footer.campusMyDinhAddr}
                </span>
              </p>
              <p className="flex items-start gap-2">
                <MapPin size={15} className="mt-1 shrink-0 text-primary" />
                <span>
                  <strong className="font-semibold text-slate-900">
                    {m.footer.campusHoaLacLabel}
                  </strong>{" "}
                  {m.footer.campusHoaLacAddr}
                </span>
              </p>
              <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <Mail size={14} className="shrink-0 text-primary" />
                <span>{m.footer.studentEmailNote}</span>
              </p>
            </div>
            <a
              className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-primary hover:underline"
              href="https://vju.ac.vn"
              target="_blank"
              rel="noreferrer"
            >
              <span>{m.footer.officialSiteLabel}</span>
              <ArrowRight size={13} />
            </a>
          </div>
        </div>

        <div className="bg-background">
          <div className="mx-auto flex max-w-[1380px] flex-col gap-2 px-5 py-4 text-[13px] text-slate-600 sm:px-8 md:flex-row md:items-center md:justify-between lg:px-12">
            <span>{m.footer.copyright}</span>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
              <Link className="transition-colors hover:text-primary" href="/privacy">
                {LEGAL_LINKS_COPY[locale].privacy}
              </Link>
              <Link className="transition-colors hover:text-primary" href="/data-deletion">
                {LEGAL_LINKS_COPY[locale].dataDeletion}
              </Link>
              <span>{m.footer.imprintRight}</span>
            </div>
          </div>
        </div>
      </footer>
    </>
  );
}
