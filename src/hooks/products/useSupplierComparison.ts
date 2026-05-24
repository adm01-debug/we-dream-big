import { useMemo } from 'react';
import { type Product, useProducts } from '@/hooks/products';

interface SupplierProduct {
  product: Product;
  priceDiff: number;
  priceDiffPercent: number;
  stockAdvantage: boolean;
  isLowestPrice: boolean;
  isBestStock: boolean;
}

interface SupplierComparisonResult {
  baseProduct: Product;
  alternatives: SupplierProduct[];
  lowestPrice: number;
  highestStock: number;
  priceRange: { min: number; max: number };
}

/**
 * Compares a product with alternatives from other suppliers.
 * Uses server-side category search instead of loading all 6000+ products.
 */
export function useSupplierComparison(product: Product | null | undefined) {
  // Fetch products in the same category (server-side, lazy)
  const categoryName = product?.category?.name;
  const { data: categoryProducts = [], isLoading } = useProducts(
    categoryName ? { category: categoryName } : undefined,
    { enabled: !!product && !!categoryName, staleTime: 10 * 60 * 1000 },
  );

  const result = useMemo((): SupplierComparisonResult | null => {
    if (!product || categoryProducts.length === 0) return null;

    const baseProduct = product;

    // Find similar products from different suppliers
    const similarProducts = categoryProducts.filter((p: Product) => {
      if (p.id === baseProduct.id) return false;
      if (p.supplier.id === baseProduct.supplier.id) return false;

      const nameSimilarity = calculateNameSimilarity(baseProduct.name, p.name);
      const sameCategory = p.category.id === baseProduct.category.id;

      return nameSimilarity > 0.4 && sameCategory;
    });

    if (similarProducts.length === 0) return null;

    const allProducts = [baseProduct, ...similarProducts];
    const lowestPrice = Math.min(...allProducts.map((p) => p.price));
    const highestStock = Math.max(...allProducts.map((p) => p.stock));
    const priceRange = {
      min: lowestPrice,
      max: Math.max(...allProducts.map((p) => p.price)),
    };

    const alternatives: SupplierProduct[] = similarProducts.map((product: Product) => {
      const priceDiff = product.price - baseProduct.price;
      const priceDiffPercent = baseProduct.price > 0 ? (priceDiff / baseProduct.price) * 100 : 0;

      return {
        product,
        priceDiff,
        priceDiffPercent,
        stockAdvantage: product.stock > baseProduct.stock,
        isLowestPrice: product.price === lowestPrice,
        isBestStock: product.stock === highestStock,
      };
    });

    return {
      baseProduct,
      alternatives,
      lowestPrice,
      highestStock,
      priceRange,
    };
  }, [product, categoryProducts]);

  return { result, isLoading };
}

function calculateNameSimilarity(a: string, b: string): number {
  const wordsA = a.toLowerCase().split(/\s+/).filter(w => w.length > 2);
  const wordsB = new Set(b.toLowerCase().split(/\s+/).filter(w => w.length > 2));
  if (!wordsA.length || !wordsB.size) return 0;
  const matches = wordsA.filter(w => wordsB.has(w)).length;
  return matches / Math.max(wordsA.length, wordsB.size);
}
