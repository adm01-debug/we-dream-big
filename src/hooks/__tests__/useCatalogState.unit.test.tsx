import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
// Importa o SUT pelo caminho profundo para não passar pelo mock do barrel
// `@/hooks/products` (que abaixo substitui só os hooks de dependência).
import { useCatalogState } from '@/hooks/products/useCatalogState';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import React from 'react';

// Mock manual (sem importOriginal) do barrel de produtos: substitui apenas os
// hooks de dependência consumidos por useCatalogState. Evita carregar o barrel
// real inteiro — que puxa supabase/react-query de dezenas de hooks e estoura a heap.
//
// CRÍTICO: cada hook devolve uma referência ESTÁVEL (singleton). Se devolvesse um
// objeto novo a cada chamada (ex.: `() => ({ data: new Map() })`), `realProducts`
// seria recalculado a cada render e o effect que chama `registerProducts` dispararia
// em loop → setState no contexto → re-render infinito → OOM. Em produção o
// react-query já devolve referência estável entre renders.
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
  const material = { productIds: [], hasFilter: false, isLoading: false };
  const category = { productIds: [], hasFilter: false, isLoading: false };
  const categories = { data: [] };
  const stats = { data: null };
  const emptyMap = new Map();
  const supplier = { data: emptyMap };
  const colors = { data: emptyMap };
  const fuzzy = { results: [], hasSearch: false };
  return {
    useProductsCatalog: vi.fn(() => catalog),
    useProductsByMaterial: vi.fn(() => material),
    useProductsByCategory: vi.fn(() => category),
    useExternalCategoriesQuery: vi.fn(() => categories),
    useCatalogRealStats: vi.fn(() => stats),
    useSupplierSalesRanking: vi.fn(() => supplier),
    useColorEnrichment: vi.fn(() => colors),
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
    useSearch: vi.fn(() => search),
    useDebounce: vi.fn((value: unknown) => value),
  };
});

vi.mock('@/hooks/ui', () => {
  const toastApi = { toast: vi.fn() };
  return { useToast: () => toastApi };
});

vi.mock('@/hooks/intelligence', () => {
  const ranking = { data: new Map() };
  return { usePromoSalesRanking: vi.fn(() => ranking) };
});

vi.mock('@/hooks/favorites', () => {
  const quickAdd = { handleFavoriteClick: vi.fn(), defaultList: null, addToList: vi.fn() };
  return { useFavoriteQuickAdd: vi.fn(() => quickAdd) };
});

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
