'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
} from 'react';
import {
  useBrowserStorage,
  writeBrowserStorage,
} from '@/hooks/useBrowserStorage';
import {
  defaultLocale,
  getLocaleMeta,
  LOCALE_STORAGE_KEY,
  normalizeLocale,
  setPresentationLocale,
  supportedLocales,
} from '@/i18n/config';
import { translateKey, translateUiText } from '@/i18n/translator';
import type {
  I18nContextType,
  LocaleInput,
  SupportedLocale,
  TranslationParams,
} from '@/types';

const I18nContext = createContext<I18nContextType | undefined>(undefined);

const originalTextNodeMap = new WeakMap<Text, string>();
const lastRenderedTextNodeMap = new WeakMap<Text, string>();
const originalAttributeMap = new WeakMap<Element, Record<string, string>>();

const TRANSLATABLE_ATTRIBUTES = ['placeholder', 'title', 'aria-label'] as const;
const IGNORED_TAGS = new Set(['SCRIPT', 'STYLE', 'CODE', 'PRE', 'TEXTAREA', 'NOSCRIPT']);

function shouldIgnoreNode(node: Node | null): boolean {
  if (!node) return true;
  const parent = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : node.parentElement;
  if (!parent) return true;
  if (IGNORED_TAGS.has(parent.tagName)) return true;
  if (parent.closest('[data-no-i18n="true"]')) return true;
  return false;
}

function translateTextNode(textNode: Text, locale: SupportedLocale) {
  if (shouldIgnoreNode(textNode)) return;
  const currentValue = textNode.nodeValue ?? '';
  if (!currentValue.trim()) return;

  const lastRendered = lastRenderedTextNodeMap.get(textNode);
  let baseVietnamese = originalTextNodeMap.get(textNode);

  if (baseVietnamese === undefined || (lastRendered !== undefined && currentValue !== lastRendered)) {
    baseVietnamese = currentValue;
    originalTextNodeMap.set(textNode, baseVietnamese);
  }

  const nextValue = locale === 'vi' ? baseVietnamese : translateUiText(baseVietnamese, locale);
  if (nextValue !== currentValue) {
    textNode.nodeValue = nextValue;
  }
  lastRenderedTextNodeMap.set(textNode, nextValue);
}

function translateElementAttributes(element: Element, locale: SupportedLocale) {
  if (shouldIgnoreNode(element)) return;
  let storedAttrs = originalAttributeMap.get(element);

  for (const attr of TRANSLATABLE_ATTRIBUTES) {
    const currentAttr = element.getAttribute(attr);
    if (!currentAttr || !currentAttr.trim()) continue;

    if (!storedAttrs) {
      storedAttrs = {};
      originalAttributeMap.set(element, storedAttrs);
    }

    if (!(attr in storedAttrs)) {
      storedAttrs[attr] = currentAttr;
    }

    const baseAttr = storedAttrs[attr] ?? currentAttr;
    const nextAttr = locale === 'vi' ? baseAttr : translateUiText(baseAttr, locale);
    if (nextAttr !== currentAttr) {
      element.setAttribute(attr, nextAttr);
    }
  }
}

function translateSubtree(root: Node, locale: SupportedLocale) {
  if (typeof document === 'undefined') return;

  if (root.nodeType === Node.TEXT_NODE) {
    translateTextNode(root as Text, locale);
    return;
  }

  if (root.nodeType === Node.ELEMENT_NODE) {
    translateElementAttributes(root as Element, locale);
  }

  const walker = document.createTreeWalker(
    root,
    NodeFilter.SHOW_TEXT | NodeFilter.SHOW_ELEMENT,
  );

  let current = walker.nextNode();
  while (current) {
    if (current.nodeType === Node.TEXT_NODE) {
      translateTextNode(current as Text, locale);
    } else if (current.nodeType === Node.ELEMENT_NODE) {
      translateElementAttributes(current as Element, locale);
    }
    current = walker.nextNode();
  }
}

export function I18nProvider({ children }: { children: React.ReactNode }) {
  const storedLocaleRaw = useBrowserStorage(LOCALE_STORAGE_KEY, defaultLocale);
  const locale = useMemo(
    () => normalizeLocale(storedLocaleRaw),
    [storedLocaleRaw],
  );
  const localeMeta = useMemo(() => getLocaleMeta(locale), [locale]);

  // Keep presentation locale in sync for non-React formatters & API headers
  setPresentationLocale(locale);

  const setLocale = useCallback((nextLocaleInput: LocaleInput) => {
    const normalized = normalizeLocale(nextLocaleInput);
    setPresentationLocale(normalized);
    writeBrowserStorage(LOCALE_STORAGE_KEY, normalized);
  }, []);

  // Support ?lang=vi|en|ja or ?locale=vi|en|ja on initial URL load
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const urlLocale = params.get('lang') ?? params.get('locale');
    if (urlLocale) {
      const normalized = normalizeLocale(urlLocale);
      if (normalized !== locale) {
        writeBrowserStorage(LOCALE_STORAGE_KEY, normalized);
      }
    }
  }, [locale]);

  // Update <html lang="..."> and translate DOM tree whenever locale changes or DOM mutates
  useEffect(() => {
    setPresentationLocale(locale);
    if (typeof document === 'undefined') return;

    document.documentElement.lang = locale;
    if (document.body) {
      translateSubtree(document.body, locale);
    }

    let rafId: number | null = null;
    const pendingRoots = new Set<Node>();

    const flushMutations = () => {
      rafId = null;
      pendingRoots.forEach((node) => {
        if (node.isConnected) {
          translateSubtree(node, locale);
        }
      });
      pendingRoots.clear();
    };

    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        if (mutation.type === 'characterData' && mutation.target) {
          pendingRoots.add(mutation.target);
        } else if (mutation.type === 'childList') {
          mutation.addedNodes.forEach((added) => pendingRoots.add(added));
        }
      }
      if (pendingRoots.size > 0 && rafId === null) {
        rafId = window.requestAnimationFrame(flushMutations);
      }
    });

    if (document.body) {
      observer.observe(document.body, {
        childList: true,
        subtree: true,
        characterData: true,
      });
    }

    return () => {
      observer.disconnect();
      if (rafId !== null) {
        window.cancelAnimationFrame(rafId);
      }
    };
  }, [locale]);

  const t = useCallback(
    (key: string, params?: TranslationParams, fallback?: string) =>
      translateKey(locale, key, params, fallback),
    [locale],
  );

  const tr = useCallback(
    (text: string) => translateUiText(text, locale),
    [locale],
  );

  const formatDate = useCallback(
    (value: Date | number | string, options?: Intl.DateTimeFormatOptions) => {
      const date = value instanceof Date ? value : new Date(value);
      if (Number.isNaN(date.getTime())) return '—';
      return new Intl.DateTimeFormat(localeMeta.intlLocale, options).format(date);
    },
    [localeMeta.intlLocale],
  );

  const formatNumber = useCallback(
    (value: number, options?: Intl.NumberFormatOptions) =>
      new Intl.NumberFormat(localeMeta.intlLocale, options).format(value),
    [localeMeta.intlLocale],
  );

  const contextValue = useMemo<I18nContextType>(
    () => ({
      locale,
      localeMeta,
      supportedLocales,
      setLocale,
      t,
      tr,
      formatDate,
      formatNumber,
    }),
    [formatDate, formatNumber, locale, localeMeta, setLocale, t, tr],
  );

  return (
    <I18nContext.Provider value={contextValue}>{children}</I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
