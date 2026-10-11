"use client";
import { useCallback, useSyncExternalStore } from "react";

const THEME_KEY = "vju-theme";
const THEME_EVENT = "vju-theme-change";

function getStoredTheme(): boolean {
  if (typeof window === "undefined") return false;

  try {
    const stored = localStorage.getItem(THEME_KEY);
    if (stored === "dark" || stored === "light") {
      return stored === "dark";
    }
  } catch {
    // ignore storage failures
  }

  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

function applyTheme(nextDark: boolean) {
  if (typeof document !== "undefined") {
    document.documentElement.classList.toggle("dark", nextDark);
  }

  try {
    localStorage.setItem(THEME_KEY, nextDark ? "dark" : "light");
  } catch {
    // ignore storage failures
  }

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(THEME_EVENT));
  }
}

function subscribeTheme(callback: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  const onStorage = (event: StorageEvent) => {
    if (event.key === THEME_KEY) callback();
  };

  const onThemeEvent = () => callback();
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const onMediaChange = () => callback();

  window.addEventListener("storage", onStorage);
  window.addEventListener(THEME_EVENT, onThemeEvent);
  if (typeof media.addEventListener === "function") {
    media.addEventListener("change", onMediaChange);
  } else {
    media.addListener(onMediaChange);
  }

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(THEME_EVENT, onThemeEvent);
    if (typeof media.removeEventListener === "function") {
      media.removeEventListener("change", onMediaChange);
    } else {
      media.removeListener(onMediaChange);
    }
  };
}

export function useThemePreference() {
  const dark = useSyncExternalStore(subscribeTheme, getStoredTheme, () => false);

  const toggleTheme = useCallback(() => {
    applyTheme(!dark);
  }, [dark]);

  return { dark, toggleTheme };
}
