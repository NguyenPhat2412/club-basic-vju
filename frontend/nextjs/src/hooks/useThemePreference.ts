"use client";
import { useEffect, useState } from "react";

const THEME_KEY = "vju-theme";

export function useThemePreference() {
  const [dark, setDark] = useState(() => {
    if (typeof window === "undefined") return false;
    const stored = (() => {
      try {
        return localStorage.getItem(THEME_KEY);
      } catch {
        return null;
      }
    })();
    return stored ? stored === "dark" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    try {
      localStorage.setItem(THEME_KEY, dark ? "dark" : "light");
    } catch {
      // ignore storage failures
    }
  }, [dark]);

  const toggleTheme = () => {
    setDark((current) => {
      const next = !current;
      document.documentElement.classList.toggle("dark", next);
      try {
        localStorage.setItem(THEME_KEY, next ? "dark" : "light");
      } catch {
        // ignore storage failures
      }
      return next;
    });
  };

  return { dark, toggleTheme };
}
