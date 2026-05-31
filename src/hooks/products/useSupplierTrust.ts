/**
 * Hook to fetch real supplier trust data for badges.
 * Sources: variant_supplier_sources (lead_time_days) + suppliers (active flag).
 * Falls back to deterministic mock when no real data is available.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import { type SupplierTrustData, getMockSupplierTrust } from '@/components/common/SocialProof';
import { logger } from '@/lib/logger';

/**
 * Fetches real supplier trust data for a product.
 * Returns mock data as fallback if no real data is found.
 */
export function useSupplierTrust(productId?: string) {
  return useQuery({
    queryKey: ['supplier-trust', productId],
    queryFn: async (): Promise<SupplierTrustData> => {
      if (!productId) return getMockSupplierTrust('unknown');

      try {
        // 1. Get variant IDs for this product first
        const { data: variants, error: variantError } = await supabase
          .from(resolveTable('product_variants'))
          .select('id')
          .eq('product_id', productId)
          .eq('is_active', true)
          .limit(10);

        if (variantError) {
          handleQueryError('useSupplierTrust', 'product_variants', variantError);
          return getMockSupplierTrust(productId);
        }

        const variantIds = (variants ?? []).map((v) => v.id);
        if (!variantIds.length) {
          return getMockSupplierTrust(productId);
        }

        // 2. Get preferred supplier source using variant_id
        const { data: sources, error: vssError } = await supabase
          .from(resolveTable('variant_supplier_sources'))
          .select('id,supplier_id,lead_time_days,is_preferred,is_active')
          .eq('variant_id', variantIds[0])
          .eq('is_active', true)
          .order('is_preferred', { ascending: false })
          .limit(5);

        if (vssError) {
          handleQueryError('useSupplierTrust', 'variant_supplier_sources', vssError);
          return getMockSupplierTrust(productId);
        }

        if (!sources?.length) {
          // No real data — fallback to mock
          return getMockSupplierTrust(productId);
        }

        // Use preferred source, or first active one
        const preferred = sources.find((s) => s.is_preferred) ?? sources[0];
        const leadTimeDays = preferred.lead_time_days;

        // 3. Check if supplier is "verified" (active in suppliers table)
        let isVerified = false;
        if (preferred.supplier_id) {
          try {
            const { data: supplierRows, error: supplierError } = await supabase
              .from(resolveTable('suppliers'))
              .select('id,name,active')
              .eq('id', preferred.supplier_id)
              .limit(1);

            if (supplierError) {
              handleQueryError('useSupplierTrust', 'suppliers', supplierError);
            } else if (supplierRows?.length) {
              isVerified = supplierRows[0].active !== false;
            }
          } catch {
            // Supplier lookup failed — mark as not verified
            isVerified = false;
          }
        }

        // 4. Mock rating (no ratings table exists yet)
        // Use deterministic value from productId but mark as "real-ish"
        const mock = getMockSupplierTrust(productId);
        const avgRating = mock.avgRating; // Will be replaced when ratings table exists

        return {
          isVerified,
          deliveryDays: leadTimeDays,
          avgRating,
        };
      } catch (err) {
        logger.warn('[useSupplierTrust] Failed to fetch real data, using mock:', err);
        return getMockSupplierTrust(productId);
      }
    },
    enabled: !!productId,
    staleTime: 10 * 60 * 1000, // 10 min cache
  });
}
