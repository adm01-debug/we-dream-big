/**
 * Tests for color variant navigation — validates that ?cor=, ?hex=, ?grupo=
 * params are correctly built and parsed across all catalog views.
 */
import { describe, it, expect } from 'vitest';

// ============================================
// URL building logic (mirrors ProductCard/ListItem/TableView/QuickView)
// ============================================

function buildColorNavParams(variant: {
  name?: string | null;
  groupSlug?: string | null;
  hex?: string | null;
}): URLSearchParams {
  const params = new URLSearchParams();
  if (variant.name) params.set('cor', variant.name);
  if (variant.groupSlug) params.set('grupo', variant.groupSlug);
  if (variant.hex) params.set('hex', variant.hex);
  return params;
}

function findVariationByParams(
  variations: Array<{ color: { name: string; hex?: string }; id: string }>,
  colors: Array<{ name: string; groupSlug?: string }>,
  params: URLSearchParams
): string | null {
  const cor = params.get('cor')?.toLowerCase().trim() || '';
  const hex = params.get('hex')?.toLowerCase() || '';
  const grupo = params.get('grupo') || '';

  // 1) Exact name match
  let match = variations.find(v => v.color.name.toLowerCase().trim() === cor);
  // 2) Partial name match
  if (!match && cor) {
    match = variations.find(v => {
      const name = v.color.name.toLowerCase().trim();
      return name.includes(cor) || cor.includes(name);
    });
  }
  // 3) Hex match
  if (!match && hex) {
    match = variations.find(v => v.color.hex?.toLowerCase() === hex);
  }
  // 4) Group match
  if (!match && grupo) {
    const colorOfGroup = colors.find(c => c.groupSlug === grupo);
    if (colorOfGroup) {
      match = variations.find(v => v.color.name.toLowerCase() === colorOfGroup.name.toLowerCase());
    }
  }

  return match?.id ?? null;
}

// ============================================
// Share message variant injection (mirrors SharePreviewDialog)
// ============================================

function buildShareMessage(
  baseMessage: string,
  variantName?: string | null
): string {
  if (!variantName) return baseMessage;
  return `${baseMessage}\n\n🎨 Cor/variação: ${variantName}`;
}

function filterMainImages(
  images: string[],
  colorImages: Set<string>,
  variantThumbnail?: string | null
): string[] {
  const preferred: string[] = [];
  if (variantThumbnail) preferred.push(variantThumbnail);

  const filtered = images.filter(img => !colorImages.has(img));
  preferred.push(...(filtered.length > 0 ? filtered : images[0] ? [images[0]] : []));

  return Array.from(new Set(preferred));
}

// ============================================
// Tests: URL param building
// ============================================

describe('buildColorNavParams', () => {
  it('builds params with name only', () => {
    const params = buildColorNavParams({ name: 'Azul Royal' });
    expect(params.get('cor')).toBe('Azul Royal');
    expect(params.has('hex')).toBe(false);
    expect(params.has('grupo')).toBe(false);
  });

  it('builds params with all fields', () => {
    const params = buildColorNavParams({ name: 'Vermelho', hex: '#FF0000', groupSlug: 'vermelho' });
    expect(params.get('cor')).toBe('Vermelho');
    expect(params.get('hex')).toBe('#FF0000');
    expect(params.get('grupo')).toBe('vermelho');
  });

  it('skips null/undefined fields', () => {
    const params = buildColorNavParams({ name: 'Preto', hex: null, groupSlug: undefined });
    expect(params.get('cor')).toBe('Preto');
    expect(params.has('hex')).toBe(false);
    expect(params.has('grupo')).toBe(false);
  });

  it('returns empty params when no variant', () => {
    const params = buildColorNavParams({});
    expect(params.toString()).toBe('');
  });
});

// ============================================
// Tests: Variation matching from URL params
// ============================================

const mockVariations = [
  { id: 'v1', color: { name: 'Azul Royal', hex: '#4169E1' } },
  { id: 'v2', color: { name: 'Vermelho Escuro', hex: '#8B0000' } },
  { id: 'v3', color: { name: 'Preto', hex: '#000000' } },
  { id: 'v4', color: { name: 'Prata Cromado', hex: '#D8DBDE' } },
];

