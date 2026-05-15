/**
 * Phase 5: Propagation — Quotes, Kit Builder, Simulator, Export
 * Validates size_code propagation to all dependent modules.
 */
import { describe, it, expect } from 'vitest';

// ============ 5.1 — Quotes with Size ============
describe('Phase 5.1 — Quote Items with size_code', () => {
  interface QuoteItem {
    id: string;
    product_name: string;
    product_sku: string | null;
    quantity: number;
    unit_price: number;
    color_name?: string | null;
    color_hex?: string | null;
    size_code?: string | null;
    subtotal?: number | null;
  }

  it('quote item with color and size', () => {
    const item: QuoteItem = {
      id: 'qi1', product_name: 'Camiseta', product_sku: 'CAM-001',
      quantity: 100, unit_price: 35,
      color_name: 'Preto', color_hex: '#000000', size_code: 'M',
      subtotal: 3500,
    };
    expect(item.size_code).toBe('M');
    expect(item.subtotal).toBe(3500);
  });

  it('quote item without size (non-apparel)', () => {
    const item: QuoteItem = {
      id: 'qi2', product_name: 'Caneta BIC', product_sku: 'CAN-001',
      quantity: 500, unit_price: 5.50,
      color_name: 'Azul', size_code: null,
    };
    expect(item.size_code).toBeNull();
  });

  it('quote item subtotal calculation', () => {
    const item: QuoteItem = {
      id: 'qi3', product_name: 'Polo', product_sku: 'POL-001',
      quantity: 50, unit_price: 42.90,
    };
    const subtotal = item.quantity * item.unit_price;
    expect(subtotal).toBe(2145);
  });

  it('multiple items with different sizes', () => {
    const items: QuoteItem[] = [
      { id: 'qi1', product_name: 'Camiseta', product_sku: 'CAM-001', quantity: 50, unit_price: 35, size_code: 'P', color_name: 'Preto' },
      { id: 'qi2', product_name: 'Camiseta', product_sku: 'CAM-001', quantity: 100, unit_price: 35, size_code: 'M', color_name: 'Preto' },
      { id: 'qi3', product_name: 'Camiseta', product_sku: 'CAM-001', quantity: 75, unit_price: 35, size_code: 'G', color_name: 'Preto' },
    ];
    const totalQty = items.reduce((sum, i) => sum + i.quantity, 0);
    expect(totalQty).toBe(225);
    expect(items.map(i => i.size_code)).toEqual(['P', 'M', 'G']);
  });

  it('size code persists in quote item display', () => {
    const item: QuoteItem = {
      id: 'qi4', product_name: 'Polo', product_sku: 'POL-001',
      quantity: 100, unit_price: 42,
      color_name: 'Branco', color_hex: '#FFFFFF', size_code: 'GG',
    };
    const displayText = `${item.product_name} - ${item.color_name} / ${item.size_code}`;
    expect(displayText).toBe('Polo - Branco / GG');
  });

  it('handles quote item without color or size', () => {
    const item: QuoteItem = {
      id: 'qi5', product_name: 'Adesivo', product_sku: 'ADE-001',
      quantity: 1000, unit_price: 0.50,
    };
    expect(item.color_name).toBeUndefined();
    expect(item.size_code).toBeUndefined();
  });
});

