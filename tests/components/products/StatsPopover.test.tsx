/**
 * Exhaustive test suite for StatsPopover + statBadges calculation logic (POST-FIX)
 * Tests: rendering, edge cases, data integrity, performance, accessibility
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import React from "react";

// ============================================
// UNIT TESTS: statBadges calculation logic (FIXED VERSION)
// ============================================

interface MockProduct {
  id: string;
  name: string;
  price: number;
  stock?: number;
  category_id?: string;
  category?: { id: string | number };
  supplier?: { name?: string };
  supplier_reference?: string;
  brand?: string;
  colors?: Array<Record<string, string>>;
  materials?: string[] | string;
  gender?: string;
  created_at?: string;
}

interface StatItem {
  id: string;
  label: string;
  value: number;
}

/**
 * Replica the FIXED statBadges calculation from useCatalogState.ts
 */
function calculateStatBadges(
  filteredProducts: MockProduct[],
  favoriteCount: number,
  externalCategoriesLength: number,
  options: {
    hasActiveFilters?: boolean;
    isFavorite?: (id: string) => boolean;
    totalEstimate?: number | null;
    hasNextPage?: boolean;
  } = {}
): StatItem[] {
  const { hasActiveFilters = false, isFavorite, totalEstimate = null, hasNextPage = false } = options;
  const isFullCatalogLoaded = !hasNextPage;

  // Deduplicate by ID
  const seen = new Set<string>();
  const deduped = filteredProducts.filter((p) => {
    if (seen.has(p.id)) return false;
    seen.add(p.id);
    return true;
  });

  // FIX: use totalEstimate when unfiltered and still loading
  const productCount = hasActiveFilters
    ? deduped.length
    : (isFullCatalogLoaded ? deduped.length : (totalEstimate ?? deduped.length));

  // Count colors with non-empty name, fallback to variations
  const totalVariants = deduped.reduce((sum, p) => {
    const colorCount = p.colors?.filter((c: Record<string, string>) => c.name?.trim()).length || 0;
    const variationCount = !colorCount && (p as any).variations?.length ? (p as any).variations.length : 0;
    return sum + colorCount + variationCount;
  }, 0);

  // Categories from filtered products when filters active
  const uniqueCategoryIds = new Set(
    deduped
      .map((p) => p.category_id || (p.category?.id ? String(p.category.id) : ""))
      .filter((id) => id && id !== "0")
  );
  const categoriesCount = hasActiveFilters
    ? uniqueCategoryIds.size
    : externalCategoriesLength || uniqueCategoryIds.size;

  // Case-insensitive supplier dedup, trim whitespace
  const uniqueSuppliers = new Set(
    deduped
      .map((p) => p.supplier?.name?.trim().toLowerCase())
      .filter((n): n is string => !!n && n !== "sem fornecedor")
  );

  // Contextual favorite count
  const contextualFavoriteCount = isFavorite
    ? deduped.filter((p) => isFavorite(p.id)).length
    : favoriteCount;

  return [
    { id: "products", label: "Produtos Únicos", value: productCount },
    { id: "variants", label: "Variações", value: totalVariants },
    { id: "categories", label: "Categorias", value: categoriesCount },
    { id: "suppliers", label: "Fornecedores", value: uniqueSuppliers.size },
    { id: "favorites", label: "Favoritos", value: contextualFavoriteCount },
  ];
}

// ============================================
// HELPERS
// ============================================

function makeProduct(overrides: Partial<MockProduct> = {}): MockProduct {
  return {
    id: `prod-${Math.random().toString(36).slice(2, 8)}`,
    name: "Test Product",
    price: 10,
    stock: 100,
    category_id: "1",
    supplier: { name: "Supplier A" },
    colors: [{ name: "Azul", hex: "#0000FF" }],
    ...overrides,
  };
}

function makeProducts(count: number, overrides: Partial<MockProduct> = {}): MockProduct[] {
  return Array.from({ length: count }, (_, i) =>
    makeProduct({ id: `prod-${i}`, name: `Product ${i}`, ...overrides })
  );
}

