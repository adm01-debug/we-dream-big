/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { useStockAlerts } from './useStockAlerts';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

let mockData: any[] = [];
let mockError: any = null;
let capturedSelect = '';

const chain: any = {};
const methods = ['eq', 'neq', 'lt', 'gt', 'in', 'order', 'limit'];
for (const m of methods) {
  chain[m] = vi.fn(() => chain);
}
chain.select = vi.fn((sel: string) => {
  capturedSelect = sel;
  return chain;
});
chain.then = (resolve: any) => resolve({ data: mockData, error: mockError });
chain.catch = () => chain;

const mockFrom = vi.fn(() => chain);

vi.mock('@/lib/supabase-direct', () => ({
  supabase: { from: (...args: any[]) => mockFrom(...args) },
  resolveTable: (t: string) => t,
  handleQueryError: () => [],
}));

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

const wrapper = ({ children }: { children: React.ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe('useStockAlerts integration', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    queryClient.clear();
    mockData = [];
    mockError = null;
    capturedSelect = '';
  });

  it('should NOT include supplier_name or image_url in the select query', async () => {
    mockData = [
      {
        id: '1',
        name: 'Test Product',
        sku: 'SKU123',
        stock_quantity: 5,
        min_quantity: 10,
        brand: 'Brand X',
        primary_image_url: 'http://img.com/1.jpg',
        images: ['http://img.com/1.jpg'],
      },
    ];

    const { result } = renderHook(() => useStockAlerts(50, 10), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const fields = capturedSelect.split(',').map((f: string) => f.trim());
    expect(fields).not.toContain('supplier_name');
    expect(fields).not.toContain('image_url');
    expect(capturedSelect).toContain('brand');
    expect(capturedSelect).toContain('primary_image_url');
  });

  it('should map brand to supplier field correctly', async () => {
    mockData = [
      {
        id: 'p1',
        name: 'Mapped Product',
        sku: 'SKU-M',
        stock_quantity: 2,
        brand: 'External Supplier',
      },
    ];

    const { result } = renderHook(() => useStockAlerts(), { wrapper });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data?.[0].supplier).toBe('External Supplier');
  });
});
