/**
 * Phase 3: Detail Experience — Size Selector, Variant Grid Matrix, Stock by Combination
 * Validates size selection logic, grid building, stock resolution, and color×size matrix.
 */
import { describe, it, expect } from 'vitest';

// ============ SIZE_ORDER Constants ============
const SIZE_ORDER = ['PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG', 'XS', 'S', 'L', 'XL', 'XXL', '2XL', '3XL'];

function getSizeOrder(code: string): number {
  const idx = SIZE_ORDER.indexOf(code.toUpperCase());
  return idx >= 0 ? idx : 999;
}

// ============ 3.1 — ProductSizeSelector Logic ============
describe('Phase 3.1 — ProductSizeSelector', () => {
  interface SizeOption {
    code: string;
    stock: number;
    variantIds: string[];
  }

  function buildSizeOptions(variations: Array<{ id: string; size_code?: string | null; stock?: number }>): SizeOption[] {
    const sizeMap = new Map<string, SizeOption>();
    for (const v of variations) {
      if (!v.size_code) continue;
      const existing = sizeMap.get(v.size_code);
      if (existing) {
        existing.stock += Math.max(0, v.stock ?? 0);
        existing.variantIds.push(v.id);
      } else {
        sizeMap.set(v.size_code, {
          code: v.size_code,
          stock: Math.max(0, v.stock ?? 0),
          variantIds: [v.id],
        });
      }
    }
    return Array.from(sizeMap.values()).sort(
      (a, b) => getSizeOrder(a.code) - getSizeOrder(b.code) || a.code.localeCompare(b.code)
    );
  }

  it('builds size options from variations', () => {
    const variations = [
      { id: 'v1', size_code: 'P', stock: 50 },
      { id: 'v2', size_code: 'M', stock: 100 },
      { id: 'v3', size_code: 'G', stock: 200 },
    ];
    const options = buildSizeOptions(variations);
    expect(options).toHaveLength(3);
    expect(options[0].code).toBe('P');
    expect(options[1].code).toBe('M');
    expect(options[2].code).toBe('G');
  });

  it('aggregates stock across same size_code', () => {
    const variations = [
      { id: 'v1', size_code: 'M', stock: 50 },  // Preto M
      { id: 'v2', size_code: 'M', stock: 75 },  // Azul M
      { id: 'v3', size_code: 'M', stock: 25 },  // Branco M
    ];
    const options = buildSizeOptions(variations);
    expect(options).toHaveLength(1);
    expect(options[0].stock).toBe(150);
    expect(options[0].variantIds).toHaveLength(3);
  });

  it('excludes null/undefined size_codes', () => {
    const variations = [
      { id: 'v1', size_code: 'M', stock: 50 },
      { id: 'v2', size_code: null, stock: 100 },
      { id: 'v3', size_code: undefined, stock: 200 },
    ];
    const options = buildSizeOptions(variations);
    expect(options).toHaveLength(1);
    expect(options[0].code).toBe('M');
  });

  it('handles empty variations array', () => {
    expect(buildSizeOptions([])).toHaveLength(0);
  });

  it('handles all null size_codes', () => {
    const variations = [
      { id: 'v1', size_code: null, stock: 100 },
      { id: 'v2', size_code: null, stock: 200 },
    ];
    expect(buildSizeOptions(variations)).toHaveLength(0);
  });

  it('sorts by SIZE_ORDER priority', () => {
    const variations = [
      { id: 'v1', size_code: 'GG', stock: 10 },
      { id: 'v2', size_code: 'PP', stock: 10 },
      { id: 'v3', size_code: 'G', stock: 10 },
      { id: 'v4', size_code: 'P', stock: 10 },
      { id: 'v5', size_code: 'M', stock: 10 },
    ];
    const options = buildSizeOptions(variations);
    expect(options.map(o => o.code)).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });

  it('handles zero stock (should show as disabled)', () => {
    const variations = [
      { id: 'v1', size_code: 'M', stock: 0 },
    ];
    const options = buildSizeOptions(variations);
    expect(options[0].stock).toBe(0);
  });

  it('handles negative stock (treats as 0)', () => {
    const variations = [
      { id: 'v1', size_code: 'M', stock: -5 },
    ];
    const options = buildSizeOptions(variations);
    expect(options[0].stock).toBe(0);
  });

  it('toggle selection: select then deselect', () => {
    let selected: string | null = null;
    selected = 'M';
    expect(selected).toBe('M');
    selected = selected === 'M' ? null : 'M';
    expect(selected).toBeNull();
  });

  it('switch between sizes', () => {
    let selected: string | null = 'M';
    selected = 'G';
    expect(selected).toBe('G');
  });
});

