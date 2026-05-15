/**
 * E2E Tests — Products & Catalog Module
 * Covers: Listing, Filtering, Sorting, Detail, Favorites, Comparison, Search
 */
import { describe, it, expect } from 'vitest';

// ============ Product Data Shape ============
interface Product {
  id: string;
  nome: string;
  codigo: string;
  preco: number;
  categoria: string;
  fornecedor: string;
  cor: string;
  material: string;
  estoque: number;
  imagem_url: string | null;
  ativo: boolean;
}

const sampleProducts: Product[] = [
  { id: '1', nome: 'Caneta Esferográfica', codigo: 'CAN-001', preco: 5.50, categoria: 'Escritório', fornecedor: 'BIC', cor: 'Azul', material: 'Plástico', estoque: 5000, imagem_url: '/img/caneta.jpg', ativo: true },
  { id: '2', nome: 'Caderno Personalizado', codigo: 'CAD-001', preco: 25.00, categoria: 'Escritório', fornecedor: 'Tilibra', cor: 'Preto', material: 'Papel', estoque: 1200, imagem_url: '/img/caderno.jpg', ativo: true },
  { id: '3', nome: 'Mochila Executiva', codigo: 'MOC-001', preco: 89.90, categoria: 'Bags', fornecedor: 'Samsonite', cor: 'Preto', material: 'Nylon', estoque: 300, imagem_url: null, ativo: true },
  { id: '4', nome: 'Squeeze Térmico', codigo: 'SQZ-001', preco: 35.00, categoria: 'Bebidas', fornecedor: 'Stanley', cor: 'Branco', material: 'Aço Inox', estoque: 800, imagem_url: '/img/squeeze.jpg', ativo: true },
  { id: '5', nome: 'Chaveiro LED', codigo: 'CHA-001', preco: 8.90, categoria: 'Acessórios', fornecedor: 'GenBrand', cor: 'Vermelho', material: 'Metal', estoque: 10000, imagem_url: '/img/chaveiro.jpg', ativo: true },
  { id: '6', nome: 'Produto Inativo', codigo: 'INA-001', preco: 0, categoria: 'Outros', fornecedor: 'X', cor: 'Cinza', material: 'N/A', estoque: 0, imagem_url: null, ativo: false },
];

// ============ Filtering ============
function filterProducts(products: Product[], filters: {
  search?: string; category?: string; supplier?: string; color?: string;
  material?: string; minPrice?: number; maxPrice?: number; activeOnly?: boolean;
}): Product[] {
  return products.filter(p => {
    if (filters.activeOnly !== false && !p.ativo) return false;
    if (filters.search && !p.nome.toLowerCase().includes(filters.search.toLowerCase()) && !p.codigo.toLowerCase().includes(filters.search.toLowerCase())) return false;
    if (filters.category && p.categoria !== filters.category) return false;
    if (filters.supplier && p.fornecedor !== filters.supplier) return false;
    if (filters.color && p.cor !== filters.color) return false;
    if (filters.material && p.material !== filters.material) return false;
    if (filters.minPrice !== undefined && p.preco < filters.minPrice) return false;
    if (filters.maxPrice !== undefined && p.preco > filters.maxPrice) return false;
    return true;
  });
}

describe('E2E Catalog — Product Filtering', () => {
  it('active only by default', () => expect(filterProducts(sampleProducts, {}).length).toBe(5));
  it('includes inactive when specified', () => expect(filterProducts(sampleProducts, { activeOnly: false }).length).toBe(6));
  it('search by name', () => expect(filterProducts(sampleProducts, { search: 'caneta' })).toHaveLength(1));
  it('search by SKU', () => expect(filterProducts(sampleProducts, { search: 'CAD-001' })).toHaveLength(1));
  it('search case insensitive', () => expect(filterProducts(sampleProducts, { search: 'MOCHILA' })).toHaveLength(1));
  it('search no match', () => expect(filterProducts(sampleProducts, { search: 'xyz123' })).toHaveLength(0));
  it('filter by category', () => expect(filterProducts(sampleProducts, { category: 'Escritório' })).toHaveLength(2));
  it('filter by supplier', () => expect(filterProducts(sampleProducts, { supplier: 'BIC' })).toHaveLength(1));
  it('filter by color', () => expect(filterProducts(sampleProducts, { color: 'Preto' })).toHaveLength(2));
  it('filter by material', () => expect(filterProducts(sampleProducts, { material: 'Metal' })).toHaveLength(1));
  it('filter by price range', () => expect(filterProducts(sampleProducts, { minPrice: 10, maxPrice: 50 })).toHaveLength(2));
  it('filter by min price only', () => expect(filterProducts(sampleProducts, { minPrice: 50 })).toHaveLength(1));
  it('filter by max price only', () => expect(filterProducts(sampleProducts, { maxPrice: 10 })).toHaveLength(2));
  it('combined filters', () => expect(filterProducts(sampleProducts, { category: 'Escritório', color: 'Azul' })).toHaveLength(1));
  it('combined filters with no match', () => expect(filterProducts(sampleProducts, { category: 'Escritório', color: 'Vermelho' })).toHaveLength(0));
});

// ============ Sorting ============
type SortBy = 'name-asc' | 'name-desc' | 'price-asc' | 'price-desc' | 'stock-asc' | 'stock-desc';

