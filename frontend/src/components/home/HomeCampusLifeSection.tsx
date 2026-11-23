"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { HOME_MESSAGES } from "@/i18n/home-messages";
import { useI18n } from "@/providers/I18nContext";
import { formatLocalizedCopy } from "./DbText";

export function HomeCampusLifeSection() {
  const { locale } = useI18n();
  const m = HOME_MESSAGES[locale];

  return (
    <section id="lich-su-kien" className="scroll-mt-20 bg-white py-16 sm:py-22">
      <div className="mx-auto grid max-w-[1380px] gap-10 px-5 sm:px-8 lg:grid-cols-[0.86fr_1.14fr] lg:items-center lg:gap-14 lg:px-12">
        <div>
          <p className="text-sm font-semibold text-primary">{m.campusLife.kicker}</p>
          <h2 className="mt-2 max-w-lg font-serif text-3xl font-semibold leading-[1.15] text-slate-900 sm:text-[38px]">
            {formatLocalizedCopy(m.campusLife.title, locale)}
          </h2>
          <p className="mt-4 max-w-lg text-base leading-7 text-slate-700">
            {m.campusLife.bodyPart1}
            <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
              {m.campusLife.campusMyDinh}
            </mark>
            {m.campusLife.bodyPart2}
            <mark className="rounded bg-accent px-1.5 py-0.5 font-semibold text-primary">
              {m.campusLife.campusHoaLac}
            </mark>
            {m.campusLife.bodyPart3}
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link
              href="/events"
              className="inline-flex h-11 items-center gap-2 rounded-xl bg-primary px-5 text-sm font-semibold text-white transition-colors hover:bg-primary-hover"
            >
              <span>{m.campusLife.openEventsCta}</span>
              <ArrowRight size={15} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="overflow-hidden rounded-2xl bg-background sm:col-span-2">
            <div
              className="h-52 w-full bg-cover bg-center sm:h-68"
              style={{ backgroundImage: "url('/images/clubs/vjua/gallery-2.jpg')" }}
            />
            <div className="px-5 py-4">
              <p className="text-xs font-semibold text-primary">{m.campusLife.mainPhotoKicker}</p>
              <p className="mt-0.5 text-[15px] font-bold text-slate-900">
                {formatLocalizedCopy(m.campusLife.mainPhotoTitle, locale)}
              </p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-background">
            <div
              className="h-40 w-full bg-cover bg-center"
              style={{ backgroundImage: "url('/images/clubs/monozukuri/gallery-2.jpg')" }}
            />
            <div className="p-4">
              <p className="text-[15px] font-bold text-slate-900">{m.campusLife.card1Title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{m.campusLife.card1Desc}</p>
            </div>
          </div>
          <div className="overflow-hidden rounded-2xl bg-background">
            <div
              className="h-40 w-full bg-cover bg-center"
              style={{ backgroundImage: "url('/images/clubs/ouvevju/cover.jpg')" }}
            />
            <div className="p-4">
              <p className="text-[15px] font-bold text-slate-900">{m.campusLife.card2Title}</p>
              <p className="mt-1 text-sm leading-6 text-slate-600">{m.campusLife.card2Desc}</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
