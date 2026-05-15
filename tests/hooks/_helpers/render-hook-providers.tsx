/**
 * renderHookWithProviders — wrapper padronizado para testar hooks
 * com QueryClient, Router, Tooltip e Helmet providers.
 *
 * Reaproveita os mocks globais já declarados em tests/components/render-helpers.tsx
 * (Supabase, AuthContext, sonner, react-hot-toast).
 */
import React from "react";
import { renderHook, type RenderHookOptions } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { TooltipProvider } from "@/components/ui/tooltip";
import { HelmetProvider } from "react-helmet-async";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false, gcTime: 0, staleTime: 0 },
      mutations: { retry: false },
    },
  });
}

interface ProviderOptions {
  route?: string;
  queryClient?: QueryClient;
}

export function renderHookWithProviders<TResult, TProps>(
  callback: (props: TProps) => TResult,
  options?: ProviderOptions & Omit<RenderHookOptions<TProps>, "wrapper">,
) {
  const { route = "/", queryClient = createTestQueryClient(), ...rhOptions } = options || {};

  function Wrapper({ children }: { children: React.ReactNode }) {
    return (
      <HelmetProvider>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter
            initialEntries={[route]}
            future={{ v7_startTransition: true, v7_relativeSplatPath: true }}
          >
            <TooltipProvider>{children}</TooltipProvider>
          </MemoryRouter>
        </QueryClientProvider>
      </HelmetProvider>
    );
  }

  return { ...renderHook(callback, { wrapper: Wrapper, ...rhOptions }), queryClient };
}
