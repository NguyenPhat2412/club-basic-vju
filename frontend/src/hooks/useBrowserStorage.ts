'use client';

import { useCallback, useSyncExternalStore } from 'react';

const STORAGE_EVENT_NAME = 'vju:browser-storage';

function subscribeToBrowserStorage(key: string, callback: () => void) {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleStorage = (event: StorageEvent) => {
    if (event.key === null || event.key === key) {
      callback();
    }
  };

  const handleCustomStorage = (event: Event) => {
    const customEvent = event as CustomEvent<{ key?: string }>;
    if (!customEvent.detail?.key || customEvent.detail.key === key) {
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  window.addEventListener(STORAGE_EVENT_NAME, handleCustomStorage as EventListener);

  return () => {
    window.removeEventListener('storage', handleStorage);
    window.removeEventListener(STORAGE_EVENT_NAME, handleCustomStorage as EventListener);
  };
}

export function readBrowserStorage(key: string, fallback: string | null = null): string | null {
  if (typeof window === 'undefined') {
    return fallback;
  }
  try {
    return window.localStorage.getItem(key) ?? fallback;
  } catch {
    return fallback;
  }
}

export function writeBrowserStorage(key: string, value: string | null): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (value === null) {
      window.localStorage.removeItem(key);
    } else {
      window.localStorage.setItem(key, value);
    }
    window.dispatchEvent(new CustomEvent(STORAGE_EVENT_NAME, { detail: { key } }));
  } catch {
    // Ignore storage quota or private mode restrictions
  }
}

export function useBrowserStorage(key: string, fallback: string | null = null): string | null {
  const subscribe = useCallback(
    (onStoreChange: () => void) => subscribeToBrowserStorage(key, onStoreChange),
    [key],
  );

  const getSnapshot = useCallback(() => readBrowserStorage(key, fallback), [fallback, key]);
  const getServerSnapshot = useCallback(() => fallback, [fallback]);

  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