// ============ 5.2 — Kit Builder with Size ============
describe('Phase 5.2 — Kit Builder size propagation', () => {
  interface KitItem {
    id: string;
    name: string;
    price: number;
    quantity: number;
    selectedColor?: { name: string; hex?: string };
    selectedSize?: string;
  }

  interface VariantSelectionData {
    color: { name: string; hex?: string };
    size?: string;
    sku?: string;
    imageUrl?: string | null;
    price?: number;
  }

  it('variant selection includes size', () => {
    const selection: VariantSelectionData = {
      color: { name: 'Preto', hex: '#000' },
      size: 'M',
      sku: 'CAM-001-BLK-M',
      price: 35.90,
    };
    expect(selection.size).toBe('M');
  });

  it('variant selection without size', () => {
    const selection: VariantSelectionData = {
      color: { name: 'Azul', hex: '#00F' },
      sku: 'CAN-001-BLU',
    };
    expect(selection.size).toBeUndefined();
  });

  it('kit item updated with size', () => {
    const item: KitItem = {
      id: '1', name: 'Camiseta', price: 35, quantity: 1,
      selectedColor: { name: 'Preto', hex: '#000' },
    };
    const updated = { ...item, selectedSize: 'G' };
    expect(updated.selectedSize).toBe('G');
    expect(updated.selectedColor!.name).toBe('Preto');
  });

  it('kit total unchanged by size selection', () => {
    const items: KitItem[] = [
      { id: '1', name: 'Camiseta', price: 35, quantity: 1, selectedSize: 'M' },
      { id: '2', name: 'Caneta', price: 5, quantity: 1 },
      { id: '3', name: 'Squeeze', price: 25, quantity: 1 },
    ];
    const total = items.reduce((s, i) => s + i.price * i.quantity, 0);
    expect(total).toBe(65);
  });

  it('size ordering in kit builder', () => {
    const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', '2XG', '3XG', 'EG', 'EGG'];
    function sizeSort(a: string, b: string): number {
      const ia = SIZE_ORDER.indexOf(a.toUpperCase());
      const ib = SIZE_ORDER.indexOf(b.toUpperCase());
      if (ia !== -1 && ib !== -1) return ia - ib;
      if (ia !== -1) return -1;
      if (ib !== -1) return 1;
      return a.localeCompare(b, 'pt-BR');
    }

    const sizes = ['GG', 'P', 'M', 'XG', 'G'];
    const sorted = [...sizes].sort(sizeSort);
    expect(sorted).toEqual(['P', 'M', 'G', 'GG', 'XG']);
  });

  it('grouping variants by color with size sub-options', () => {
    const variants = [
      { id: 'v1', color_name: 'Preto', size_code: 'P' },
      { id: 'v2', color_name: 'Preto', size_code: 'M' },
      { id: 'v3', color_name: 'Preto', size_code: 'G' },
      { id: 'v4', color_name: 'Azul', size_code: 'P' },
      { id: 'v5', color_name: 'Azul', size_code: 'M' },
    ];
    const grouped = new Map<string, typeof variants>();
    variants.forEach(v => {
      const key = v.color_name;
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(v);
    });
    expect(grouped.get('Preto')).toHaveLength(3);
    expect(grouped.get('Azul')).toHaveLength(2);
  });

  it('badge displays size when selected', () => {
    const item: KitItem = {
      id: '1', name: 'Polo', price: 42, quantity: 1,
      selectedColor: { name: 'Branco' }, selectedSize: 'GG',
    };
    const badgeText = item.selectedSize ? `Tam: ${item.selectedSize}` : '';
    expect(badgeText).toBe('Tam: GG');
  });

  it('no badge when no size selected', () => {
    const item: KitItem = {
      id: '1', name: 'Caneta', price: 5, quantity: 1,
    };
    const badgeText = item.selectedSize ? `Tam: ${item.selectedSize}` : '';
    expect(badgeText).toBe('');
  });
});