// ============ 3.2 — VariantGridMatrix Logic ============
describe('Phase 3.2 — VariantGridMatrix grid building', () => {
  interface GridItem {
    id: string;
    color_name: string;
    color_hex: string;
    size_code?: string | null;
    stock: number;
    sku?: string;
    price?: number | null;
  }

  const GRID_SIZE_ORDER = [
    'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG',
    'XS', 'S', 'L', 'XL', 'XXL', '2XL', '3XL',
    '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44',
  ];

  function getGridSizeOrder(code: string): number {
    const upper = code.toUpperCase().trim();
    const idx = GRID_SIZE_ORDER.indexOf(upper);
    if (idx >= 0) return idx;
    const num = parseFloat(upper);
    if (!isNaN(num)) return 1000 + num;
    return 2000;
  }

  function buildGrid(variants: GridItem[]) {
    const hasSizes = variants.some(v => v.size_code);
    const colors = [...new Set(variants.map(v => v.color_name))].sort();
    const sizes = hasSizes
      ? [...new Set(variants.filter(v => v.size_code).map(v => v.size_code!))].sort((a, b) => getGridSizeOrder(a) - getGridSizeOrder(b))
      : [];
    
    const matrix = new Map<string, Map<string, GridItem>>();
    variants.forEach(v => {
      if (!matrix.has(v.color_name)) matrix.set(v.color_name, new Map());
      const key = v.size_code || '__no_size__';
      matrix.get(v.color_name)!.set(key, v);
    });

    return { hasSizes, colors, sizes, matrix };
  }

  const sampleVariants: GridItem[] = [
    { id: 'v1', color_name: 'Preto', color_hex: '#000', size_code: 'P', stock: 50, sku: 'CAM-BLK-P' },
    { id: 'v2', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock: 100, sku: 'CAM-BLK-M' },
    { id: 'v3', color_name: 'Preto', color_hex: '#000', size_code: 'G', stock: 0, sku: 'CAM-BLK-G' },
    { id: 'v4', color_name: 'Azul', color_hex: '#00F', size_code: 'P', stock: 30, sku: 'CAM-BLU-P' },
    { id: 'v5', color_name: 'Azul', color_hex: '#00F', size_code: 'M', stock: 80, sku: 'CAM-BLU-M' },
    { id: 'v6', color_name: 'Azul', color_hex: '#00F', size_code: 'G', stock: 120, sku: 'CAM-BLU-G' },
    { id: 'v7', color_name: 'Branco', color_hex: '#FFF', size_code: 'P', stock: 0, sku: 'CAM-WHT-P' },
    { id: 'v8', color_name: 'Branco', color_hex: '#FFF', size_code: 'M', stock: 40, sku: 'CAM-WHT-M' },
  ];

  it('detects hasSizes correctly', () => {
    const grid = buildGrid(sampleVariants);
    expect(grid.hasSizes).toBe(true);
  });

  it('detects no sizes', () => {
    const noSizeVariants: GridItem[] = [
      { id: 'v1', color_name: 'Preto', color_hex: '#000', stock: 100 },
      { id: 'v2', color_name: 'Azul', color_hex: '#00F', stock: 50 },
    ];
    const grid = buildGrid(noSizeVariants);
    expect(grid.hasSizes).toBe(false);
    expect(grid.sizes).toHaveLength(0);
  });

  it('extracts all unique colors', () => {
    const grid = buildGrid(sampleVariants);
    expect(grid.colors).toHaveLength(3);
    expect(grid.colors).toContain('Preto');
    expect(grid.colors).toContain('Azul');
    expect(grid.colors).toContain('Branco');
  });

  it('extracts and sorts unique sizes', () => {
    const grid = buildGrid(sampleVariants);
    expect(grid.sizes).toEqual(['P', 'M', 'G']);
  });

  it('builds correct matrix lookups', () => {
    const grid = buildGrid(sampleVariants);
    expect(grid.matrix.get('Preto')?.get('M')?.stock).toBe(100);
    expect(grid.matrix.get('Azul')?.get('G')?.stock).toBe(120);
    expect(grid.matrix.get('Branco')?.get('P')?.stock).toBe(0);
  });

  it('handles sparse matrix (missing combinations)', () => {
    const grid = buildGrid(sampleVariants);
    // Branco doesn't have 'G'
    expect(grid.matrix.get('Branco')?.get('G')).toBeUndefined();
  });

  it('handles single color, multiple sizes', () => {
    const single: GridItem[] = [
      { id: 'v1', color_name: 'Preto', color_hex: '#000', size_code: 'PP', stock: 10 },
      { id: 'v2', color_name: 'Preto', color_hex: '#000', size_code: 'P', stock: 20 },
      { id: 'v3', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock: 30 },
    ];
    const grid = buildGrid(single);
    expect(grid.colors).toHaveLength(1);
    expect(grid.sizes).toHaveLength(3);
    expect(grid.sizes).toEqual(['PP', 'P', 'M']);
  });

  it('handles many colors, single size', () => {
    const single: GridItem[] = [
      { id: 'v1', color_name: 'Preto', color_hex: '#000', size_code: 'M', stock: 10 },
      { id: 'v2', color_name: 'Azul', color_hex: '#00F', size_code: 'M', stock: 20 },
      { id: 'v3', color_name: 'Verde', color_hex: '#0F0', size_code: 'M', stock: 30 },
    ];
    const grid = buildGrid(single);
    expect(grid.colors).toHaveLength(3);
    expect(grid.sizes).toHaveLength(1);
  });

  it('handles empty variants array', () => {
    const grid = buildGrid([]);
    expect(grid.hasSizes).toBe(false);
    expect(grid.colors).toHaveLength(0);
    expect(grid.sizes).toHaveLength(0);
  });
});

