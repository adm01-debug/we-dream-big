/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useSimilarProducts } from './useSimilarProducts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React from 'react';

const fromResults: Record<string, { data: any; error: any }> = {};

const createChain = (table: string) => {
  const chain: any = {};
  const methods = ['select', 'eq', 'neq', 'in', 'limit', 'order'];
  for (const m of methods) {
    chain[m] = vi.fn(() => {
      const result = fromResults[table];
      if (result) {
        chain.then = (resolve: any) => resolve(result);
        (chain as any)[Symbol.toStringTag] = 'Promise';
      }
      return chain;
    });
  }
  chain.then = (resolve: any) => resolve(fromResults[table] ?? { data: [], error: null });
  chain.catch = () => chain;
  return chain;
};

const mockFrom = vi.fn((table: string) => createChain(table));

vi.mock('@/lib/supabase-direct', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
  resolveTable: (t: string) => t,
  handleQueryError: (_hook: string, _table: string, _err: any) => [],
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const mockProduct = {
  id: 'prod-123',
  name: 'Produto Original',
  supplier_id: 'supp-456',
  category_id: 'cat-789',
  supplier: { id: 'supp-456' },
} as any;

describe('useSimilarProducts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    Object.keys(fromResults).forEach((k) => delete fromResults[k]);
  });

  it('deve retornar lista vazia se o produto for nulo', async () => {
    const { result } = renderHook(() => useSimilarProducts(null), {
      wrapper: createWrapper(),
    });
    expect(result.current.data).toBeUndefined();
    expect(mockFrom).not.toHaveBeenCalled();
  });

  it('estratégia 1: deve retornar produtos da tabela product_relationships', async () => {
    fromResults['product_relationships'] = {
      data: [{ related_product_id: 'rel-1' }, { related_product_id: 'rel-2' }],
      error: null,
    };
    fromResults['products'] = {
      data: [
        {
          id: 'rel-1',
          name: 'Similar 1',
          sale_price: 10,
          primary_image_url: 'img1.jpg',
          brand: 'Marca A',
          sku: 'S1',
          supplier_id: 's1',
          stock_quantity: 5,
          category_id: 'c1',
        },
        {
          id: 'rel-2',
          name: 'Similar 2',
          sale_price: 20,
          primary_image_url: 'img2.jpg',
          brand: 'Marca B',
          sku: 'S2',
          supplier_id: 's2',
          stock_quantity: 10,
          category_id: 'c2',
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useSimilarProducts(mockProduct), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Similar 1');
    expect(mockFrom).toHaveBeenCalledWith('product_relationships');
  });

  it('deve filtrar produtos com preço zero ou inválido', async () => {
    fromResults['product_relationships'] = {
      data: [{ related_product_id: 'rel-1' }],
      error: null,
    };
    fromResults['products'] = {
      data: [
        {
          id: 'rel-1',
          name: 'Grátis',
          sale_price: 0,
          primary_image_url: 'img.jpg',
          sku: 'S0',
          supplier_id: 's1',
          stock_quantity: 0,
          brand: '',
          category_id: '',
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useSimilarProducts(mockProduct), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(0);
  });

  it('deve aplicar fallback de imagem caso primary_image_url seja nulo', async () => {
    fromResults['product_relationships'] = {
      data: [{ related_product_id: 'rel-1' }],
      error: null,
    };
    fromResults['products'] = {
      data: [
        {
          id: 'rel-1',
          name: 'Sem Foto',
          sale_price: 10,
          primary_image_url: null,
          sku: 'S1',
          supplier_id: 's1',
          stock_quantity: 1,
          brand: '',
          category_id: '',
        },
      ],
      error: null,
    };

    const { result } = renderHook(() => useSimilarProducts(mockProduct), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].image_url).toBe('/placeholder.svg');
  });
});
