export type SupportedLocale = 'vi' | 'en' | 'ja';

export type LocaleInput = SupportedLocale | string;

export type LocaleDisplayCode = 'VN' | 'EN' | 'JP';

export interface LocaleMeta {
  code: SupportedLocale;
  displayCode: LocaleDisplayCode;
  name: string;
  nativeName: string;
  intlLocale: string;
}

export type TranslationParams = Record<string, string | number>;

export interface MessageDictionary {
  [key: string]: string | MessageDictionary;
}

export interface I18nContextType {
  locale: SupportedLocale;
  localeMeta: LocaleMeta;
  supportedLocales: readonly SupportedLocale[];
  setLocale: (nextLocale: LocaleInput) => void;
  t: (key: string, params?: TranslationParams, fallback?: string) => string;
  tr: (text: string) => string;
  formatDate: (
    value: Date | number | string,
    options?: Intl.DateTimeFormatOptions,
  ) => string;
  formatNumber: (value: number, options?: Intl.NumberFormatOptions) => string;
}
