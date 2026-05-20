import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useCatalogState } from '@/hooks/products/useCatalogState';
import { BrowserRouter } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ProductsProvider } from '@/contexts/ProductsContext';
import { AuthProvider } from '@/contexts/AuthContext';
import { ThemeProvider } from '@/contexts/ThemeContext';
import React from 'react';

// Mock all internal hooks used by useCatalogState to avoid side effects and hangs.
// O SUT é importado do caminho profundo (@/hooks/products/useCatalogState) para
// permanecer real; aqui mockamos o barril @/hooks/products de onde o SUT importa
// suas dependências. Um único mock por módulo (vi.mock é hoisted e o último vence).
// IMPORTANTE: cada hook mockado retorna SEMPRE a MESMA referência (singletons
// definidos dentro da factory). Retornar objetos/Maps/arrays novos a cada render
// faria as deps de useMemo/useEffect do SUT mudarem em todo render → loop infinito
// de re-render (o teste travava com timeout).
vi.mock('@/hooks/products', () => {
  const emptyArr: unknown[] = [];
  const emptyMap = new Map();
  const catalog = {
    data: { pages: [{ products: emptyArr, totalEstimate: 0 }] },
    isLoading: false,
    isFetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: vi.fn(),
    refetch: vi.fn(),
  };
  const filterResult = { productIds: emptyArr, hasFilter: false, isLoading: false };
  const externalCats = { data: emptyArr };
  const realStats = { data: null };
  const ranking = { data: emptyMap };
  const colors = { data: emptyMap };
  const fuzzy = { results: emptyArr, hasSearch: false };
  return {
    useProductsCatalog: vi.fn(() => catalog),
    useProductsByMaterial: vi.fn(() => filterResult),
    useProductsByCategory: vi.fn(() => filterResult),
    useExternalCategoriesQuery: vi.fn(() => externalCats),
    useCatalogRealStats: vi.fn(() => realStats),
    useSupplierSalesRanking: vi.fn(() => ranking),
    useColorEnrichment: vi.fn(() => colors),
    useProductFuzzySearch: vi.fn(() => fuzzy),
  };
});

// useCatalogFiltering é importado pelo SUT via caminho profundo, não pelo barril.
vi.mock('@/hooks/products/useCatalogFiltering', () => {
  const empty: unknown[] = [];
  return {
    useCatalogFiltering: vi.fn((args) => args.realProducts ?? empty),
  };
});

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

vi.mock('@/hooks/intelligence', () => {
  const ranking = { data: new Map() };
  return {
    usePromoSalesRanking: vi.fn(() => ranking),
  };
});

vi.mock('@/hooks/favorites', () => ({
  useFavoriteQuickAdd: vi.fn(() => ({
    handleFavoriteClick: vi.fn(),
    defaultList: null,
    addToList: vi.fn(),
  })),
}));

vi.mock('@/hooks/ui', () => ({
  useToast: () => ({ toast: vi.fn() }),
}));

// Providers reais disparam chamadas Supabase (auth.refreshSession) que travam
// no ambiente de teste. Mockamos como passthrough; o SUT só usa registerProducts.
vi.mock('@/contexts/AuthContext', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => children,
  useAuth: () => ({ user: null, session: null, isLoading: false, roles: [], isDev: false }),
}));

vi.mock('@/contexts/ProductsContext', () => ({
  ProductsProvider: ({ children }: { children: React.ReactNode }) => children,
  useProductsContext: () => ({
    products: [],
    isLoading: false,
    getProductById: vi.fn(),
    getProductsByIds: vi.fn(() => []),
    registerProducts: vi.fn(),
  }),
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
