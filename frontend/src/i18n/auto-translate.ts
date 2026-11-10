import { API_BASE } from '@/lib/api/client';
import type { SupportedLocale } from '@/types';

const AUTO_CACHE_KEY = 'club_basic_vju_auto_i18n_v1';
const MAX_CACHE_ENTRIES_PER_LOCALE = 800;
const BATCH_DEBOUNCE_MS = 80;
const MAX_BATCH_SIZE = 25;

const VIETNAMESE_DIACRITIC_REGEX =
  /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;

type AutoCacheStore = {
  en: Record<string, string>;
  ja: Record<string, string>;
};

const memoryCache: AutoCacheStore = {
  en: {},
  ja: {},
};

let cacheHydrated = false;
let persistTimer: number | null = null;
const syncedCatalogLocales = new Set<'en' | 'ja'>();

const pendingBatchByLocale: Record<'en' | 'ja', Set<string>> = {
  en: new Set(),
  ja: new Set(),
};

const batchTimers: Record<'en' | 'ja', number | null> = {
  en: null,
  ja: null,
};

const waitingCallbacks = new Map<string, Set<(translated: string) => void>>();

function hydrateCache() {
  if (cacheHydrated || typeof window === 'undefined') return;
  cacheHydrated = true;
  try {
    const raw = window.localStorage.getItem(AUTO_CACHE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<AutoCacheStore>;
    if (parsed.en && typeof parsed.en === 'object') {
      Object.assign(memoryCache.en, parsed.en);
    }
    if (parsed.ja && typeof parsed.ja === 'object') {
      Object.assign(memoryCache.ja, parsed.ja);
    }
  } catch {
    // Ignore storage read errors
  }
}

function schedulePersistCache() {
  if (typeof window === 'undefined' || persistTimer !== null) return;
  persistTimer = window.setTimeout(() => {
    persistTimer = null;
    try {
      const trimEntries = (record: Record<string, string>) => {
        const keys = Object.keys(record);
        if (keys.length <= MAX_CACHE_ENTRIES_PER_LOCALE) return record;
        const trimmed: Record<string, string> = {};
        for (const key of keys.slice(keys.length - MAX_CACHE_ENTRIES_PER_LOCALE)) {
          trimmed[key] = record[key];
        }
        return trimmed;
      };
      const payload: AutoCacheStore = {
        en: trimEntries(memoryCache.en),
        ja: trimEntries(memoryCache.ja),
      };
      window.localStorage.setItem(AUTO_CACHE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage quota errors
    }
  }, 500);
}

export function hasVietnameseDiacritics(text: string): boolean {
  if (!text || text.length < 2) return false;
  return VIETNAMESE_DIACRITIC_REGEX.test(text);
}

export function getCachedAutoTranslation(
  normalizedText: string,
  locale: SupportedLocale,
): string | undefined {
  if (locale === 'vi') return undefined;
  hydrateCache();
  return memoryCache[locale][normalizedText];
}

export async function syncBackendI18nCatalog(
  locale: SupportedLocale,
  onCatalogUpdated?: () => void,
): Promise<void> {
  if (locale === 'vi' || typeof window === 'undefined') return;
  hydrateCache();
  if (syncedCatalogLocales.has(locale)) return;
  syncedCatalogLocales.add(locale);

  try {
    const res = await fetch(
      `${API_BASE}/api/v1/public/i18n/translations?locale=${encodeURIComponent(locale)}`,
      { method: 'GET', credentials: 'omit' },
    );
    if (!res.ok) return;
    const data = (await res.json()) as Record<string, string>;
    if (!data || typeof data !== 'object') return;
    let added = false;
    for (const [src, dst] of Object.entries(data)) {
      if (src && dst && memoryCache[locale][src] !== dst) {
        memoryCache[locale][src] = dst;
        added = true;
      }
    }
    if (added) {
      schedulePersistCache();
      onCatalogUpdated?.();
    }
  } catch {
    // Allow retry later if backend was temporarily unreachable
    syncedCatalogLocales.delete(locale);
  }
}

async function requestBackendBatchTranslate(
  locale: 'en' | 'ja',
  texts: string[],
): Promise<Record<string, string>> {
  try {
    const response = await fetch(`${API_BASE}/api/v1/public/i18n/translate-batch`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'omit',
      body: JSON.stringify({ locale, texts }),
    });
    if (response.ok) {
      const body = (await response.json()) as {
        translations?: Record<string, string>;
      };
      if (body.translations && typeof body.translations === 'object') {
        return body.translations;
      }
    }
  } catch {
    // Fall through to client fallback if backend is unreachable
  }

  const fallbackResult: Record<string, string> = {};
  await Promise.all(
    texts.map(async (text) => {
      try {
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=vi&tl=${locale}&dt=t&q=${encodeURIComponent(
          text,
        )}`;
        const res = await fetch(url, { method: 'GET', credentials: 'omit' });
        if (!res.ok) return;
        const data = (await res.json()) as unknown;
        if (!Array.isArray(data) || !Array.isArray(data[0])) return;
        const segments = data[0] as unknown[];
        const combined = segments
          .map((seg) => (Array.isArray(seg) && typeof seg[0] === 'string' ? seg[0] : ''))
          .join('')
          .trim();
        if (combined && combined !== text) {
          fallbackResult[text] = combined;
        }
      } catch {
        // Ignore individual item failure
      }
    }),
  );
  return fallbackResult;
}

function flushBatchForLocale(locale: 'en' | 'ja') {
  batchTimers[locale] = null;
  const pendingSet = pendingBatchByLocale[locale];
  if (pendingSet.size === 0) return;

  const allPending = Array.from(pendingSet);
  const currentChunk = allPending.slice(0, MAX_BATCH_SIZE);
  currentChunk.forEach((item) => pendingSet.delete(item));

  if (pendingSet.size > 0) {
    batchTimers[locale] = window.setTimeout(() => flushBatchForLocale(locale), BATCH_DEBOUNCE_MS);
  }

  void requestBackendBatchTranslate(locale, currentChunk).then((translationsMap) => {
    let anySaved = false;
    for (const src of currentChunk) {
      const requestKey = `${locale}:::${src}`;
      const callbacks = waitingCallbacks.get(requestKey);
      waitingCallbacks.delete(requestKey);

      const translatedCore = translationsMap[src];
      if (translatedCore && translatedCore !== src) {
        memoryCache[locale][src] = translatedCore;
        anySaved = true;
        callbacks?.forEach((cb) => cb(translatedCore));
      }
    }
    if (anySaved) {
      schedulePersistCache();
    }
  });
}

export function queueAutoTranslate(
  rawText: string,
  locale: SupportedLocale,
  onTranslated: (translatedWithWhitespace: string) => void,
): void {
  if (locale === 'vi' || typeof window === 'undefined') return;
  const normalized = rawText.replace(/\s+/g, ' ').trim();
  if (!hasVietnameseDiacritics(normalized)) return;

  const leadingSpace = rawText.match(/^\s*/)?.[0] ?? '';
  const trailingSpace = rawText.match(/\s*$/)?.[0] ?? '';

  const cached = getCachedAutoTranslation(normalized, locale);
  if (cached) {
    onTranslated(`${leadingSpace}${cached}${trailingSpace}`);
    return;
  }

  const requestKey = `${locale}:::${normalized}`;
  const wrappedCallback = (translatedCore: string) => {
    onTranslated(`${leadingSpace}${translatedCore}${trailingSpace}`);
  };

  let callbackSet = waitingCallbacks.get(requestKey);
  if (!callbackSet) {
    callbackSet = new Set();
    waitingCallbacks.set(requestKey, callbackSet);
  }
  callbackSet.add(wrappedCallback);

  pendingBatchByLocale[locale].add(normalized);
  if (batchTimers[locale] === null) {
    batchTimers[locale] = window.setTimeout(
      () => flushBatchForLocale(locale),
      BATCH_DEBOUNCE_MS,
    );
  }
}
