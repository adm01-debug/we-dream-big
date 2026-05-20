import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCatalogState } from '@/hooks/products/useCatalogState';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import React from 'react';

// Mock all internal hooks used by useCatalogState to avoid side effects and hangs

// IMPORTANTE: retornar SEMPRE as MESMAS referências por chamada. Objetos/Maps
// recriados a cada render entram em deps de useMemo/useEffect do useCatalogState
// e disparam re-render infinito (trava o teste).
vi.mock('@/hooks/products', () => {
  const catalog = {
    data: { pages: [{ products: [], totalEstimate: 0 }] },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
  const byMaterial = { productIds: [], hasFilter: false, isLoading: false };
  const byCategory = { productIds: [], hasFilter: false, isLoading: false };
  const extCats = { data: [] };
  const realStats = { data: null };
  const supplierRanking = { data: new Map() };
  const colorEnrichment = { data: new Map() };
  const fuzzy = { results: [], hasSearch: false };
  return {
    useProductsCatalog: vi.fn(() => catalog),
    useProductsByMaterial: vi.fn(() => byMaterial),
    useProductsByCategory: vi.fn(() => byCategory),
    useExternalCategoriesQuery: vi.fn(() => extCats),
    useCatalogRealStats: vi.fn(() => realStats),
    useSupplierSalesRanking: vi.fn(() => supplierRanking),
    useColorEnrichment: vi.fn(() => colorEnrichment),
    useProductFuzzySearch: vi.fn(() => fuzzy),
  };
});

vi.mock('@/hooks/products/useCatalogFiltering', () => ({
  useCatalogFiltering: vi.fn((args) => args.realProducts || []),
}));

vi.mock('@/hooks/common', () => {
  const search = {
    suggestions: [],
    quickSuggestions: [],
    history: [],
    addToHistory: vi.fn(),
    clearHistory: vi.fn(),
  };
  return {
    useDebounce: vi.fn((v) => v),
    useSearch: vi.fn(() => search),
  };
});

vi.mock('@/hooks/intelligence', () => {
  const promo = { data: new Map() };
  return { usePromoSalesRanking: vi.fn(() => promo) };
});

vi.mock('@/hooks/favorites', () => ({
  useFavoriteQuickAdd: vi.fn(() => ({
    handleFavoriteClick: vi.fn(),
    defaultList: null,
    addToList: vi.fn(),
  })),
}));

// Mock Supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    auth: {
      onAuthStateChange: vi.fn(() => ({
        data: { subscription: { unsubscribe: vi.fn() } },
      })),
      getSession: vi.fn().mockResolvedValue({ data: { session: null } }),
    },
    from: vi.fn(() => ({
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi.fn(),
    })),
    functions: {
      invoke: vi.fn(),
    },
  },
}));

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

describe('useCatalogState', () => {
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
            <ProductsProvider>{children}</ProductsProvider>
          </AuthProvider>
        </ThemeProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    expect(result.current.searchQuery).toBe('');
    expect(result.current.viewMode).toBe('grid');
    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.paginatedProducts).toEqual([]);
  });

  it('should update search query correctly', async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    await act(async () => {
      result.current.handleSearch('test search');
    });

    expect(result.current.searchQuery).toBe('test search');
  });

  it('should reset filters correctly', async () => {
    const { result } = renderHook(() => useCatalogState(), { wrapper });

    await act(async () => {
      result.current.setFilters({
        ...result.current.filters,
        inStock: true,
        categories: [123],
      });
    });

    // categories is an array of numbers in FilterState
    expect(result.current.activeFiltersCount).toBe(2); // inStock + 1 category

    await act(async () => {
      result.current.resetFilters();
    });

    expect(result.current.activeFiltersCount).toBe(0);
    expect(result.current.searchQuery).toBe('');
  });
});
