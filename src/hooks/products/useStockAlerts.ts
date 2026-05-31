import { useQuery } from '@tanstack/react-query';
import { supabase, resolveTable, handleQueryError } from '@/lib/supabase-direct';
import { getProductImageUrl, type PromobrindProduct } from '@/lib/external-db/product-types';

export type AlertLevel = 'low' | 'critical' | 'out';

export interface StockAlert {
  id: string;
  productId: string;
  productName: string;
  sku: string;
  imageUrl: string | null;
  currentStock: number;
  alertLevel: AlertLevel;
  supplier: string;
}

const STOCK_ALERT_SELECT =
  'id, name, sku, stock_quantity, min_quantity, brand, primary_image_url, images';

export function useStockAlerts(lowStockThreshold = 50, criticalStockThreshold = 10) {
  return useQuery<StockAlert[], Error>({
    queryKey: ['stock-alerts', lowStockThreshold, criticalStockThreshold],
    queryFn: async () => {
      const table = resolveTable('products');
      const { data, error } = await supabase
        .from(table)
        .select(STOCK_ALERT_SELECT)
        .eq('is_active', true)
        .lt('stock_quantity', lowStockThreshold)
        .order('stock_quantity', { ascending: true })
        .limit(50);

      if (error) {
        handleQueryError('useStockAlerts', table, error);
        return [];
      }

      return ((data ?? []) as unknown as PromobrindProduct[]).map((p) => {
        const stock = p.stock_quantity ?? 0;
        let alertLevel: AlertLevel = 'low';
        if (stock === 0) alertLevel = 'out';
        else if (stock <= criticalStockThreshold) alertLevel = 'critical';

        return {
          id: `stock-${p.id}`,
          productId: p.id,
          productName: p.name,
          sku: p.sku,
          imageUrl: getProductImageUrl(p),
          currentStock: stock,
          alertLevel,
          supplier: p.brand || '',
        };
      });
    },
    staleTime: 5 * 60 * 1000,
    retry: 2,
  });
}