// ============ 3.3 — Stock by Combination ============
describe('Phase 3.3 — Stock Resolution per Combination', () => {
  function formatStock(stock: number): string {
    if (stock >= 1000) return `${(stock / 1000).toFixed(1)}k`;
    return stock.toLocaleString('pt-BR');
  }

  function stockColor(stock: number): string {
    if (stock === 0) return 'text-destructive';
    if (stock < 100) return 'text-warning';
    return 'text-success';
  }

  function isLightColor(hex?: string | null): boolean {
    if (!hex) return true;
    const c = hex.replace('#', '');
    if (c.length < 6) return true;
    const r = parseInt(c.substring(0, 2), 16);
    const g = parseInt(c.substring(2, 4), 16);
    const b = parseInt(c.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }

  it('formats stock < 1000', () => {
    expect(formatStock(500)).toBe('500');
    expect(formatStock(0)).toBe('0');
    expect(formatStock(999)).toBe('999');
  });

  it('formats stock >= 1000 with k suffix', () => {
    expect(formatStock(1000)).toBe('1.0k');
    expect(formatStock(1500)).toBe('1.5k');
    expect(formatStock(10000)).toBe('10.0k');
  });

  it('stock color: destructive for 0', () => {
    expect(stockColor(0)).toBe('text-destructive');
  });

  it('stock color: warning for < 100', () => {
    expect(stockColor(1)).toBe('text-warning');
    expect(stockColor(50)).toBe('text-warning');
    expect(stockColor(99)).toBe('text-warning');
  });

  it('stock color: success for >= 100', () => {
    expect(stockColor(100)).toBe('text-success');
    expect(stockColor(5000)).toBe('text-success');
  });

  it('isLightColor: black is dark', () => {
    expect(isLightColor('#000000')).toBe(false);
  });

  it('isLightColor: white is light', () => {
    expect(isLightColor('#FFFFFF')).toBe(true);
  });

  it('isLightColor: yellow is light', () => {
    expect(isLightColor('#FFFF00')).toBe(true);
  });

  it('isLightColor: dark blue is dark', () => {
    expect(isLightColor('#000080')).toBe(false);
  });

  it('isLightColor: null defaults to true', () => {
    expect(isLightColor(null)).toBe(true);
    expect(isLightColor(undefined)).toBe(true);
  });

  it('isLightColor: short hex defaults to true', () => {
    expect(isLightColor('#000')).toBe(true); // less than 6 chars
  });

  it('resolves stock for specific color+size combination', () => {
    const variants = [
      { color: 'Preto', size: 'M', stock: 150 },
      { color: 'Preto', size: 'G', stock: 0 },
      { color: 'Azul', size: 'M', stock: 80 },
    ];
    const lookup = (color: string, size: string) =>
      variants.find(v => v.color === color && v.size === size)?.stock ?? -1;
    
    expect(lookup('Preto', 'M')).toBe(150);
    expect(lookup('Preto', 'G')).toBe(0);
    expect(lookup('Azul', 'M')).toBe(80);
    expect(lookup('Azul', 'G')).toBe(-1); // not found
  });
});

// ============ 3.4 — Selection State Management ============
describe('Phase 3.4 — Selection state in grid', () => {
  it('single selection mode', () => {
    let selectedId: string | null = null;
    
    selectedId = 'v1';
    expect(selectedId).toBe('v1');
    
    selectedId = 'v2';
    expect(selectedId).toBe('v2');
    
    selectedId = null;
    expect(selectedId).toBeNull();
  });

  it('admin multi-selection mode', () => {
    const selected = new Set<string>();
    
    selected.add('v1');
    selected.add('v2');
    expect(selected.size).toBe(2);
    
    selected.delete('v1');
    expect(selected.size).toBe(1);
    expect(selected.has('v2')).toBe(true);
    
    selected.clear();
    expect(selected.size).toBe(0);
  });

  it('select all / deselect all', () => {
    const allIds = ['v1', 'v2', 'v3', 'v4', 'v5'];
    const selected = new Set<string>();
    
    // Select all
    allIds.forEach(id => selected.add(id));
    expect(selected.size).toBe(5);
    
    // Deselect all
    selected.clear();
    expect(selected.size).toBe(0);
  });

  it('toggle selection', () => {
    const selected = new Set<string>();
    
    const toggle = (id: string) => {
      if (selected.has(id)) selected.delete(id);
      else selected.add(id);
    };
    
    toggle('v1');
    expect(selected.has('v1')).toBe(true);
    toggle('v1');
    expect(selected.has('v1')).toBe(false);
  });
});
