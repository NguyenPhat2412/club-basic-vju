"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ReactNode, useState } from "react";
import { useThemePreference } from "@/hooks/useThemePreference";
import { I18nProvider } from "@/providers/I18nContext";

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
            staleTime: 15_000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  return (
    <QueryClientProvider client={client}>
      <I18nProvider>
        <ThemeSync>{children}</ThemeSync>
      </I18nProvider>
    </QueryClientProvider>
  );
}