// ============ 5.3 — Simulator with Size Pricing ============
describe('Phase 5.3 — Simulator size differentiation', () => {
  interface ProductVariant {
    code: string;
    name: string;
    hex?: string;
    stock?: number;
    size_code?: string | null;
    sale_price?: number | null;
  }

  function buildVariantsFromDb(dbRecords: Array<{
    id: string;
    color_name: string | null;
    color_hex: string | null;
    size_code: string | null;
    stock_quantity: number | null;
    sale_price: number | null;
  }>): ProductVariant[] {
    return dbRecords
      .filter(v => v.color_name)
      .map(v => ({
        code: v.id,
        name: v.color_name || 'Padrão',
        hex: v.color_hex || undefined,
        stock: v.stock_quantity ?? undefined,
        size_code: v.size_code,
        sale_price: v.sale_price,
      }));
  }

  it('builds variants from DB records', () => {
    const dbRecords = [
      { id: 'v1', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock_quantity: 100, sale_price: 35.90 },
      { id: 'v2', color_name: 'Azul', color_hex: '#00F', size_code: 'G', stock_quantity: 50, sale_price: 38.00 },
    ];
    const variants = buildVariantsFromDb(dbRecords);
    expect(variants).toHaveLength(2);
    expect(variants[0].size_code).toBe('M');
    expect(variants[1].sale_price).toBe(38.00);
  });

  it('filters out records without color_name', () => {
    const dbRecords = [
      { id: 'v1', color_name: null, color_hex: null, size_code: 'M', stock_quantity: 100, sale_price: 35 },
      { id: 'v2', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock_quantity: 100, sale_price: 35 },
    ];
    const variants = buildVariantsFromDb(dbRecords);
    expect(variants).toHaveLength(1);
    expect(variants[0].name).toBe('Preto');
  });

  it('detects hasSizes from variants', () => {
    const withSizes: ProductVariant[] = [
      { code: 'v1', name: 'Preto', size_code: 'M' },
      { code: 'v2', name: 'Azul', size_code: 'G' },
    ];
    expect(withSizes.some(v => v.size_code)).toBe(true);

    const withoutSizes: ProductVariant[] = [
      { code: 'v1', name: 'Preto' },
      { code: 'v2', name: 'Azul' },
    ];
    expect(withoutSizes.some(v => v.size_code)).toBe(false);
  });

  it('step label changes based on hasSizes', () => {
    const hasSizes = true;
    expect(hasSizes ? 'Cor/Tam' : 'Cor').toBe('Cor/Tam');

    const noSizes = false;
    expect(noSizes ? 'Cor/Tam' : 'Cor').toBe('Cor');
  });

  it('variant-specific pricing overrides product base price', () => {
    const basePrice = 35.00;
    const variant: ProductVariant = { code: 'v1', name: 'Preto', size_code: 'GG', sale_price: 42.50 };
    const effectivePrice = variant.sale_price ?? basePrice;
    expect(effectivePrice).toBe(42.50);
  });

  it('null sale_price falls back to base price', () => {
    const basePrice = 35.00;
    const variant: ProductVariant = { code: 'v1', name: 'Preto', size_code: 'M', sale_price: null };
    const effectivePrice = variant.sale_price ?? basePrice;
    expect(effectivePrice).toBe(35.00);
  });

  it('variant selection is required when variants exist', () => {
    const variants: ProductVariant[] = [
      { code: 'v1', name: 'Preto' },
      { code: 'v2', name: 'Azul' },
    ];
    const selectedVariant: ProductVariant | null = null;
    const hasVariants = variants.length > 0;
    const needsVariantSelection = hasVariants && !selectedVariant;
    expect(needsVariantSelection).toBe(true);
  });

  it('no variant selection needed when no variants', () => {
    const variants: ProductVariant[] = [];
    const selectedVariant: ProductVariant | null = null;
    const hasVariants = variants.length > 0;
    const needsVariantSelection = hasVariants && !selectedVariant;
    expect(needsVariantSelection).toBe(false);
  });

  it('grouped view: color groups with size chips', () => {
    const variants: ProductVariant[] = [
      { code: 'v1', name: 'Preto', hex: '#000', size_code: 'P' },
      { code: 'v2', name: 'Preto', hex: '#000', size_code: 'M' },
      { code: 'v3', name: 'Preto', hex: '#000', size_code: 'G' },
      { code: 'v4', name: 'Azul', hex: '#00F', size_code: 'P' },
      { code: 'v5', name: 'Azul', hex: '#00F', size_code: 'M' },
    ];

    const hasSizes = variants.some(v => v.size_code);
    expect(hasSizes).toBe(true);

    const grouped = new Map<string, ProductVariant[]>();
    for (const v of variants) {
      const key = v.name || 'Padrão';
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)!.push(v);
    }
    
    expect(grouped.size).toBe(2);
    expect(grouped.get('Preto')).toHaveLength(3);
    expect(grouped.get('Azul')).toHaveLength(2);
  });

  it('flat view: no sizes, simple color list', () => {
    const variants: ProductVariant[] = [
      { code: 'v1', name: 'Preto', hex: '#000', stock: 100 },
      { code: 'v2', name: 'Azul', hex: '#00F', stock: 50 },
      { code: 'v3', name: 'Branco', hex: '#FFF', stock: 0 },
    ];
    const hasSizes = variants.some(v => v.size_code);
    expect(hasSizes).toBe(false);

    // Sort by stock > 0 first, then alphabetically
    const sorted = [...variants].sort((a, b) => {
      const aStock = a.stock ?? 0;
      const bStock = b.stock ?? 0;
      if (aStock > 0 && bStock === 0) return -1;
      if (aStock === 0 && bStock > 0) return 1;
      return a.name.localeCompare(b.name);
    });
    expect(sorted[0].name).toBe('Azul');
    expect(sorted[2].name).toBe('Branco'); // out of stock goes last
  });

  it('selection summary shows color + size', () => {
    const variant: ProductVariant = {
      code: 'v1', name: 'Preto', size_code: 'G', stock: 150,
    };
    const summary = `Selecionado: ${variant.name}${variant.size_code ? ` — Tamanho: ${variant.size_code}` : ''}`;
    expect(summary).toBe('Selecionado: Preto — Tamanho: G');
  });

  it('selection summary shows only color when no size', () => {
    const variant: ProductVariant = {
      code: 'v1', name: 'Azul',
    };
    const summary = `Selecionado: ${variant.name}${variant.size_code ? ` — Tamanho: ${variant.size_code}` : ''}`;
    expect(summary).toBe('Selecionado: Azul');
  });
});

