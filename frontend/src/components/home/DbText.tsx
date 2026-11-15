"use client";

import { useEffect, useState } from "react";
import { hasVietnameseDiacritics, queueAutoTranslate } from "@/i18n/auto-translate";
import { keepWords } from "@/lib/utils";
import { useI18n } from "@/providers/I18nContext";
import type { SupportedLocale } from "@/types";

export function formatLocalizedCopy(text: string, locale: SupportedLocale): string {
  return locale === "vi" ? keepWords(text) : text;
}

export function DbText({ value }: { value?: string | null }) {
  const { locale, tr } = useI18n();
  const [autoPair, setAutoPair] = useState<{ key: string; val: string } | null>(null);

  const raw = value ?? "";
  const translated = locale === "vi" ? raw : tr(raw);
  const cacheKey = `${locale}:${raw}`;

  useEffect(() => {
    if (locale === "vi" || !raw || translated !== raw || !hasVietnameseDiacritics(raw)) {
      return;
    }
    let cancelled = false;
    queueAutoTranslate(raw, locale, (res) => {
      if (!cancelled) {
        setAutoPair({ key: cacheKey, val: res });
      }
    });
    return () => {
      cancelled = true;
    };
  }, [cacheKey, locale, raw, translated]);

  if (!raw) return null;
  if (locale === "vi") return <>{raw}</>;
  if (translated !== raw) return <>{translated}</>;
  return <>{autoPair?.key === cacheKey ? autoPair.val : raw}</>;
}
