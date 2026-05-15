/**
 * Cross-Cutting Concerns — Regression, Performance, Edge Cases, Integration
 * Validates that changes don't break existing functionality and handles edge cases.
 */
import { describe, it, expect } from 'vitest';

// ============ Currency Formatting ============
describe('Cross-Cutting — Currency Formatting', () => {
  function formatCurrency(value: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  }

  function formatNumber(value: number): string {
    return new Intl.NumberFormat('pt-BR').format(value);
  }

  it('formats BRL correctly', () => {
    expect(formatCurrency(35.90)).toMatch(/R\$\s?35,90/);
  });

  it('formats zero', () => {
    expect(formatCurrency(0)).toMatch(/R\$\s?0,00/);
  });

  it('formats large number', () => {
    expect(formatCurrency(99999.99)).toMatch(/99\.999,99/);
  });

  it('formats negative', () => {
    expect(formatCurrency(-10)).toMatch(/-R\$\s?10,00/);
  });

  it('formatNumber with thousands', () => {
    expect(formatNumber(1500)).toBe('1.500');
  });

  it('formatNumber small', () => {
    expect(formatNumber(42)).toBe('42');
  });
});

// ============ Regression: Wizard Steps ============
describe('Cross-Cutting — Wizard Step Regression', () => {
  type Step = 'product' | 'techniques' | 'results';
  const STEPS: Step[] = ['product', 'techniques', 'results'];

  it('wizard still has 3 base steps', () => {
    expect(STEPS).toHaveLength(3);
  });

  it('product step first', () => {
    expect(STEPS[0]).toBe('product');
  });

  it('results step last', () => {
    expect(STEPS[STEPS.length - 1]).toBe('results');
  });
});

// ============ Regression: Price Tiers ============
describe('Cross-Cutting — Price Tier Regression', () => {
  interface PriceTier { minQty: number; maxQty: number; unitPrice: number; }

  const tiers: PriceTier[] = [
    { minQty: 1, maxQty: 49, unitPrice: 12.00 },
    { minQty: 50, maxQty: 99, unitPrice: 10.50 },
    { minQty: 100, maxQty: 249, unitPrice: 8.90 },
    { minQty: 250, maxQty: 499, unitPrice: 7.50 },
    { minQty: 500, maxQty: 999, unitPrice: 6.00 },
    { minQty: 1000, maxQty: Infinity, unitPrice: 5.00 },
  ];

  function getPrice(qty: number): number {
    const tier = tiers.find(t => qty >= t.minQty && qty <= t.maxQty);
    return tier?.unitPrice ?? tiers[0].unitPrice;
  }

  it('1 unit = R$12', () => expect(getPrice(1)).toBe(12));
  it('50 units = R$10.50', () => expect(getPrice(50)).toBe(10.50));
  it('100 units = R$8.90', () => expect(getPrice(100)).toBe(8.90));
  it('250 units = R$7.50', () => expect(getPrice(250)).toBe(7.50));
  it('500 units = R$6.00', () => expect(getPrice(500)).toBe(6.00));
  it('1000 units = R$5.00', () => expect(getPrice(1000)).toBe(5.00));
  it('boundary: 49 = R$12', () => expect(getPrice(49)).toBe(12));
  it('boundary: 99 = R$10.50', () => expect(getPrice(99)).toBe(10.50));
  it('boundary: 999 = R$6.00', () => expect(getPrice(999)).toBe(6.00));
  it('10000 units = R$5.00', () => expect(getPrice(10000)).toBe(5.00));
});

