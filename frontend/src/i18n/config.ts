import type { LocaleInput, LocaleMeta, SupportedLocale } from '@/types';

export const LOCALE_STORAGE_KEY = 'vju_locale';

export const defaultLocale: SupportedLocale = 'vi';

export const supportedLocales = ['vi', 'en', 'ja'] as const;

export const localeMetaMap: Record<SupportedLocale, LocaleMeta> = {
  vi: {
    code: 'vi',
    displayCode: 'VN',
    name: 'Vietnamese',
    nativeName: 'Tiếng Việt',
    intlLocale: 'vi-VN',
  },
  en: {
    code: 'en',
    displayCode: 'EN',
    name: 'English',
    nativeName: 'English',
    intlLocale: 'en-US',
  },
  ja: {
    code: 'ja',
    displayCode: 'JP',
    name: 'Japanese',
    nativeName: '日本語',
    intlLocale: 'ja-JP',
  },
};

const localeAliases: Record<string, SupportedLocale> = {
  vi: 'vi',
  vn: 'vi',
  'vi-vn': 'vi',
  vietnamese: 'vi',
  en: 'en',
  us: 'en',
  uk: 'en',
  'en-us': 'en',
  'en-gb': 'en',
  english: 'en',
  ja: 'ja',
  jp: 'ja',
  'ja-jp': 'ja',
  japanese: 'ja',
};

export function normalizeLocale(input?: LocaleInput | null): SupportedLocale {
  if (!input) return defaultLocale;
  const cleaned = String(input).trim().toLowerCase();
  if (cleaned in localeAliases) {
    return localeAliases[cleaned];
  }
  const baseCode = cleaned.split(/[-_]/)[0];
  if (baseCode && baseCode in localeAliases) {
    return localeAliases[baseCode];
  }
  return defaultLocale;
}

export function getLocaleMeta(locale?: LocaleInput | null): LocaleMeta {
  return localeMetaMap[normalizeLocale(locale)];
}

let activePresentationLocale: SupportedLocale = defaultLocale;

export function setPresentationLocale(locale?: LocaleInput | null): SupportedLocale {
  activePresentationLocale = normalizeLocale(locale);
  return activePresentationLocale;
}

export function getPresentationLocale(): SupportedLocale {
  return activePresentationLocale;
}

export function getIntlLocale(locale?: LocaleInput | null): string {
  const resolved = locale ? normalizeLocale(locale) : activePresentationLocale;
  return localeMetaMap[resolved].intlLocale;
}
