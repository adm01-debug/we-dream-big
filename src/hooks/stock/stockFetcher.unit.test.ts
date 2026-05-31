
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fetchAndProcessStockData } from './stockFetcher';
import { supabase } from '@/integrations/supabase/client';

// Mock do logger para evitar poluição no console dos testes
vi.mock('@/lib/logger', () => ({
  logger: {
    log: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

describe('stockFetcher Resilience', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deve carregar dados via PostgREST mesmo se a Edge Function retornar 410', async () => {
    // 1. Simular falha na Edge Function (410 Gone)
    const invokeSpy = vi.spyOn(supabase.functions, 'invoke').mockResolvedValue({
      data: null,
      error: { message: 'Edge function returned 410: Error, {"error":"Gone"}', status: 410 } as any,
    });

    // 2. Simular sucesso no PostgREST (.from())
    // O stockFetcher usa .from('v_products_public'), .from('product_variants'), etc.
    const fromSpy = vi.spyOn(supabase, 'from').mockImplementation((table: string) => {
      const mockData = {
        v_products_public: [{ id: 'p1', name: 'Produto Teste', sku: 'SKU1', stock_quantity: 10, is_active: true }],
        product_variants: [{ id: 'v1', product_id: 'p1', sku: 'SKU1-V1', stock_quantity: 5, is_active: true }],
        variant_supplier_sources: [],
        categories: [],
        v_suppliers_public: [],
        suppliers: [],
      };

      return {
        select: vi.fn().mockReturnThis(),
        is: vi.fn().mockReturnThis(),
        in: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        range: vi.fn().mockResolvedValue({
          data: (mockData as any)[table] || [],
          error: null,
          count: (mockData as any)[table]?.length || 0,
        }),
      } as any;
    });

    // 3. Executar busca de estoque
    const result = await fetchAndProcessStockData();

    // 4. Validar resultados
    expect(result.productStocks.length).toBe(1);
    expect(result.productStocks[0].productName).toBe('Produto Teste');
    
    // 5. Confirmar que .from() foi chamado (resiliência)
    expect(fromSpy).toHaveBeenCalledWith('v_products_public');
    
    // O stockFetcher.ts atual não deve sequer chamar o invoke, 
    // mas se o fizesse e falhasse, o teste passaria se os dados viessem do .from()
  });

  it('deve tratar resposta vazia do PostgREST sem quebrar (blank screen prevention)', async () => {
    // Simular retorno vazio do banco
    vi.spyOn(supabase, 'from').mockReturnValue({
      select: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({ data: [], error: null, count: 0 }),
    } as any);

    const result = await fetchAndProcessStockData();

    expect(result.productStocks).toEqual([]);
    expect(result.alerts).toEqual([]);
    expect(result.futureStock).toEqual([]);
  });
});