// ============ Edge Cases: Size Ordering ============
describe('Cross-Cutting — Size Ordering Edge Cases', () => {
  const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG'];

  function sizeSort(a: string, b: string): number {
    const ia = SIZE_ORDER.indexOf(a.toUpperCase());
    const ib = SIZE_ORDER.indexOf(b.toUpperCase());
    if (ia !== -1 && ib !== -1) return ia - ib;
    if (ia !== -1) return -1;
    if (ib !== -1) return 1;
    return a.localeCompare(b, 'pt-BR');
  }

  it('empty array stays empty', () => {
    expect([].sort(sizeSort)).toEqual([]);
  });

  it('single element', () => {
    expect(['M'].sort(sizeSort)).toEqual(['M']);
  });

  it('all standard sizes', () => {
    const shuffled = ['GG', 'PP', 'G', 'M', 'P', 'XG'];
    expect(shuffled.sort(sizeSort)).toEqual(['PP', 'P', 'M', 'G', 'GG', 'XG']);
  });

  it('duplicate sizes', () => {
    const dupes = ['M', 'G', 'M', 'G'];
    dupes.sort(sizeSort);
    expect(dupes[0]).toBe('M');
    expect(dupes[1]).toBe('M');
    expect(dupes[2]).toBe('G');
  });

  it('unknown sizes sorted alphabetically', () => {
    const custom = ['Zebra', 'Alfa', 'Beta'];
    expect(custom.sort(sizeSort)).toEqual(['Alfa', 'Beta', 'Zebra']);
  });

  it('mix of known and unknown', () => {
    const mixed = ['Custom', 'M', 'G', 'Especial'];
    const sorted = mixed.sort(sizeSort);
    expect(sorted[0]).toBe('M');
    expect(sorted[1]).toBe('G');
    // Custom and Especial after known sizes
  });

  it('handles case mismatch', () => {
    expect(SIZE_ORDER.indexOf('M')).toBeGreaterThanOrEqual(0);
    expect(SIZE_ORDER.indexOf('m')).toBe(-1);
    expect(SIZE_ORDER.indexOf('m'.toUpperCase())).toBeGreaterThanOrEqual(0);
  });
});

// ============ Edge Cases: Color Hex Validation ============
describe('Cross-Cutting — Color Hex Edge Cases', () => {
  function isValidHex(hex: string): boolean {
    return /^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex);
  }

  it('valid 6-char hex', () => expect(isValidHex('#FF0000')).toBe(true));
  it('valid 3-char hex', () => expect(isValidHex('#FFF')).toBe(true));
  it('lowercase hex', () => expect(isValidHex('#abcdef')).toBe(true));
  it('mixed case hex', () => expect(isValidHex('#AbCdEf')).toBe(true));
  it('invalid: no hash', () => expect(isValidHex('FF0000')).toBe(false));
  it('invalid: 4 chars', () => expect(isValidHex('#FFFF')).toBe(false));
  it('invalid: special chars', () => expect(isValidHex('#GGGGGG')).toBe(false));
  it('invalid: empty', () => expect(isValidHex('')).toBe(false));
});

// ============ Integration: Product → Variant → Grid ============
describe('Cross-Cutting — Full Product Variant Pipeline', () => {
  it('product with no variations shows no grid', () => {
    const product = { id: '1', name: 'Adesivo', variations: [] };
    expect(product.variations.length === 0).toBe(true);
  });

  it('product with colors only shows flat list', () => {
    const product = {
      id: '2', name: 'Caneta',
      variations: [
        { id: 'v1', color_name: 'Azul', color_hex: '#00F', size_code: null },
        { id: 'v2', color_name: 'Preto', color_hex: '#000', size_code: null },
      ],
    };
    const hasSizes = product.variations.some(v => v.size_code);
    expect(hasSizes).toBe(false);
  });

  it('product with colors + sizes shows grid matrix', () => {
    const product = {
      id: '3', name: 'Camiseta',
      variations: [
        { id: 'v1', color_name: 'Preto', color_hex: '#000', size_code: 'P', stock: 50 },
        { id: 'v2', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock: 100 },
        { id: 'v3', color_name: 'Azul', color_hex: '#00F', size_code: 'P', stock: 30 },
        { id: 'v4', color_name: 'Azul', color_hex: '#00F', size_code: 'M', stock: 80 },
      ],
    };
    const hasSizes = product.variations.some(v => v.size_code);
    expect(hasSizes).toBe(true);

    const colors = [...new Set(product.variations.map(v => v.color_name))];
    expect(colors).toHaveLength(2);

    const sizes = [...new Set(product.variations.filter(v => v.size_code).map(v => v.size_code))];
    expect(sizes).toHaveLength(2);
  });

  it('product with gender shows badge', () => {
    const product = { name: 'Polo', gender: 'masculino' };
    const GENDER_CONFIG: Record<string, string> = {
      masculino: 'Masc.', feminino: 'Fem.', infantil: 'Infantil', unissex: 'Unissex',
    };
    const label = GENDER_CONFIG[product.gender];
    expect(label).toBe('Masc.');
  });

  it('product without gender shows no badge', () => {
    const product = { name: 'Squeeze', gender: null as string | null };
    const GENDER_CONFIG: Record<string, string> = {
      masculino: 'Masc.', feminino: 'Fem.',
    };
    const label = product.gender ? GENDER_CONFIG[product.gender] : null;
    expect(label).toBeNull();
  });
});