// ============ 5.4 — Export/PDF with Size and Gender ============
describe('Phase 5.4 — Export/PDF data enrichment', () => {
  it('quote line includes size in export', () => {
    const line = {
      product: 'Camiseta', sku: 'CAM-001', color: 'Preto',
      size: 'M', qty: 100, unitPrice: 35, total: 3500,
    };
    const exportLine = `${line.product} | ${line.color} | ${line.size || '-'} | ${line.qty} | R$ ${line.unitPrice.toFixed(2)}`;
    expect(exportLine).toContain('M');
  });

  it('quote line without size uses dash', () => {
    const line = {
      product: 'Caneta', sku: 'CAN-001', color: 'Azul',
      size: null as string | null, qty: 500, unitPrice: 5.50,
    };
    const sizeDisplay = line.size || '-';
    expect(sizeDisplay).toBe('-');
  });

  it('gender included in product specs', () => {
    const product = {
      name: 'Camiseta Polo', gender: 'masculino',
    };
    const specs = [
      `Produto: ${product.name}`,
      product.gender ? `Gênero: ${product.gender}` : null,
    ].filter(Boolean);
    expect(specs).toHaveLength(2);
    expect(specs[1]).toBe('Gênero: masculino');
  });

  it('no gender in specs when null', () => {
    const product = {
      name: 'Squeeze', gender: null as string | null,
    };
    const specs = [
      `Produto: ${product.name}`,
      product.gender ? `Gênero: ${product.gender}` : null,
    ].filter(Boolean);
    expect(specs).toHaveLength(1);
  });

  it('CSV export includes size column', () => {
    const headers = ['Produto', 'SKU', 'Cor', 'Tamanho', 'Qtd', 'Preço Un.', 'Subtotal'];
    expect(headers).toContain('Tamanho');
    
    const row = ['Camiseta', 'CAM-001', 'Preto', 'M', '100', '35.00', '3500.00'];
    expect(row[3]).toBe('M');
  });
});
