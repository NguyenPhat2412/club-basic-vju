"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { useThemePreference } from "@/hooks/useThemePreference";
import { I18nProvider } from "@/providers/I18nContext";
import { Toaster } from "@/components/ui/toast";

function ThemeSync({ children }: { children: ReactNode }) {
  useThemePreference();
  return <>{children}</>;
}

export function AppProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            // revisiting a page within a minute reuses the cache; coming back to the tab resyncs stale data
            staleTime: 60_000,
            gcTime: 10 * 60_000,
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeSync>{children}</ThemeSync>
        <Toaster />
      </I18nProvider>
    </QueryClientProvider>
  );
}
