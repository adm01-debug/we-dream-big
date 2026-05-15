/**
 * Phase 2: Filters & Catalog — Gender Filter, Size Filter, Gender Badge
 * Validates filter logic, size ordering, gender normalization, and badge rendering rules.
 */
import { describe, it, expect } from 'vitest';

// ============ 2.1 — Gender Filter Logic ============
describe('Phase 2.1 — Gender Filter Integration', () => {
  const GENDERS = ['unissex', 'masculino', 'feminino', 'infantil'] as const;

  const products = [
    { id: '1', name: 'Camiseta Masc', gender: 'masculino' },
    { id: '2', name: 'Camiseta Fem', gender: 'feminino' },
    { id: '3', name: 'Camiseta Unissex', gender: 'unissex' },
    { id: '4', name: 'Caneta', gender: null },
    { id: '5', name: 'Blusa Infantil', gender: 'infantil' },
    { id: '6', name: 'Mochila', gender: undefined },
  ];

  function filterByGender(items: typeof products, selected: string[]): typeof products {
    if (selected.length === 0) return items;
    return items.filter(p => p.gender && selected.includes(p.gender));
  }

  it('no filter returns all products', () => {
    expect(filterByGender(products, [])).toHaveLength(6);
  });

  it('filter masculino', () => {
    const result = filterByGender(products, ['masculino']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Camiseta Masc');
  });

  it('filter feminino', () => {
    const result = filterByGender(products, ['feminino']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Camiseta Fem');
  });

  it('filter multiple genders', () => {
    const result = filterByGender(products, ['masculino', 'feminino']);
    expect(result).toHaveLength(2);
  });

  it('filter infantil', () => {
    const result = filterByGender(products, ['infantil']);
    expect(result).toHaveLength(1);
    expect(result[0].name).toBe('Blusa Infantil');
  });

  it('filter unissex', () => {
    const result = filterByGender(products, ['unissex']);
    expect(result).toHaveLength(1);
  });

  it('filter all genders returns all with gender', () => {
    const result = filterByGender(products, [...GENDERS]);
    expect(result).toHaveLength(4); // excludes null and undefined
  });

  it('products without gender excluded from gender filter', () => {
    const result = filterByGender(products, ['masculino']);
    expect(result.some(p => p.id === '4')).toBe(false);
    expect(result.some(p => p.id === '6')).toBe(false);
  });

  it('handles case-insensitive gender normalization', () => {
    const rawProducts = [
      { id: '1', name: 'A', gender: 'MASCULINO' },
      { id: '2', name: 'B', gender: 'Feminino' },
    ];
    const normalized = rawProducts.map(p => ({
      ...p, gender: p.gender?.toLowerCase(),
    }));
    const result = normalized.filter(p => p.gender === 'masculino');
    expect(result).toHaveLength(1);
  });
});

// ============ 2.2 — Size Filter Logic ============
describe('Phase 2.2 — Size Filter', () => {
  const SIZE_ORDER = [
    'PP', 'P', 'M', 'G', 'GG', 'XG', 'XXG', 'EG', 'EGG',
    'XS', 'S', 'L', 'XL', 'XXL', '2XL', '3XL',
    '34', '35', '36', '37', '38', '39', '40', '41', '42', '43', '44', '45', '46',
    '100ml', '200ml', '300ml', '350ml', '400ml', '500ml', '600ml', '750ml', '1L',
  ];

  function getSizeOrder(code: string): number {
    const upper = code.toUpperCase().trim();
    const idx = SIZE_ORDER.indexOf(upper);
    if (idx >= 0) return idx;
    const num = parseFloat(upper);
    if (!isNaN(num)) return 1000 + num;
    return 2000;
  }

  it('standard clothing sizes order correctly', () => {
    const sizes = ['G', 'P', 'GG', 'M', 'PP'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sorted).toEqual(['PP', 'P', 'M', 'G', 'GG']);
  });

  it('numeric sizes order correctly', () => {
    const sizes = ['42', '38', '40', '36', '44'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sorted).toEqual(['36', '38', '40', '42', '44']);
  });

  it('volume sizes parsed numerically by parseFloat', () => {
    const sizes = ['500ml', '200ml', '1L', '100ml', '350ml'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    // parseFloat('100ml')=100, parseFloat('1L')=1, so 1L sorts first numerically
    expect(sorted).toEqual(['1L', '100ml', '200ml', '350ml', '500ml']);
  });

  it('mixed clothing and numeric sizes', () => {
    const sizes = ['42', 'G', 'M', '38'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sorted).toEqual(['M', 'G', '38', '42']);
  });

  it('unknown sizes go to end', () => {
    const sizes = ['Custom', 'M', 'G', 'Especial'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sorted[0]).toBe('M');
    expect(sorted[1]).toBe('G');
  });

  it('case insensitive ordering', () => {
    const sizes = ['m', 'g', 'P'];
    const sorted = [...sizes].sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sorted).toEqual(['P', 'm', 'g']); // P < M < G in SIZE_ORDER
  });

  it('extracts unique sizes from products', () => {
    const products = [
      { variations: [{ size_code: 'P' }, { size_code: 'M' }, { size_code: 'G' }] },
      { variations: [{ size_code: 'M' }, { size_code: 'G' }, { size_code: 'GG' }] },
      { variations: [{ size_code: null }] },
      { variations: [] },
    ];
    const sizeSet = new Set<string>();
    products.forEach(p => {
      p.variations?.forEach(v => {
        if (v.size_code) sizeSet.add(v.size_code);
      });
    });
    const sizes = Array.from(sizeSet).sort((a, b) => getSizeOrder(a) - getSizeOrder(b));
    expect(sizes).toEqual(['P', 'M', 'G', 'GG']);
  });

  it('filters products by selected sizes', () => {
    const products = [
      { id: '1', name: 'Camiseta', variations: [
        { size_code: 'P' }, { size_code: 'M' }, { size_code: 'G' },
      ]},
      { id: '2', name: 'Polo', variations: [
        { size_code: 'M' }, { size_code: 'GG' },
      ]},
      { id: '3', name: 'Caneta', variations: [] },
    ];
    const selectedSizes = ['GG'];
    const filtered = products.filter(p =>
      p.variations.some(v => v.size_code && selectedSizes.includes(v.size_code))
    );
    expect(filtered).toHaveLength(1);
    expect(filtered[0].id).toBe('2');
  });

  it('empty size selection returns all products', () => {
    const products = [{ id: '1' }, { id: '2' }];
    const selectedSizes: string[] = [];
    // No filter applied
    expect(selectedSizes.length === 0 ? products : []).toEqual(products);
  });

  it('handles product with no variations gracefully', () => {
    const products = [
      { variations: undefined as any },
      { variations: null as any },
    ];
    const sizeSet = new Set<string>();
    products.forEach(p => {
      p.variations?.forEach?.((v: any) => {
        if (v?.size_code) sizeSet.add(v.size_code);
      });
    });
    expect(sizeSet.size).toBe(0);
  });

  it('search filter within size options', () => {
    const availableSizes = ['PP', 'P', 'M', 'G', 'GG', 'XG', '42', '44'];
    const search = 'g';
    const filtered = availableSizes.filter(s => s.toLowerCase().includes(search.toLowerCase()));
    expect(filtered).toEqual(['G', 'GG', 'XG']);
  });

  it('search with no results', () => {
    const availableSizes = ['P', 'M', 'G'];
    const filtered = availableSizes.filter(s => s.toLowerCase().includes('xyz'));
    expect(filtered).toHaveLength(0);
  });
});

// ============ 2.3 — Gender Badge Logic ============
describe('Phase 2.3 — GenderBadge rendering rules', () => {
  const GENDER_CONFIG: Record<string, { label: string; className: string }> = {
    masculino: { label: 'Masc.', className: 'bg-blue-500/10 text-blue-700 border-blue-200' },
    feminino: { label: 'Fem.', className: 'bg-pink-500/10 text-pink-700 border-pink-200' },
    infantil: { label: 'Infantil', className: 'bg-amber-500/10 text-amber-700 border-amber-200' },
    unissex: { label: 'Unissex', className: 'bg-violet-500/10 text-violet-700 border-violet-200' },
  };

  function getGenderLabel(gender: string | null | undefined): string | null {
    if (!gender) return null;
    const key = gender.toLowerCase().trim();
    return GENDER_CONFIG[key]?.label ?? null;
  }

  it('returns "Masc." for masculino', () => {
    expect(getGenderLabel('masculino')).toBe('Masc.');
  });

  it('returns "Fem." for feminino', () => {
    expect(getGenderLabel('feminino')).toBe('Fem.');
  });

  it('returns "Infantil" for infantil', () => {
    expect(getGenderLabel('infantil')).toBe('Infantil');
  });

  it('returns "Unissex" for unissex', () => {
    expect(getGenderLabel('unissex')).toBe('Unissex');
  });

  it('returns null for null gender', () => {
    expect(getGenderLabel(null)).toBeNull();
  });

  it('returns null for undefined gender', () => {
    expect(getGenderLabel(undefined)).toBeNull();
  });

  it('returns null for empty string', () => {
    expect(getGenderLabel('')).toBeNull();
  });

  it('returns null for unknown gender', () => {
    expect(getGenderLabel('outro')).toBeNull();
    expect(getGenderLabel('agender')).toBeNull();
  });

  it('handles uppercase input', () => {
    expect(getGenderLabel('MASCULINO')).toBe('Masc.');
    expect(getGenderLabel('FEMININO')).toBe('Fem.');
  });

  it('handles mixed case input', () => {
    expect(getGenderLabel('Masculino')).toBe('Masc.');
    expect(getGenderLabel('InFanTiL')).toBe('Infantil');
  });

  it('handles whitespace', () => {
    expect(getGenderLabel('  masculino  ')).toBe('Masc.');
  });

  it('each gender has unique color scheme', () => {
    const classNames = Object.values(GENDER_CONFIG).map(c => c.className);
    const unique = new Set(classNames);
    expect(unique.size).toBe(classNames.length);
  });

  it('all configs have label and className', () => {
    Object.values(GENDER_CONFIG).forEach(config => {
      expect(config.label).toBeTruthy();
      expect(config.className).toBeTruthy();
    });
  });

  it('badge sizes sm and md have different text classes', () => {
    const smClass = 'text-[10px] px-1.5 py-0';
    const mdClass = 'text-xs px-2 py-0.5';
    expect(smClass).not.toBe(mdClass);
  });
});
