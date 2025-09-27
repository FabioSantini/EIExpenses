"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { DataServiceProvider } from "@/services/data-service-provider";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";
import { useState, useEffect } from "react";
import { settingsService } from "@/services/settings-service";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000, // 1 minute
        refetchOnWindowFocus: false,
      },
    },
  }));

  const [theme, setTheme] = useState<"light" | "dark" | "system">("light");

  useEffect(() => {
    const settings = settingsService.getSettings();
    setTheme(settings.ui.theme);
  }, []);

  return (
    <SessionProvider>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider
          attribute="class"
          defaultTheme={theme}
          enableSystem
          disableTransitionOnChange
        >
          <DataServiceProvider>
            {children}
            <Toaster />
          </DataServiceProvider>
        </ThemeProvider>
      </QueryClientProvider>
    </SessionProvider>
  );
}