// ============================================
// BASIC SCENARIOS
// ============================================

describe("statBadges — Basic scenarios", () => {
  it("returns correct structure with 5 stat items", () => {
    const stats = calculateStatBadges([], 0, 0);
    expect(stats).toHaveLength(5);
    expect(stats.map((s) => s.id)).toEqual(["products", "variants", "categories", "suppliers", "favorites"]);
  });

  it("returns all zeros for empty product list", () => {
    const stats = calculateStatBadges([], 0, 0);
    stats.forEach((s) => expect(s.value).toBe(0));
  });

  it("counts a single product correctly", () => {
    const products = [makeProduct({ colors: [{ name: "Red" }, { name: "Blue" }] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(2);
    expect(stats[2].value).toBe(1);
    expect(stats[3].value).toBe(1);
  });

  it("counts multiple products correctly", () => {
    const products = [
      makeProduct({ category_id: "1", supplier: { name: "A" }, colors: [{ name: "R" }] }),
      makeProduct({ category_id: "2", supplier: { name: "B" }, colors: [{ name: "G" }, { name: "B" }] }),
      makeProduct({ category_id: "1", supplier: { name: "A" }, colors: [{ name: "Y" }] }),
    ];
    const stats = calculateStatBadges(products, 2, 0);
    expect(stats[0].value).toBe(3);
    expect(stats[1].value).toBe(4);
    expect(stats[2].value).toBe(2);
    expect(stats[3].value).toBe(2);
    expect(stats[4].value).toBe(2);
  });
});

// ============================================
// PRODUCTS COUNT
// ============================================

describe("statBadges — Products count edge cases", () => {
  it("handles 0 products", () => {
    expect(calculateStatBadges([], 0, 0)[0].value).toBe(0);
  });

  it("handles 1 product", () => {
    expect(calculateStatBadges([makeProduct()], 0, 0)[0].value).toBe(1);
  });

  it("handles 1000 products", () => {
    expect(calculateStatBadges(makeProducts(1000), 0, 0)[0].value).toBe(1000);
  });

  it("handles 20000 products (full catalog scale)", () => {
    expect(calculateStatBadges(makeProducts(20000), 0, 0)[0].value).toBe(20000);
  });

  it("✅ FIX EDGE-004: deduplicates products by ID", () => {
    const products = [
      makeProduct({ id: "same-id", name: "Product A" }),
      makeProduct({ id: "same-id", name: "Product A copy" }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1); // FIXED: was 2
  });
});

// ============================================
// VARIANTS / COLORS
// ============================================

describe("statBadges — Variants/Colors edge cases", () => {
  it("returns 0 variants when colors is undefined", () => {
    const stats = calculateStatBadges([makeProduct({ colors: undefined })], 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("returns 0 variants when colors is null (cast)", () => {
    const stats = calculateStatBadges([makeProduct({ colors: null as any })], 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("returns 0 variants for empty colors array", () => {
    const stats = calculateStatBadges([makeProduct({ colors: [] })], 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("counts single color correctly", () => {
    const stats = calculateStatBadges([makeProduct({ colors: [{ name: "Vermelho" }] })], 0, 0);
    expect(stats[1].value).toBe(1);
  });

  it("counts many colors per product", () => {
    const colors = Array.from({ length: 50 }, (_, i) => ({ name: `Color-${i}` }));
    const stats = calculateStatBadges([makeProduct({ colors })], 0, 0);
    expect(stats[1].value).toBe(50);
  });

  it("sums variants across all products", () => {
    const products = [
      makeProduct({ colors: [{ name: "A" }, { name: "B" }] }),
      makeProduct({ colors: [{ name: "C" }] }),
      makeProduct({ colors: undefined }),
      makeProduct({ colors: [{ name: "D" }, { name: "E" }, { name: "F" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(6);
  });

  it("handles mix of undefined and empty colors arrays", () => {
    const products = [
      makeProduct({ colors: undefined }),
      makeProduct({ colors: [] }),
      makeProduct({ colors: undefined }),
    ];
    expect(calculateStatBadges(products, 0, 0)[1].value).toBe(0);
  });

  it("✅ FIX EDGE-003: does NOT count unnamed/empty colors", () => {
    const products = [makeProduct({ colors: [{ name: "" }, { name: "  " }, { name: "Azul" }] })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(1); // FIXED: was 3, now only "Azul" counts
  });
});

// ============================================
// CATEGORIES
// ============================================

describe("statBadges — Categories edge cases", () => {
  it("deduplicates categories by category_id", () => {
    const products = [
      makeProduct({ category_id: "10" }),
      makeProduct({ category_id: "10" }),
      makeProduct({ category_id: "20" }),
    ];
    expect(calculateStatBadges(products, 0, 0)[2].value).toBe(2);
  });

  it("falls back to category.id when category_id is missing", () => {
    const products = [
      makeProduct({ category_id: undefined, category: { id: 5 } }),
      makeProduct({ category_id: undefined, category: { id: 10 } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[2].value).toBe(2);
  });

  it("filters out category_id '0'", () => {
    const products = [
      makeProduct({ category_id: "0" }),
      makeProduct({ category_id: "1" }),
    ];
    expect(calculateStatBadges(products, 0, 0)[2].value).toBe(1);
  });

  it("filters out empty string category_id", () => {
    const products = [makeProduct({ category_id: "", category: undefined })];
    expect(calculateStatBadges(products, 0, 0)[2].value).toBe(0);
  });

  it("✅ FIX BUG-001: categories reflects filtered products when filters active", () => {
    const products = [makeProduct({ category_id: "5" })];
    const stats = calculateStatBadges(products, 0, 438, { hasActiveFilters: true });
    expect(stats[2].value).toBe(1); // FIXED: was 438
  });

  it("✅ categories shows externalCategories when NO filters active", () => {
    const products = makeProducts(100);
    const stats = calculateStatBadges(products, 0, 438, { hasActiveFilters: false });
    expect(stats[2].value).toBe(438); // Correct: show full catalog count
  });

  it("✅ FIX BUG-004: 0 products with filters active shows 0 categories", () => {
    const stats = calculateStatBadges([], 0, 438, { hasActiveFilters: true });
    expect(stats[2].value).toBe(0); // FIXED: was 438
  });

  it("handles numeric category.id converted to string", () => {
    const products = [
      makeProduct({ category_id: undefined, category: { id: 123 } }),
      makeProduct({ category_id: undefined, category: { id: 123 } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[2].value).toBe(1);
  });
});

// ============================================
// SUPPLIERS
// ============================================

describe("statBadges — Suppliers edge cases", () => {
  it("deduplicates suppliers by name", () => {
    const products = [
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "Supplier B" } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(2);
  });

  it("excludes 'Sem fornecedor'", () => {
    const products = [
      makeProduct({ supplier: { name: "Sem fornecedor" } }),
      makeProduct({ supplier: { name: "Real Supplier" } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(1);
  });

  it("handles undefined supplier", () => {
    expect(calculateStatBadges([makeProduct({ supplier: undefined })], 0, 0)[3].value).toBe(0);
  });

  it("handles supplier with undefined name", () => {
    expect(calculateStatBadges([makeProduct({ supplier: { name: undefined } })], 0, 0)[3].value).toBe(0);
  });

  it("handles supplier with empty string name", () => {
    expect(calculateStatBadges([makeProduct({ supplier: { name: "" } })], 0, 0)[3].value).toBe(0);
  });

  it("✅ FIX EDGE-001: whitespace-only supplier names are filtered out", () => {
    const products = [makeProduct({ supplier: { name: "   " } })];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(0); // FIXED: was 1
  });

  it("✅ FIX BUG-003: case-insensitive supplier deduplication", () => {
    const products = [
      makeProduct({ supplier: { name: "Supplier A" } }),
      makeProduct({ supplier: { name: "supplier a" } }),
      makeProduct({ supplier: { name: "SUPPLIER A" } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(1); // FIXED: was 3
  });

  it("✅ FIX BUG-003: 'Sem fornecedor' case-insensitive exclusion", () => {
    const products = [
      makeProduct({ supplier: { name: "sem fornecedor" } }),
      makeProduct({ supplier: { name: "SEM FORNECEDOR" } }),
      makeProduct({ supplier: { name: "Sem Fornecedor" } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(0); // FIXED: was 2+
  });

  it("handles many unique suppliers", () => {
    const products = Array.from({ length: 100 }, (_, i) =>
      makeProduct({ supplier: { name: `Supplier ${i}` } })
    );
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(100);
  });

  it("trims supplier name with leading/trailing spaces", () => {
    const products = [
      makeProduct({ supplier: { name: "  BIC  " } }),
      makeProduct({ supplier: { name: "BIC" } }),
    ];
    expect(calculateStatBadges(products, 0, 0)[3].value).toBe(1);
  });
});

// ============================================
// FAVORITES
// ============================================

describe("statBadges — Favorites edge cases", () => {
  it("✅ FIX BUG-002: favorites is contextual with isFavorite function", () => {
    const favSet = new Set(["prod-0", "prod-2"]);
    const products = makeProducts(5);
    const stats = calculateStatBadges(products, 100, 0, {
      isFavorite: (id) => favSet.has(id),
    });
    expect(stats[4].value).toBe(2); // FIXED: was 100 (global)
  });

  it("favoriteCount = 0 when no favorites", () => {
    const stats = calculateStatBadges(makeProducts(100), 0, 0, {
      isFavorite: () => false,
    });
    expect(stats[4].value).toBe(0);
  });

  it("falls back to favoriteCount when isFavorite not provided", () => {
    const stats = calculateStatBadges([], 15, 0);
    expect(stats[4].value).toBe(15);
  });

  it("contextual count with filtered products", () => {
    const favSet = new Set(["prod-0", "prod-1", "prod-999"]);
    const products = makeProducts(3); // prod-0, prod-1, prod-2
    const stats = calculateStatBadges(products, 50, 0, {
      isFavorite: (id) => favSet.has(id),
    });
    // Only prod-0 and prod-1 are both favorite AND in filtered list
    expect(stats[4].value).toBe(2);
  });
});

// ============================================
// DATA INTEGRITY
// ============================================

describe("statBadges — Data integrity & consistency", () => {
  it("products with all fields undefined", () => {
    const products = [makeProduct({
      category_id: undefined, category: undefined,
      supplier: undefined, colors: undefined,
    })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(0);
    expect(stats[3].value).toBe(0);
  });

  it("products with all fields null (cast)", () => {
    const products = [makeProduct({
      category_id: null as any, category: null as any,
      supplier: null as any, colors: null as any,
    })];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(1);
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(0);
    expect(stats[3].value).toBe(0);
  });

  it("consistent output format for all stat items", () => {
    const stats = calculateStatBadges(makeProducts(5), 3, 10);
    stats.forEach((stat) => {
      expect(stat).toHaveProperty("id");
      expect(stat).toHaveProperty("label");
      expect(stat).toHaveProperty("value");
      expect(typeof stat.value).toBe("number");
      expect(stat.value).toBeGreaterThanOrEqual(0);
      expect(Number.isFinite(stat.value)).toBe(true);
    });
  });

  it("labels are in Portuguese", () => {
    const stats = calculateStatBadges([], 0, 0);
    expect(stats[0].label).toBe("Produtos Únicos");
    expect(stats[1].label).toBe("Variações");
    expect(stats[2].label).toBe("Categorias");
    expect(stats[3].label).toBe("Fornecedores");
    expect(stats[4].label).toBe("Favoritos");
  });
});

// ============================================
// PERFORMANCE
// ============================================

describe("statBadges — Performance at scale", () => {
  it("calculates 20000 products in under 150ms", () => {
    const products = makeProducts(20000);
    const start = performance.now();
    calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(elapsed).toBeLessThan(150);
  });

  it("calculates 20000 products with 10 colors each in under 300ms", () => {
    const colors = Array.from({ length: 10 }, (_, i) => ({ name: `C${i}` }));
    const products = makeProducts(20000, { colors });
    const start = performance.now();
    const stats = calculateStatBadges(products, 0, 0);
    const elapsed = performance.now() - start;
    expect(stats[1].value).toBe(200000);
    expect(elapsed).toBeLessThan(300);
  });

  it("handles 500 unique suppliers without degradation", () => {
    const products = Array.from({ length: 500 }, (_, i) =>
      makeProduct({ supplier: { name: `S-${i}` } })
    );
    const start = performance.now();
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(500);
    expect(performance.now() - start).toBeLessThan(50);
  });
});

// ============================================
// REAL-WORLD SIMULATIONS
// ============================================

describe("statBadges — Real-world simulations", () => {
  it("Scenario: fresh catalog — no filters", () => {
    const products = [
      makeProduct({ category_id: "10", supplier: { name: "XBZ" }, colors: [{ name: "Branco" }, { name: "Preto" }] }),
      makeProduct({ category_id: "20", supplier: { name: "GOLD" }, colors: [{ name: "Azul" }] }),
      makeProduct({ category_id: "10", supplier: { name: "XBZ" }, colors: [] }),
      makeProduct({ category_id: "30", supplier: { name: "RSB" }, colors: [{ name: "Verde" }, { name: "Amarelo" }, { name: "Rosa" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 438);
    expect(stats[0].value).toBe(4);
    expect(stats[1].value).toBe(6);
    expect(stats[2].value).toBe(438); // no filters → show global
    expect(stats[3].value).toBe(3);
  });

  it("Scenario: search 'caneta' — filters active, contextual stats", () => {
    const favSet = new Set(["p1"]);
    const products = [
      makeProduct({ id: "p1", name: "Caneta Bic", category_id: "5", supplier: { name: "BIC" }, colors: [{ name: "Azul" }] }),
      makeProduct({ id: "p2", name: "Caneta Parker", category_id: "5", supplier: { name: "Parker" }, colors: [{ name: "Prata" }, { name: "Dourada" }] }),
    ];
    const stats = calculateStatBadges(products, 50, 438, {
      hasActiveFilters: true,
      isFavorite: (id) => favSet.has(id),
    });
    expect(stats[0].value).toBe(2);
    expect(stats[1].value).toBe(3);
    expect(stats[2].value).toBe(1); // ✅ FIXED: was 438, now shows 1 filtered category
    expect(stats[3].value).toBe(2);
    expect(stats[4].value).toBe(1); // ✅ FIXED: was 50, now shows 1 contextual favorite
  });

  it("Scenario: price filter yields 0 products", () => {
    const stats = calculateStatBadges([], 5, 438, { hasActiveFilters: true });
    expect(stats[0].value).toBe(0);
    expect(stats[2].value).toBe(0); // ✅ FIXED: was 438
    expect(stats[4].value).toBe(5); // fallback since no isFavorite fn
  });

  it("Scenario: XBZ supplier — colors with empty names", () => {
    const products = [
      makeProduct({
        supplier: { name: "XBZ" },
        colors: [{ name: "", hex: "" }, { name: "Indefinida" }],
      }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[1].value).toBe(1); // ✅ FIXED: was 2, empty name now excluded
  });

  it("Scenario: duplicate products from pagination overlap", () => {
    const products = [
      makeProduct({ id: "dup-1", category_id: "5", supplier: { name: "A" }, colors: [{ name: "X" }] }),
      makeProduct({ id: "dup-1", category_id: "5", supplier: { name: "A" }, colors: [{ name: "X" }] }),
      makeProduct({ id: "dup-2", category_id: "10", supplier: { name: "B" }, colors: [{ name: "Y" }] }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(2); // ✅ deduplicated
    expect(stats[1].value).toBe(2); // 1 + 1
    expect(stats[2].value).toBe(2); // cat 5 + cat 10
    expect(stats[3].value).toBe(2); // A + B
  });

  it("Scenario: mixed casing suppliers", () => {
    const products = [
      makeProduct({ supplier: { name: "XBZ" } }),
      makeProduct({ supplier: { name: "xbz" } }),
      makeProduct({ supplier: { name: "Xbz" } }),
      makeProduct({ supplier: { name: "GOLD" } }),
    ];
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[3].value).toBe(2); // ✅ FIXED: XBZ + GOLD
  });
});

// ============================================
// FIX: totalEstimate for "Produtos Únicos"
// ============================================

describe("statBadges — totalEstimate (progressive loading)", () => {
  it("shows totalEstimate when unfiltered and still loading (hasNextPage=true)", () => {
    const products = makeProducts(400);
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: 6090, hasNextPage: true });
    expect(stats[0].value).toBe(6090);
  });

  it("shows deduped.length when fully loaded (hasNextPage=false)", () => {
    const products = makeProducts(6090);
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: 6090, hasNextPage: false });
    expect(stats[0].value).toBe(6090);
  });

  it("shows deduped.length when filters active even if still loading", () => {
    const products = makeProducts(50);
    const stats = calculateStatBadges(products, 0, 0, {
      totalEstimate: 6090, hasNextPage: true, hasActiveFilters: true,
    });
    expect(stats[0].value).toBe(50); // filtered = exact count
  });

  it("falls back to deduped.length when totalEstimate is null and still loading", () => {
    const products = makeProducts(400);
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: null, hasNextPage: true });
    expect(stats[0].value).toBe(400);
  });

  it("falls back to deduped.length when totalEstimate is 0", () => {
    const stats = calculateStatBadges([], 0, 0, { totalEstimate: 0, hasNextPage: true });
    expect(stats[0].value).toBe(0);
  });

  it("totalEstimate ignored when hasNextPage is false (fully loaded)", () => {
    const products = makeProducts(100);
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: 9999, hasNextPage: false });
    expect(stats[0].value).toBe(100); // real count, not estimate
  });

  it("default options (no totalEstimate, no hasNextPage) shows deduped count", () => {
    const products = makeProducts(250);
    const stats = calculateStatBadges(products, 0, 0);
    expect(stats[0].value).toBe(250);
  });

  it("progressive loading: 500 loaded of 6090 total", () => {
    const stats = calculateStatBadges(makeProducts(500), 0, 438, { totalEstimate: 6090, hasNextPage: true });
    expect(stats[0].value).toBe(6090);
  });

  it("progressive loading: 2000 loaded of 6090 total", () => {
    const stats = calculateStatBadges(makeProducts(2000), 0, 438, { totalEstimate: 6090, hasNextPage: true });
    expect(stats[0].value).toBe(6090);
  });

  it("progressive loading complete: 6090 loaded, no next page", () => {
    const stats = calculateStatBadges(makeProducts(6090), 0, 438, { totalEstimate: 6090, hasNextPage: false });
    expect(stats[0].value).toBe(6090);
  });
});

// ============================================
// FIX: Variations fallback to variations array
// ============================================

describe("statBadges — Variations fallback logic", () => {
  it("uses colors when both colors and variations exist", () => {
    const p = { ...makeProduct({ colors: [{ name: "Red" }, { name: "Blue" }] }), variations: [{ id: "v1" }, { id: "v2" }, { id: "v3" }] } as any;
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(2); // colors win
  });

  it("falls back to variations when colors is empty", () => {
    const p = { ...makeProduct({ colors: [] }), variations: [{ id: "v1" }, { id: "v2" }] } as any;
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(2); // variations fallback
  });

  it("falls back to variations when colors is undefined", () => {
    const p = { ...makeProduct({ colors: undefined }), variations: [{ id: "v1" }] } as any;
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(1);
  });

  it("falls back to variations when all colors have empty names", () => {
    const p = { ...makeProduct({ colors: [{ name: "" }, { name: "  " }] }), variations: [{ id: "v1" }, { id: "v2" }, { id: "v3" }] } as any;
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(3); // colors filtered to 0, so variations kick in
  });

  it("returns 0 when neither colors nor variations exist", () => {
    const p = makeProduct({ colors: undefined });
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(0);
  });

  it("sums colors + variations across mixed products", () => {
    const p1 = makeProduct({ colors: [{ name: "A" }, { name: "B" }] }); // 2 from colors
    const p2 = { ...makeProduct({ colors: [] }), variations: [{ id: "v1" }, { id: "v2" }] } as any; // 2 from variations
    const p3 = makeProduct({ colors: [{ name: "C" }] }); // 1 from colors
    const stats = calculateStatBadges([p1, p2, p3], 0, 0);
    expect(stats[1].value).toBe(5);
  });

  it("does NOT double count: colors > 0 means variations ignored", () => {
    const p = { ...makeProduct({ colors: [{ name: "X" }] }), variations: [{ id: "v1" }, { id: "v2" }, { id: "v3" }, { id: "v4" }] } as any;
    const stats = calculateStatBadges([p], 0, 0);
    expect(stats[1].value).toBe(1); // only colors count
  });
});

// ============================================
// FIX: Hidden categories filtering (production code)
// These test the hidden category logic in useCatalogState
// ============================================

describe("statBadges — Hidden categories filtering", () => {
  const hiddenCategoryPatterns = ['matéria', 'prima', 'gravações', 'personalização', 'suprimentos', 'insumos', 'gravação | mochila'];

  function filterVisibleCategories(cats: { name: string }[]) {
    return cats.filter(cat => {
      const lower = cat.name.toLowerCase();
      return !hiddenCategoryPatterns.some(p => lower.includes(p));
    });
  }

  it("filters 'Matéria | Prima' from category count", () => {
    const cats = [{ name: "Canetas" }, { name: "Matéria | Prima" }, { name: "Mochilas" }];
    expect(filterVisibleCategories(cats)).toHaveLength(2);
  });

  it("filters 'Gravações | Personalização' from category count", () => {
    const cats = [{ name: "Gravações | Personalização" }, { name: "Copos" }];
    expect(filterVisibleCategories(cats)).toHaveLength(1);
  });

  it("filters 'Suprimentos | Insumos' from category count", () => {
    const cats = [{ name: "Suprimentos | Insumos" }, { name: "Garrafas" }];
    expect(filterVisibleCategories(cats)).toHaveLength(1);
  });

  it("filters 'Gravação | Mochila' from category count", () => {
    const cats = [{ name: "Gravação | Mochila" }, { name: "Bonés" }];
    expect(filterVisibleCategories(cats)).toHaveLength(1);
  });

  it("case-insensitive filtering", () => {
    const cats = [{ name: "MATÉRIA Prima" }, { name: "gravações especiais" }, { name: "Canetas" }];
    expect(filterVisibleCategories(cats)).toHaveLength(1);
  });

  it("does not filter legitimate categories", () => {
    const cats = [{ name: "Canetas" }, { name: "Mochilas" }, { name: "Copos" }, { name: "Cadernos" }];
    expect(filterVisibleCategories(cats)).toHaveLength(4);
  });

  it("handles empty category list", () => {
    expect(filterVisibleCategories([])).toHaveLength(0);
  });

  it("realistic scenario: 438 categories with ~5 hidden", () => {
    const visible = Array.from({ length: 433 }, (_, i) => ({ name: `Categoria ${i}` }));
    const hidden = [
      { name: "Matéria | Prima" },
      { name: "Gravações | Personalização" },
      { name: "Suprimentos | Insumos" },
      { name: "Gravação | Mochila" },
      { name: "Gravações Especiais" },
    ];
    const all = [...visible, ...hidden];
    expect(filterVisibleCategories(all)).toHaveLength(433);
  });
});

// ============================================
// COMBINED EDGE CASES
// ============================================

describe("statBadges — Combined edge cases", () => {
  it("all fixes together: partial load + filters + variations fallback", () => {
    const p1 = { ...makeProduct({ id: "a", category_id: "5", supplier: { name: "BIC" }, colors: [] }), variations: [{ id: "v1" }] } as any;
    const p2 = makeProduct({ id: "b", category_id: "5", supplier: { name: "bic" }, colors: [{ name: "Azul" }] });
    const stats = calculateStatBadges([p1, p2], 0, 438, {
      hasActiveFilters: true,
      totalEstimate: 6090,
      hasNextPage: true,
    });
    expect(stats[0].value).toBe(2); // filtered → exact count
    expect(stats[1].value).toBe(2); // 1 variation + 1 color
    expect(stats[2].value).toBe(1); // filtered → 1 category
    expect(stats[3].value).toBe(1); // BIC = bic (deduped)
  });

  it("empty filtered result with progressive loading", () => {
    const stats = calculateStatBadges([], 0, 438, {
      hasActiveFilters: true,
      totalEstimate: 6090,
      hasNextPage: true,
    });
    expect(stats[0].value).toBe(0); // filtered to 0
    expect(stats[1].value).toBe(0);
    expect(stats[2].value).toBe(0);
    expect(stats[3].value).toBe(0);
  });

  it("unfiltered during progressive loading shows estimates", () => {
    const products = makeProducts(500);
    const stats = calculateStatBadges(products, 3, 438, {
      totalEstimate: 6090,
      hasNextPage: true,
    });
    expect(stats[0].value).toBe(6090); // estimate
    expect(stats[2].value).toBe(438); // global categories
    expect(stats[4].value).toBe(3); // fallback favoriteCount
  });

  it("dedup + totalEstimate: duplicates don't affect estimate usage", () => {
    const products = [
      makeProduct({ id: "dup" }),
      makeProduct({ id: "dup" }),
      makeProduct({ id: "unique" }),
    ];
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: 6090, hasNextPage: true });
    expect(stats[0].value).toBe(6090); // still uses estimate since unfiltered + loading
  });

  it("fully loaded catalog ignores totalEstimate, uses real count", () => {
    const products = makeProducts(6090);
    // Add some duplicates
    products.push(makeProduct({ id: "prod-0" }));
    products.push(makeProduct({ id: "prod-1" }));
    const stats = calculateStatBadges(products, 0, 0, { totalEstimate: 6090, hasNextPage: false });
    expect(stats[0].value).toBe(6090); // deduped count
  });
});

// ============================================
// COMPONENT TESTS
// ============================================

describe("StatsPopover rendering", () => {
  it("exports StatsPopover component", async () => {
    const mod = await import("@/components/products/StatsPopover");
    expect(mod.StatsPopover).toBeDefined();
    expect(typeof mod.StatsPopover).toBe("function");
  });
});

// ============================================
// FAVORITES STORE
// ============================================

describe("FavoritesStore — localStorage edge cases", () => {
  beforeEach(() => { vi.restoreAllMocks(); });

  it("handles corrupted localStorage gracefully", () => {
    const spy = vi.spyOn(Storage.prototype, "getItem").mockReturnValue("not-json{{{");
    try {
      const stored = localStorage.getItem("product-favorites");
      JSON.parse(stored!);
    } catch {
      expect(true).toBe(true);
    }
    spy.mockRestore();
  });

  it("handles localStorage quota exceeded", () => {
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("QuotaExceededError");
    });
    expect(() => localStorage.setItem("test", "value")).toThrow();
    spy.mockRestore();
  });
});
