"use client";
import { useCallback, useEffect } from "react";

const THEME_KEY = "vju-theme";

function enforceLightTheme() {
  if (typeof document !== "undefined") {
    document.documentElement.classList.remove("dark");
  }
  try {
    if (typeof window !== "undefined") {
      localStorage.setItem(THEME_KEY, "light");
    }
  } catch {
    // ignore storage failures
  }
}

export function useThemePreference() {
  useEffect(() => {
    enforceLightTheme();
  }, []);

  const toggleTheme = useCallback(() => {
    enforceLightTheme();
  }, []);

  return { dark: false, toggleTheme };
}
