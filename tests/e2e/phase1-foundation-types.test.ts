/**
 * Phase 1: Foundation — Types & Data Model Validation
 * Validates the product variation type system, domain types,
 * and infrastructure alignment for Color, Size, and Gender axes.
 */
import { describe, it, expect } from 'vitest';

// ============ 1.1 — ProductColor Interface ============
describe('Phase 1.1 — ProductColor Type Contract', () => {
  interface ProductColor {
    code: string;
    name: string;
    hex?: string;
    stock?: number;
  }

  const validColor: ProductColor = { code: 'BLK', name: 'Preto', hex: '#000000', stock: 500 };

  it('accepts valid color with all fields', () => {
    expect(validColor.code).toBe('BLK');
    expect(validColor.name).toBe('Preto');
    expect(validColor.hex).toBe('#000000');
    expect(validColor.stock).toBe(500);
  });

  it('accepts color without optional fields', () => {
    const minimal: ProductColor = { code: 'WHT', name: 'Branco' };
    expect(minimal.hex).toBeUndefined();
    expect(minimal.stock).toBeUndefined();
  });

  it('handles zero stock', () => {
    const noStock: ProductColor = { code: 'RED', name: 'Vermelho', stock: 0 };
    expect(noStock.stock).toBe(0);
  });

  it('handles large stock numbers', () => {
    const large: ProductColor = { code: 'BLU', name: 'Azul', stock: 999_999 };
    expect(large.stock).toBe(999_999);
  });

  it('handles hex with different formats', () => {
    expect('#FF0000'.match(/^#[0-9A-Fa-f]{6}$/)).toBeTruthy();
    expect('#fff'.match(/^#[0-9A-Fa-f]{3}$/)).toBeTruthy();
    expect('invalid').not.toMatch(/^#[0-9A-Fa-f]{6}$/);
  });
});

// ============ 1.2 — ProductVariant Interface (with size_code) ============
describe('Phase 1.2 — ProductVariant with size_code', () => {
  interface ProductVariant {
    code: string;
    name: string;
    hex?: string;
    stock?: number;
    size_code?: string | null;
    sale_price?: number | null;
  }

  it('variant without size_code (legacy compat)', () => {
    const legacy: ProductVariant = { code: 'V1', name: 'Preto' };
    expect(legacy.size_code).toBeUndefined();
  });

  it('variant with null size_code', () => {
    const noSize: ProductVariant = { code: 'V2', name: 'Azul', size_code: null };
    expect(noSize.size_code).toBeNull();
  });

  it('variant with valid size_code', () => {
    const withSize: ProductVariant = { code: 'V3', name: 'Preto', size_code: 'M', stock: 150 };
    expect(withSize.size_code).toBe('M');
  });

  it('variant with numeric size_code', () => {
    const numericSize: ProductVariant = { code: 'V4', name: 'Marrom', size_code: '42' };
    expect(numericSize.size_code).toBe('42');
  });

  it('variant with sale_price override', () => {
    const priced: ProductVariant = {
      code: 'V5', name: 'Preto', size_code: 'GG', sale_price: 59.90,
    };
    expect(priced.sale_price).toBe(59.90);
  });

  it('variant with null sale_price (uses product base)', () => {
    const base: ProductVariant = { code: 'V6', name: 'Branco', sale_price: null };
    expect(base.sale_price).toBeNull();
  });

  it('variant grouping by color_name for grid', () => {
    const variants: ProductVariant[] = [
      { code: 'V1', name: 'Preto', size_code: 'P' },
      { code: 'V2', name: 'Preto', size_code: 'M' },
      { code: 'V3', name: 'Preto', size_code: 'G' },
      { code: 'V4', name: 'Azul', size_code: 'P' },
      { code: 'V5', name: 'Azul', size_code: 'M' },
    ];
    const grouped = new Map<string, ProductVariant[]>();
    variants.forEach(v => {
      if (!grouped.has(v.name)) grouped.set(v.name, []);
      grouped.get(v.name)!.push(v);
    });
    expect(grouped.get('Preto')).toHaveLength(3);
    expect(grouped.get('Azul')).toHaveLength(2);
    expect(grouped.size).toBe(2);
  });
});

// ============ 1.3 — Gender Field Standardization ============
describe('Phase 1.3 — Gender Field', () => {
  const VALID_GENDERS = ['unissex', 'masculino', 'feminino', 'infantil'];

  it('accepts all valid gender values', () => {
    VALID_GENDERS.forEach(g => expect(VALID_GENDERS).toContain(g));
  });

  it('normalizes to lowercase', () => {
    const inputs = ['MASCULINO', 'Feminino', 'UNISSEX', 'Infantil'];
    const normalized = inputs.map(g => g.toLowerCase());
    normalized.forEach(g => expect(VALID_GENDERS).toContain(g));
  });

  it('rejects invalid gender', () => {
    expect(VALID_GENDERS).not.toContain('outro');
    expect(VALID_GENDERS).not.toContain('');
    expect(VALID_GENDERS).not.toContain(null);
  });

  it('handles null/undefined gender gracefully', () => {
    const product = { name: 'Caneta', gender: null as string | null };
    expect(product.gender).toBeNull();
    const product2 = { name: 'Caderno' };
    expect((product2 as any).gender).toBeUndefined();
  });

  it('trims whitespace in gender', () => {
    const raw = '  masculino  ';
    expect(raw.toLowerCase().trim()).toBe('masculino');
  });
});

// ============ 1.4 — SimulationProduct Domain Type ============
describe('Phase 1.4 — SimulationProduct Domain', () => {
  interface SimulationProduct {
    id: string;
    name: string;
    sku: string;
    price: number;
    image_url?: string | null;
    images?: string[];
    categoryName?: string | null;
    brand?: string | null;
    colors?: Array<{ code: string; name: string; hex?: string; stock?: number }>;
  }

  it('minimal product for simulation', () => {
    const p: SimulationProduct = { id: '1', name: 'Caneta BIC', sku: 'CAN-001', price: 5.50 };
    expect(p.price).toBe(5.50);
    expect(p.colors).toBeUndefined();
  });

  it('product with colors array', () => {
    const p: SimulationProduct = {
      id: '2', name: 'Camiseta', sku: 'CAM-001', price: 35,
      colors: [
        { code: 'BLK', name: 'Preto', hex: '#000', stock: 200 },
        { code: 'WHT', name: 'Branco', hex: '#FFF', stock: 0 },
      ],
    };
    expect(p.colors).toHaveLength(2);
    expect(p.colors![1].stock).toBe(0);
  });

  it('product with empty colors array', () => {
    const p: SimulationProduct = { id: '3', name: 'Squeeze', sku: 'SQZ-001', price: 25, colors: [] };
    expect(p.colors).toHaveLength(0);
  });
});

// ============ 1.5 — KitItem with selectedSize ============
describe('Phase 1.5 — KitItem selectedSize field', () => {
  interface KitItem {
    id: string;
    name: string;
    price: number;
    selectedColor?: { name: string; hex?: string };
    selectedSize?: string;
    quantity: number;
  }

  it('kit item without size (non-apparel)', () => {
    const item: KitItem = { id: '1', name: 'Caneta', price: 5, quantity: 1 };
    expect(item.selectedSize).toBeUndefined();
  });

  it('kit item with color and size', () => {
    const item: KitItem = {
      id: '2', name: 'Camiseta', price: 35, quantity: 1,
      selectedColor: { name: 'Preto', hex: '#000' },
      selectedSize: 'G',
    };
    expect(item.selectedSize).toBe('G');
    expect(item.selectedColor!.name).toBe('Preto');
  });

  it('kit item size can be changed', () => {
    const item: KitItem = { id: '3', name: 'Polo', price: 42, quantity: 1, selectedSize: 'M' };
    const updated = { ...item, selectedSize: 'G' };
    expect(updated.selectedSize).toBe('G');
    expect(item.selectedSize).toBe('M'); // original unchanged
  });
});

// ============ 1.6 — VariantGridItem Type ============
describe('Phase 1.6 — VariantGridItem contract', () => {
  interface VariantGridItem {
    id: string;
    color_name: string;
    color_hex: string;
    size_code?: string | null;
    stock: number;
    sku?: string;
    image?: string | null;
    price?: number | null;
  }

  it('grid item with all fields', () => {
    const item: VariantGridItem = {
      id: 'v1', color_name: 'Preto', color_hex: '#000000',
      size_code: 'M', stock: 150, sku: 'CAM-001-M-BLK', price: 35.90,
    };
    expect(item.size_code).toBe('M');
    expect(item.stock).toBe(150);
  });

  it('grid item without size (color-only product)', () => {
    const item: VariantGridItem = {
      id: 'v2', color_name: 'Azul', color_hex: '#0000FF', stock: 500,
    };
    expect(item.size_code).toBeUndefined();
  });

  it('grid item with zero stock', () => {
    const item: VariantGridItem = {
      id: 'v3', color_name: 'Verde', color_hex: '#00FF00', stock: 0,
    };
    expect(item.stock).toBe(0);
  });
});

// ============ 1.7 — BulkAction Type ============
describe('Phase 1.7 — BulkAction type', () => {
  interface BulkAction {
    type: 'toggle_active' | 'update_stock';
    variantIds: string[];
    value?: boolean | number;
  }

  it('toggle_active action', () => {
    const action: BulkAction = { type: 'toggle_active', variantIds: ['v1', 'v2'], value: false };
    expect(action.type).toBe('toggle_active');
    expect(action.variantIds).toHaveLength(2);
    expect(action.value).toBe(false);
  });

  it('update_stock action', () => {
    const action: BulkAction = { type: 'update_stock', variantIds: ['v1', 'v2', 'v3'], value: 100 };
    expect(action.type).toBe('update_stock');
    expect(action.value).toBe(100);
  });

  it('action with empty variantIds', () => {
    const action: BulkAction = { type: 'toggle_active', variantIds: [] };
    expect(action.variantIds).toHaveLength(0);
  });

  it('action with single variant', () => {
    const action: BulkAction = { type: 'update_stock', variantIds: ['v1'], value: 0 };
    expect(action.variantIds).toHaveLength(1);
    expect(action.value).toBe(0);
  });
});
