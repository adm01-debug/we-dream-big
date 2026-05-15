import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { useCatalogState } from "@/hooks/useCatalogState";
import { BrowserRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ProductsProvider } from "@/contexts/ProductsContext";
import { AuthProvider } from "@/contexts/AuthContext";
import { ThemeProvider } from "@/contexts/ThemeContext";
import React from "react";

// =================================================================
// TODO(vitest-hang): este arquivo trava o vitest worker pool em
// deadlock (workers em futex_wait_queue_me, main em ep_poll, sem
// progresso por 15+ min). Causa raiz não identificada — provavelmente
// timer/subscription perpétuo em useCatalogState (7 useEffect + 3
// setTimeout) que não é desmontado mesmo com cleanup do renderHook.
//
// Histórico: este teste foi escrito em 03/mai/2026 e revertido em
// 07/mai/2026 (commit 7380beb74), nunca rodou no CI desde então.
// Excluído do baseline ESLint, sem ownership claro.
//
// Quando retomar: investigar se cleanup do unmount está liberando
// todos os timers, e considerar mockar fetchNextPage / subscriptions.
// =================================================================

// Mock dependencies
vi.mock("@/integrations/supabase/client", () => {
  const mockAuth = {
    onAuthStateChange: vi.fn(() => ({
      data: { subscription: { unsubscribe: vi.fn() } },
    })),
    getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  };
  
  return {
    supabase: {
      auth: mockAuth,
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        gte: vi.fn().mockReturnThis(),
        single: vi.fn(),
        update: vi.fn().mockReturnThis(),
      })),
      functions: {
        invoke: vi.fn(),
      },
      rpc: vi.fn(),
    },
  };
});

vi.mock("@/lib/external-db/bridge", () => ({
  invokeBatchBridge: vi.fn().mockResolvedValue([
    { success: true, data: { records: [], count: 0 } }
  ]),
  invokeExternalDb: vi.fn().mockResolvedValue({ records: [], count: 0 }),
}));

describe.skip("useCatalogState", () => {
  let queryClient: QueryClient;

  beforeEach(() => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <ThemeProvider>
          <AuthProvider>
            <ProductsProvider>
              {children}
            </ProductsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  it("should initialize with default values", () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });
    
    expect(result.current.searchQuery).toBe("");
    expect(result.current.viewMode).toBe("grid");
    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.paginatedProducts).toEqual([]);
  });

  it("should update search query correctly", async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });
    
    await waitFor(() => {
      result.current.handleSearch("test search");
    });

    expect(result.current.searchQuery).toBe("test search");
  });

  it("should reset filters correctly", async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });
    
    await waitFor(() => {
      result.current.setFilters({ ...result.current.filters, inStock: true });
    });
    
    expect(result.current.activeFiltersCount).toBe(1);

    await waitFor(() => {
      result.current.resetFilters();
    });

    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.searchQuery).toBe("");
  });
});