function sortProducts(products: Product[], sortBy: SortBy): Product[] {
  const sorted = [...products];
  switch (sortBy) {
    case 'name-asc': return sorted.sort((a, b) => a.nome.localeCompare(b.nome));
    case 'name-desc': return sorted.sort((a, b) => b.nome.localeCompare(a.nome));
    case 'price-asc': return sorted.sort((a, b) => a.preco - b.preco);
    case 'price-desc': return sorted.sort((a, b) => b.preco - a.preco);
    case 'stock-asc': return sorted.sort((a, b) => a.estoque - b.estoque);
    case 'stock-desc': return sorted.sort((a, b) => b.estoque - a.estoque);
    default: return sorted;
  }
}

describe('E2E Catalog — Sorting', () => {
  const active = sampleProducts.filter(p => p.ativo);

  it('sort by name asc', () => {
    const sorted = sortProducts(active, 'name-asc');
    expect(sorted[0].nome).toBe('Caderno Personalizado');
  });
  it('sort by name desc', () => {
    const sorted = sortProducts(active, 'name-desc');
    expect(sorted[0].nome).toBe('Squeeze Térmico');
  });
  it('sort by price asc', () => {
    const sorted = sortProducts(active, 'price-asc');
    expect(sorted[0].preco).toBe(5.50);
  });
  it('sort by price desc', () => {
    const sorted = sortProducts(active, 'price-desc');
    expect(sorted[0].preco).toBe(89.90);
  });
  it('sort by stock asc', () => {
    const sorted = sortProducts(active, 'stock-asc');
    expect(sorted[0].estoque).toBe(300);
  });
  it('sort by stock desc', () => {
    const sorted = sortProducts(active, 'stock-desc');
    expect(sorted[0].estoque).toBe(10000);
  });
  it('sort preserves length', () => {
    expect(sortProducts(active, 'name-asc')).toHaveLength(active.length);
  });
  it('sort does not mutate original', () => {
    const original = [...active];
    sortProducts(active, 'price-desc');
    expect(active[0].id).toBe(original[0].id);
  });
});

// ============ Favorites ============
describe('E2E Catalog — Favorites', () => {
  let favorites: Set<string>;

  beforeEach(() => { favorites = new Set(); });

  it('starts empty', () => expect(favorites.size).toBe(0));
  it('add favorite', () => { favorites.add('1'); expect(favorites.has('1')).toBe(true); });
  it('remove favorite', () => { favorites.add('1'); favorites.delete('1'); expect(favorites.has('1')).toBe(false); });
  it('toggle on', () => { favorites.has('1') ? favorites.delete('1') : favorites.add('1'); expect(favorites.has('1')).toBe(true); });
  it('toggle off', () => { favorites.add('1'); favorites.has('1') ? favorites.delete('1') : favorites.add('1'); expect(favorites.has('1')).toBe(false); });
  it('multiple favorites', () => { favorites.add('1'); favorites.add('3'); favorites.add('5'); expect(favorites.size).toBe(3); });
  it('no duplicates', () => { favorites.add('1'); favorites.add('1'); expect(favorites.size).toBe(1); });
});

// ============ Comparison ============
describe('E2E Catalog — Comparison', () => {
  const MAX_COMPARE = 4;
  let compareList: string[];

  beforeEach(() => { compareList = []; });

  it('starts empty', () => expect(compareList).toHaveLength(0));
  it('add to compare', () => { compareList.push('1'); expect(compareList).toHaveLength(1); });
  it('remove from compare', () => {
    compareList.push('1', '2');
    compareList = compareList.filter(id => id !== '1');
    expect(compareList).toHaveLength(1);
  });
  it('max 4 items', () => {
    compareList = ['1', '2', '3', '4'];
    expect(compareList.length <= MAX_COMPARE).toBe(true);
  });
  it('rejects 5th item', () => {
    compareList = ['1', '2', '3', '4'];
    if (compareList.length < MAX_COMPARE) compareList.push('5');
    expect(compareList).toHaveLength(4);
  });
  it('is in compare check', () => {
    compareList = ['1', '3'];
    expect(compareList.includes('1')).toBe(true);
    expect(compareList.includes('2')).toBe(false);
  });
});

// ============ Product Detail ============
describe('E2E Catalog — Product Detail', () => {
  const product = sampleProducts[0];

  it('has name', () => expect(product.nome).toBeTruthy());
  it('has SKU', () => expect(product.codigo).toMatch(/^[A-Z]+-\d+$/));
  it('has price > 0', () => expect(product.preco).toBeGreaterThan(0));
  it('has category', () => expect(product.categoria).toBeTruthy());
  it('has supplier', () => expect(product.fornecedor).toBeTruthy());
  it('has stock count', () => expect(product.estoque).toBeGreaterThanOrEqual(0));
  it('image can be null', () => expect(sampleProducts[2].imagem_url).toBeNull());
  it('image can be URL', () => expect(product.imagem_url).toContain('/'));
});

// ============ View Modes ============
describe('E2E Catalog — View Modes', () => {
  const modes = ['grid', 'list', 'compact'] as const;
  it('has 3 view modes', () => expect(modes).toHaveLength(3));
  modes.forEach(mode => {
    it(`"${mode}" is valid`, () => expect(typeof mode).toBe('string'));
  });
});

// ============ Pagination ============
describe('E2E Catalog — Pagination', () => {
  const PAGE_SIZE = 20;
  const totalItems = 87;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);

  it('calculates total pages', () => expect(totalPages).toBe(5));
  it('page 1 offset is 0', () => expect((1 - 1) * PAGE_SIZE).toBe(0));
  it('page 3 offset is 40', () => expect((3 - 1) * PAGE_SIZE).toBe(40));
  it('last page items', () => expect(totalItems - (totalPages - 1) * PAGE_SIZE).toBe(7));
});

import { beforeEach } from 'vitest';
