/**
 * useSimilarProducts — Fetches similar products via the external DB.
 *
 * Strategy:
 * 1. Query `product_relationships` (107k+ cross-supplier pairs) for direct similar matches
 * 2. Fallback: Query `product_group_members` for group-based siblings
 * 3. Last resort: Related products from same supplier/category
 *
 * All levels use lightweight batch queries (no individual product detail fetches).
 */
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import type { Product } from '@/types/product-catalog';
import { logger } from '@/lib/logger';

export interface SimilarProductItem {
  id: string;
  name: string;
  sku: string;
  price: number;
  image_url: string;
  supplier_name: string;
  category_name: string;
  category_id?: string;
  colors_count?: number;
  stock?: number;
}

/** Lightweight product columns needed for similar product cards */
const SIMILAR_PRODUCT_SELECT =
  'id,name,sku,sale_price,primary_image_url,supplier_id,stock_quantity,brand,category_id';

interface LightweightProduct {
  id: string;
  name: string;
  sku: string;
  sale_price: number;
  primary_image_url: string;
  supplier_id: string;
  stock_quantity: number;
  brand: string;
  category_id: string;
}

function mapLightweightToSimilarItem(p: LightweightProduct): SimilarProductItem {
  return {
    id: p.id,
    name: p.name,
    sku: p.sku,
    price: p.sale_price,
    image_url: p.primary_image_url || '/placeholder.svg',
    supplier_name: p.brand || 'Fornecedor',
    category_name: '',
    category_id: p.category_id || undefined,
    colors_count: 0,
    stock: p.stock_quantity || 0,
  };
}

/** Batch-fetch lightweight product data by an array of IDs */
async function fetchProductsByIds(ids: string[]): Promise<SimilarProductItem[]> {
  if (ids.length === 0) return [];

  const { data, error } = await supabase
    .from('v_products_public')
    .select(SIMILAR_PRODUCT_SELECT)
    .in('id', ids)
    .eq('active', true)
    .limit(ids.length);

  if (error) throw error;
  const records = data || [];

  return (records as unknown as LightweightProduct[] || []).filter((p) => p.sale_price > 0).map(mapLightweightToSimilarItem);
}

export function useSimilarProducts(product: Product | null | undefined) {
  const productId = product?.id;
  const supplierId = product?.supplier?.id;
  const categoryId = product?.category_id;

  return useQuery<SimilarProductItem[]>({
    queryKey: ['similar-products', productId],
    queryFn: async () => {
      if (!productId) return [];

      // 1. Try product_relationships (direct pairs — fastest, 107k+ records)
      try {
        const { data: relationships, error } = await supabase
          .from('product_relationships')
          .select('related_product_id')
          .eq('product_id', productId)
          .eq('relationship_type', 'similar')
          .limit(50);

        if (error) throw error;

        if (relationships && relationships.length > 0) {
          const relatedIds = relationships.map((r) => r.related_product_id);
          const items = await fetchProductsByIds(relatedIds);
          if (items.length > 0) return items;
        }
      } catch (err) {
        logger.warn('[useSimilarProducts] product_relationships query failed, trying groups:', err);
      }

      // 2. Try product_group_members (group-based siblings)
      // NOTE: a coluna correta no BD externo é `product_group_id` (não `group_id`).
      try {
        const { data: memberships, error } = await supabase
          .from('product_group_members')
          .select('product_group_id')
          .eq('product_id', productId)
          .limit(10);

        if (error) throw error;

        if (memberships && memberships.length > 0) {
          const groupIds = [...new Set(memberships.map((m) => m.product_group_id))].filter(Boolean);
          if (groupIds.length === 0) throw new Error('No valid group IDs');

          const { data: allMembers, error: membersError } = await supabase
            .from('product_group_members')
            .select('product_id')
            .in('product_group_id', groupIds)
            .limit(100);

          if (membersError) throw membersError;

          const siblingIds = [
            ...new Set(
              (allMembers || []).map((m) => m.product_id).filter((id) => id !== productId),
            ),
          ];

          if (siblingIds.length > 0) {
            const items = await fetchProductsByIds(siblingIds);
            if (items.length > 0) return items;
          }
        }
      } catch (err) {
        logger.warn(
          '[useSimilarProducts] product_group_members query failed, using fallback:',
          err,
        );
      }

      // 3. Fallback: fetch related products from same supplier or category (lightweight)
      try {
        let query = supabase
          .from('v_products_public')
          .select(SIMILAR_PRODUCT_SELECT)
          .eq('active', true);

        if (supplierId && supplierId !== 'unknown') {
          query = query.eq('supplier_id', supplierId);
        } else if (categoryId) {
          query = query.eq('main_category_id', categoryId);
        }

        const { data: fallbackProducts, error } = await query
          .order('name', { ascending: true })
          .limit(30);

        if (error) throw error;

        return ((fallbackProducts as unknown as LightweightProduct[]) || [])
          .filter((p) => p.id !== productId && p.sale_price > 0)
          .map(mapLightweightToSimilarItem);
      } catch (err) {
        logger.warn('[useSimilarProducts] Fallback query failed:', err);
        return [];
      }
    },
    staleTime: 10 * 60 * 1000,
    gcTime: 30 * 60 * 1000,
    refetchOnWindowFocus: false,
    enabled: !!product,
  });
}
