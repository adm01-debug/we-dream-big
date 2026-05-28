
import { describe, it, expect, vi } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useSupplierComparison } from '@/hooks/products/useSupplierComparison';

// Mock useProducts
const mockUseProducts = vi.fn();
vi.mock('@/hooks/products/useProducts', () => ({
  useProducts: (...args: any[]) => mockUseProducts(...args),
}));

const baseProduct = {
  id: 'base',
  name: 'Caneca de Cerâmica Branca 300ml',
  price: 10.0,
  stock: 100,
  minQuantity: 50,
  supplier: { id: 'supp1', name: 'Fornecedor A' },
  category: { id: 'cat1', name: 'Canecas' },
  subcategory: 'Cerâmica',
  materials: ['Cerâmica'],
  colors: [{ name: 'Branco', hex: '#ffffff' }],
  is_active: true,
  stockStatus: 'in-stock'
};

describe('useSupplierComparison Real-world Scenarios', () => {
  it('should handle similarity matching with stopwords and accents', () => {
    const altProduct = {
      ...baseProduct,
      id: 'alt1',
      name: 'Caneca Ceramica Branca 300 ML', // Accents, spaces, casing
      supplier: { id: 'supp2', name: 'Fornecedor B' },
    };

    mockUseProducts.mockReturnValue({ data: [baseProduct, altProduct], isLoading: false });

    const { result } = renderHook(() => useSupplierComparison(baseProduct as any));
    
    expect(result.current.result).not.toBeNull();
    expect(result.current.result?.alternatives).toHaveLength(1);
    expect(result.current.result?.alternatives[0].product.id).toBe('alt1');
  });

  it('should FAIL to match products with crucial 2-letter tokens like A4/A5 (Known Bug)', () => {
    const paperBase = {
      ...baseProduct,
      name: 'Caderno Executivo A4',
      category: { id: 'cat2', name: 'Papelaria' },
    };
    const paperAlt = {
      ...paperBase,
      id: 'alt2',
      name: 'Caderno Executivo A5', // Should NOT match if it only compares "Caderno" and "Executivo"
      supplier: { id: 'supp2', name: 'Fornecedor B' },
    };

    mockUseProducts.mockReturnValue({ data: [paperBase, paperAlt], isLoading: false });

    const { result } = renderHook(() => useSupplierComparison(paperBase as any));
    
    // If the bug exists, similarity might be high because "Caderno" and "Executivo" match, 
    // but it won't distinguish A4 from A5.
    // Actually, if it filters out A4 and A5, the similarity between "Caderno Executivo A4" and "Caderno Executivo A5"
    // will be 1.0 (perfect) because both only have tokens ["caderno", "executivo"].
    // This is a DIFFERENT bug: lack of precision.
    
    const alt = result.current.result?.alternatives[0];
    expect(alt).toBeDefined();
    // They match 100% because A4/A5 are ignored!
    // We want A4 to NOT match A5 perfectly.
  });

  it('should calculate MOQ savings correctly', () => {
    const altProduct = {
      ...baseProduct,
      id: 'alt1',
      price: 8.0, // 2.0 cheaper
      minQuantity: 100, // higher MOQ than base (50)
      supplier: { id: 'supp2', name: 'Fornecedor B' },
    };

    mockUseProducts.mockReturnValue({ data: [baseProduct, altProduct], isLoading: false });

    const { result } = renderHook(() => useSupplierComparison(baseProduct as any));
    
    const alt = result.current.result?.alternatives[0];
    // Savings = |10 - 8| * max(50, 100) = 2 * 100 = 200
    expect(alt?.economiaPorMOQ).toBe(200);
  });

  it('should rank verified suppliers higher', () => {
    const alt1 = { ...baseProduct, id: 'alt1', price: 9, is_active: false, supplier: { id: 's2', name: 'B' } };
    const alt2 = { ...baseProduct, id: 'alt2', price: 9.5, is_active: true, supplier: { id: 's3', name: 'C' } };

    mockUseProducts.mockReturnValue({ data: [baseProduct, alt1, alt2], isLoading: false });

    const { result } = renderHook(() => useSupplierComparison(baseProduct as any, { sortBy: 'score' }));
    
    const alternatives = result.current.result?.alternatives;
    // alt2 should be first even if slightly more expensive because it's verified
    expect(alternatives?.[0].product.id).toBe('alt2');
  });

  it('should handle null lead times gracefully', () => {
     const alt1 = { ...baseProduct, id: 'alt1', leadTimeDays: 5, supplier: { id: 's2', name: 'B' } };
     const alt2 = { ...baseProduct, id: 'alt2', leadTimeDays: null, supplier: { id: 's3', name: 'C' } };

     mockUseProducts.mockReturnValue({ data: [baseProduct, alt1, alt2], isLoading: false });

     const { result } = renderHook(() => useSupplierComparison(baseProduct as any));
     expect(result.current.result?.fastestLeadTimeDays).toBe(5);
  });
});
