/**
 * useCatalogRealStats — Fetches real aggregate counts from the external DB.
 * Uses individual queries (not batch) because batch doesn't support countMode.
 */
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

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
      // Run 3 parallel queries with countMode: exact
      const [variantsResult, categoriesResult, suppliersResult] = await Promise.all([
        supabase
          .from('product_variants')
          .select('id', { count: 'exact', head: true }),
        supabase
          .from('categories')
          .select('id,name', { count: 'exact' })
          .eq('active', true)
          .limit(1000),
        supabase
          .from('v_suppliers_public')
          .select('id', { count: 'exact', head: true })
          .eq('active', true),
      ]);

      // Variants: use count from countMode
      const totalVariants = variantsResult.count ?? 0;

      // Categories: filter hidden ones from records
      const visible = (categoriesResult.data || []).filter((c) => !isHiddenCategory(c.name || ''));
      const totalCategories = visible.length;

      // Suppliers: use count from countMode
      const totalSuppliers = suppliersResult.count ?? 0;

      return { totalVariants, totalCategories, totalSuppliers };
    },
    staleTime: 30 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
    refetchOnWindowFocus: false,
    retry: 2,
  });
}
