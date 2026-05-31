/**
 * useCatalogRealStats — Fetches real aggregate counts from Supabase PostgREST.
 * Uses individual queries with { count: 'exact' } for precise totals.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';

export interface CatalogRealStats {
  totalVariants: number;
  totalCategories: number;
  totalSuppliers: number;
}

const HIDDEN_CATEGORY_PATTERNS = [
  'matéria',
  'prima',
  'gravações',
  'personalização',
  'suprimentos',
  'insumos',
  'gravação | mochila',
];

function isHiddenCategory(name: string): boolean {
  const lower = name.toLowerCase();
  return HIDDEN_CATEGORY_PATTERNS.some((p) => lower.includes(p));
}

export function useCatalogRealStats() {
  return useQuery<CatalogRealStats>({
    queryKey: ['catalog-real-stats', 'v4'],
    queryFn: async () => {
      // Run 3 parallel queries with count: 'exact'
      const [variantsResult, categoriesResult, suppliersResult] = await Promise.all([
        supabase.from(resolveTable('product_variants')).select('id', { count: 'exact' }).limit(1),
        supabase
          .from(resolveTable('categories'))
          .select('id,name', { count: 'exact' })
          .eq('active', true)
          .limit(1000),
        supabase
          .from(resolveTable('suppliers'))
          .select('id', { count: 'exact' })
          .eq('active', true)
          .limit(1),
      ]);

      // Handle errors with 410 handling
      if (variantsResult.error) {
        handleQueryError('useCatalogRealStats', 'product_variants', variantsResult.error);
      }
      if (categoriesResult.error) {
        handleQueryError('useCatalogRealStats', 'categories', categoriesResult.error);
      }
      if (suppliersResult.error) {
        handleQueryError('useCatalogRealStats', 'suppliers', suppliersResult.error);
      }

      // Variants: use count from exact mode
      const totalVariants = variantsResult.count ?? 0;

      // Categories: filter hidden ones from records
      const visible = (categoriesResult.data ?? []).filter((c) => !isHiddenCategory(c.name || ''));
      const totalCategories = visible.length;

      // Suppliers: use count from exact mode
      const totalSuppliers = suppliersResult.count ?? 0;

      return { totalVariants, totalCategories, totalSuppliers };
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