const mockColors = [
  { name: 'Azul Royal', groupSlug: 'azul' },
  { name: 'Vermelho Escuro', groupSlug: 'vermelho' },
  { name: 'Preto', groupSlug: 'preto' },
  { name: 'Prata Cromado', groupSlug: 'prata' },
];

describe('findVariationByParams — exact match', () => {
  it('matches exact color name', () => {
    const params = new URLSearchParams({ cor: 'Azul Royal' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v1');
  });

  it('matches case-insensitively', () => {
    const params = new URLSearchParams({ cor: 'azul royal' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v1');
  });

  it('matches with extra whitespace', () => {
    const params = new URLSearchParams({ cor: '  Preto  ' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v3');
  });
});

describe('findVariationByParams — partial match', () => {
  it('matches "Vermelho" to "Vermelho Escuro"', () => {
    const params = new URLSearchParams({ cor: 'Vermelho' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v2');
  });

  it('matches partial from filter group name', () => {
    const params = new URLSearchParams({ cor: 'Prata' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v4');
  });
});

describe('findVariationByParams — hex fallback', () => {
  it('matches by hex when name does not match', () => {
    const params = new URLSearchParams({ cor: 'Azul Marinho', hex: '#4169E1' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v1');
  });

  it('matches hex case-insensitively', () => {
    const params = new URLSearchParams({ hex: '#d8dbde' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v4');
  });
});

describe('findVariationByParams — group fallback', () => {
  it('matches by group slug when name and hex fail', () => {
    const params = new URLSearchParams({ cor: 'Azulzão', grupo: 'azul' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBe('v1');
  });

  it('returns null when nothing matches', () => {
    const params = new URLSearchParams({ cor: 'Rosa Pink', grupo: 'rosa' });
    expect(findVariationByParams(mockVariations, mockColors, params)).toBeNull();
  });
});

describe('findVariationByParams — edge cases', () => {
  it('handles empty params', () => {
    const params = new URLSearchParams();
    expect(findVariationByParams(mockVariations, mockColors, params)).toBeNull();
  });

  it('handles empty variations array', () => {
    const params = new URLSearchParams({ cor: 'Azul' });
    expect(findVariationByParams([], [], params)).toBeNull();
  });

  it('prefers exact match over partial', () => {
    const variations = [
      { id: 'v-azul', color: { name: 'Azul', hex: '#0000FF' } },
      { id: 'v-azul-royal', color: { name: 'Azul Royal', hex: '#4169E1' } },
    ];
    const params = new URLSearchParams({ cor: 'Azul' });
    expect(findVariationByParams(variations, [], params)).toBe('v-azul');
  });

  it('prefers name match over hex match', () => {
    const variations = [
      { id: 'v1', color: { name: 'Azul Claro', hex: '#ADD8E6' } },
      { id: 'v2', color: { name: 'Outro', hex: '#ADD8E6' } },
    ];
    const params = new URLSearchParams({ cor: 'Azul Claro', hex: '#ADD8E6' });
    expect(findVariationByParams(variations, [], params)).toBe('v1');
  });
});

// ============================================
// Tests: URL sync roundtrip
// ============================================

describe('URL roundtrip — build then match', () => {
  it('builds and recovers the same variant', () => {
    const original = { name: 'Vermelho Escuro', hex: '#8B0000', groupSlug: 'vermelho' };
    const params = buildColorNavParams(original);
    const matchedId = findVariationByParams(mockVariations, mockColors, params);
    expect(matchedId).toBe('v2');
  });

  it('roundtrips all variants', () => {
    const variants = [
      { name: 'Azul Royal', hex: '#4169E1', groupSlug: 'azul', expectedId: 'v1' },
      { name: 'Preto', hex: '#000000', groupSlug: 'preto', expectedId: 'v3' },
      { name: 'Prata Cromado', hex: '#D8DBDE', groupSlug: 'prata', expectedId: 'v4' },
    ];
    for (const v of variants) {
      const params = buildColorNavParams(v);
      expect(findVariationByParams(mockVariations, mockColors, params)).toBe(v.expectedId);
    }
  });
});

// ============================================
// Tests: Share message generation
// ============================================

describe('buildShareMessage', () => {
  const base = 'Confira este produto incrível!';

  it('returns base message when no variant', () => {
    expect(buildShareMessage(base)).toBe(base);
    expect(buildShareMessage(base, null)).toBe(base);
    expect(buildShareMessage(base, undefined)).toBe(base);
  });

  it('appends variant name', () => {
    const result = buildShareMessage(base, 'Azul Royal');
    expect(result).toContain('🎨 Cor/variação: Azul Royal');
    expect(result.startsWith(base)).toBe(true);
  });

  it('includes line breaks before variant', () => {
    const result = buildShareMessage(base, 'Preto');
    expect(result).toBe(`${base}\n\n🎨 Cor/variação: Preto`);
  });
});

// ============================================
// Tests: Share image filtering
// ============================================

describe('filterMainImages', () => {
  it('returns all images when no color images exist', () => {
    const images = ['img1.jpg', 'img2.jpg', 'img3.jpg'];
    const result = filterMainImages(images, new Set());
    expect(result).toEqual(['img1.jpg', 'img2.jpg', 'img3.jpg']);
  });

  it('filters out color-specific images', () => {
    const images = ['main.jpg', 'color-red.jpg', 'color-blue.jpg'];
    const colorImages = new Set(['color-red.jpg', 'color-blue.jpg']);
    const result = filterMainImages(images, colorImages);
    expect(result).toEqual(['main.jpg']);
  });

  it('keeps at least the first image if all are color images', () => {
    const images = ['color-red.jpg', 'color-blue.jpg'];
    const colorImages = new Set(['color-red.jpg', 'color-blue.jpg']);
    const result = filterMainImages(images, colorImages);
    expect(result).toEqual(['color-red.jpg']);
  });

  it('prioritizes variant thumbnail', () => {
    const images = ['main.jpg', 'other.jpg'];
    const result = filterMainImages(images, new Set(), 'variant-thumb.jpg');
    expect(result[0]).toBe('variant-thumb.jpg');
    expect(result).toContain('main.jpg');
  });

  it('deduplicates when thumbnail is already in images', () => {
    const images = ['main.jpg', 'thumb.jpg'];
    const result = filterMainImages(images, new Set(), 'main.jpg');
    expect(result).toEqual(['main.jpg', 'thumb.jpg']);
  });

  it('handles empty images array with thumbnail', () => {
    const result = filterMainImages([], new Set(), 'thumb.jpg');
    expect(result).toEqual(['thumb.jpg']);
  });

  it('handles empty images array without thumbnail', () => {
    const result = filterMainImages([], new Set());
    expect(result).toEqual([]);
  });
});

// ============================================
// Tests: WhatsApp URL building
// ============================================

describe('WhatsApp URL format', () => {
  function buildWhatsAppUrl(message: string, phone?: string | null): string {
    const encoded = encodeURIComponent(message);
    const normalizedPhone = phone?.replace(/\D/g, '') || '';
    return normalizedPhone
      ? `https://wa.me/${normalizedPhone}?text=${encoded}`
      : `https://wa.me/?text=${encoded}`;
  }

  it('builds URL without phone', () => {
    const url = buildWhatsAppUrl('Olá!');
    expect(url).toBe('https://wa.me/?text=Ol%C3%A1!');
  });

  it('builds URL with phone', () => {
    const url = buildWhatsAppUrl('Olá!', '5511999998888');
    expect(url).toBe('https://wa.me/5511999998888?text=Ol%C3%A1!');
  });

  it('strips non-digits from phone', () => {
    const url = buildWhatsAppUrl('Oi', '+55 (11) 99999-8888');
    expect(url).toContain('wa.me/5511999998888');
  });

  it('encodes special characters in message', () => {
    const url = buildWhatsAppUrl('Preço: R$ 100,00 — 10% off');
    expect(url).toContain('text=');
    expect(decodeURIComponent(url.split('text=')[1])).toBe('Preço: R$ 100,00 — 10% off');
  });
});