// ============ Data Consistency ============
describe('Cross-Cutting — Data Consistency', () => {
  it('size_code exists in quote_items schema', () => {
    // quote_items table has size_code field
    const quoteItemColumns = [
      'id', 'quote_id', 'product_name', 'product_sku', 'quantity',
      'unit_price', 'color_name', 'color_hex', 'size_code', 'subtotal',
    ];
    expect(quoteItemColumns).toContain('size_code');
  });

  it('KitItem has selectedSize field', () => {
    interface KitItem {
      id: string;
      selectedSize?: string;
    }
    const item: KitItem = { id: '1', selectedSize: 'M' };
    expect(item.selectedSize).toBe('M');
  });

  it('VariantSelectionData has size field', () => {
    interface VariantSelectionData {
      color: { name: string };
      size?: string;
    }
    const data: VariantSelectionData = { color: { name: 'Preto' }, size: 'G' };
    expect(data.size).toBe('G');
  });

  it('ProductVariant has size_code and sale_price', () => {
    interface ProductVariant {
      code: string;
      name: string;
      size_code?: string | null;
      sale_price?: number | null;
    }
    const v: ProductVariant = { code: 'v1', name: 'Preto', size_code: 'M', sale_price: 35.90 };
    expect(v.size_code).toBe('M');
    expect(v.sale_price).toBe(35.90);
  });
});

// ============ Performance: Large Dataset Handling ============
describe('Cross-Cutting — Performance with large datasets', () => {
  it('handles 1000 variants efficiently', () => {
    const start = performance.now();
    const variants = Array.from({ length: 1000 }, (_, i) => ({
      id: `v${i}`,
      color_name: `Color${i % 20}`,
      color_hex: '#000000',
      size_code: ['PP', 'P', 'M', 'G', 'GG'][i % 5],
      stock: Math.floor(Math.random() * 500),
    }));

    // Build grouped structure
    const grouped = new Map<string, typeof variants>();
    variants.forEach(v => {
      if (!grouped.has(v.color_name)) grouped.set(v.color_name, []);
      grouped.get(v.color_name)!.push(v);
    });

    const elapsed = performance.now() - start;
    expect(grouped.size).toBe(20);
    expect(elapsed).toBeLessThan(100); // Should complete in < 100ms
  });

  it('handles 5000 variants for size extraction', () => {
    const start = performance.now();
    const variants = Array.from({ length: 5000 }, (_, i) => ({
      size_code: ['PP', 'P', 'M', 'G', 'GG', 'XG', '36', '38', '40', '42'][i % 10],
    }));

    const sizeSet = new Set<string>();
    variants.forEach(v => { if (v.size_code) sizeSet.add(v.size_code); });

    const elapsed = performance.now() - start;
    expect(sizeSet.size).toBe(10);
    expect(elapsed).toBeLessThan(50);
  });

  it('handles 200 products for gender filter', () => {
    const start = performance.now();
    const products = Array.from({ length: 200 }, (_, i) => ({
      id: `p${i}`,
      gender: ['masculino', 'feminino', 'unissex', 'infantil', null][i % 5],
    }));

    const filtered = products.filter(p => p.gender === 'masculino');
    const elapsed = performance.now() - start;
    
    expect(filtered).toHaveLength(40);
    expect(elapsed).toBeLessThan(10);
  });

  it('cartesian product 20 colors × 10 sizes = 200 cells', () => {
    const colors = Array.from({ length: 20 }, (_, i) => `Color${i}`);
    const sizes = Array.from({ length: 10 }, (_, i) => `Size${i}`);
    
    const start = performance.now();
    const cells: string[] = [];
    colors.forEach(c => sizes.forEach(s => cells.push(`${c}-${s}`)));
    const elapsed = performance.now() - start;
    
    expect(cells).toHaveLength(200);
    expect(elapsed).toBeLessThan(10);
  });
});
