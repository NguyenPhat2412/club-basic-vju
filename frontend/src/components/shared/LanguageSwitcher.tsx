'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Check, ChevronDown, Globe } from 'lucide-react';
import { getLocaleMeta, normalizeLocale } from '@/i18n/config';
import { cn } from '@/lib/utils';
import { useI18n } from '@/providers/I18nContext';
import type { LocaleInput, SupportedLocale } from '@/types';

interface LocaleFlagProps {
  locale: LocaleInput;
  className?: string;
}

export function LocaleFlag({ locale, className = 'w-4 h-3' }: LocaleFlagProps) {
  const code = normalizeLocale(locale);

  if (code === 'vi') {
    return (
      <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        className={cn(
          'inline-block shrink-0 rounded-[2px] shadow-2xs ring-1 ring-black/10',
          className,
        )}
      >
        <rect width="24" height="16" fill="#DA251D" />
        <polygon
          points="12,3.2 13.15,6.7 16.8,6.7 13.85,8.85 14.95,12.35 12,10.2 9.05,12.35 10.15,8.85 7.2,6.7 10.85,6.7"
          fill="#FFCD00"
        />
      </svg>
    );
  }

  if (code === 'ja') {
    return (
      <svg
        viewBox="0 0 24 16"
        aria-hidden="true"
        className={cn(
          'inline-block shrink-0 rounded-[2px] shadow-2xs ring-1 ring-black/15',
          className,
        )}
      >
        <rect width="24" height="16" fill="#FFFFFF" />
        <circle cx="12" cy="8" r="4.4" fill="#BC002D" />
      </svg>
    );
  }

  return (
    <svg
      viewBox="0 0 24 16"
      aria-hidden="true"
      className={cn(
        'inline-block shrink-0 rounded-[2px] shadow-2xs ring-1 ring-black/10',
        className,
      )}
    >
      <rect width="24" height="16" fill="#B22234" />
      <rect y="2.46" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="4.92" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="7.38" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="9.84" width="24" height="1.23" fill="#FFFFFF" />
      <rect y="12.3" width="24" height="1.23" fill="#FFFFFF" />
      <rect width="10.4" height="8.61" fill="#3C3B6E" />
      <g fill="#FFFFFF">
        <circle cx="2" cy="1.8" r="0.55" />
        <circle cx="4.2" cy="1.8" r="0.55" />
        <circle cx="6.4" cy="1.8" r="0.55" />
        <circle cx="8.6" cy="1.8" r="0.55" />
        <circle cx="3.1" cy="3.4" r="0.55" />
        <circle cx="5.3" cy="3.4" r="0.55" />
        <circle cx="7.5" cy="3.4" r="0.55" />
        <circle cx="2" cy="5" r="0.55" />
        <circle cx="4.2" cy="5" r="0.55" />
        <circle cx="6.4" cy="5" r="0.55" />
        <circle cx="8.6" cy="5" r="0.55" />
        <circle cx="3.1" cy="6.6" r="0.55" />
        <circle cx="5.3" cy="6.6" r="0.55" />
        <circle cx="7.5" cy="6.6" r="0.55" />
      </g>
    </svg>
  );
}

export interface LanguageSwitcherProps {
  variant?: 'dropdown' | 'segmented';
  size?: 'sm' | 'md';
  showNativeName?: boolean;
  className?: string;
}

export function LanguageSwitcher({
  variant = 'dropdown',
  size = 'sm',
  showNativeName = false,
  className,
}: LanguageSwitcherProps) {
  const { locale, localeMeta, supportedLocales, setLocale, t } = useI18n();
  const [open, setOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  if (variant !== 'segmented') {
    return (
      <div
        ref={dropdownRef}
        data-no-i18n="true"
        className={cn('relative inline-block shrink-0', className)}
      >
        <button
          type="button"
          onClick={() => setOpen((prev) => !prev)}
          aria-label={t('topbar.switchLanguage')}
          aria-haspopup="listbox"
          aria-expanded={open}
          title={`${localeMeta.nativeName} (${localeMeta.displayCode})`}
          className={cn(
            'inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg border border-slate-200 bg-white font-semibold text-slate-800 shadow-2xs transition-colors hover:border-primary/40 hover:bg-slate-50',
            size === 'sm' ? 'h-8 px-2.5 text-xs' : 'h-9 px-3 text-xs sm:text-sm',
          )}
        >
          <LocaleFlag locale={locale} className="h-3.5 w-5" />
          <span>{showNativeName ? localeMeta.nativeName : localeMeta.displayCode}</span>
          <ChevronDown
            size={13}
            className={cn('text-slate-500 transition-transform duration-150', open && 'rotate-180 text-primary')}
          />
        </button>

        {open && (
          <div
            role="listbox"
            aria-label={t('common.language')}
            className="absolute right-0 top-full z-50 mt-1.5 w-44 overflow-hidden rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl"
          >
            <div className="flex items-center gap-1.5 border-b border-slate-100 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
              <Globe size={11} className="text-primary" />
              <span>{t('common.language')}</span>
            </div>
            {supportedLocales.map((code) => {
              const meta = getLocaleMeta(code);
              const active = code === locale;
              return (
                <button
                  key={code}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    setLocale(code);
                    setOpen(false);
                  }}
                  className={cn(
                    'mt-0.5 flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs font-medium transition-colors',
                    active
                      ? 'bg-primary/10 font-bold text-primary'
                      : 'text-slate-700 hover:bg-slate-100',
                  )}
                >
                  <span className="flex items-center gap-2.5">
                    <LocaleFlag locale={code} className="h-3.5 w-5" />
                    <span>{meta.nativeName}</span>
                  </span>
                  <span className="flex items-center gap-1.5">
                    <span className="font-mono text-[10px] font-semibold text-slate-400">
                      {meta.displayCode}
                    </span>
                    {active && <Check size={13} className="text-primary" />}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  return (
    <div
      role="group"
      aria-label={t('topbar.switchLanguage')}
      data-no-i18n="true"
      className={cn(
        'inline-flex items-center rounded-lg border border-border/80 bg-secondary/50 p-0.5',
        className,
      )}
    >
      {supportedLocales.map((code: SupportedLocale) => {
        const meta = getLocaleMeta(code);
        const active = code === locale;
        return (
          <button
            key={code}
            type="button"
            onClick={() => setLocale(code)}
            title={`${meta.nativeName} (${meta.displayCode})`}
            aria-pressed={active}
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md font-semibold transition-all',
              size === 'sm' ? 'px-2 py-1 text-[11px]' : 'px-2.5 py-1.5 text-xs',
              active
                ? 'bg-card text-primary shadow-2xs ring-1 ring-border/70'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <LocaleFlag locale={code} className="h-2.5 w-3.5" />
            <span>{showNativeName ? meta.nativeName : meta.displayCode}</span>
          </button>
        );
      })}
    </div>
  );
}
