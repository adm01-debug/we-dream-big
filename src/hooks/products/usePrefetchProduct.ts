import { useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { productService } from '@/services/productService';
import { QUERY_KEY_PREFIXES, PRODUTOS_QUERY_OPTIONS } from '@/lib/query-config';

/**
 * Hook to prefetch product details on hover to improve perceived performance.
 */
export function usePrefetchProduct() {
  const queryClient = useQueryClient();

  const prefetchProduct = useCallback((productId: string) => {
    if (!productId) return;

    queryClient.prefetchQuery({
      queryKey: [QUERY_KEY_PREFIXES.PRODUTO_PERSONALIZACAO, productId],
      queryFn: () => productService.getProductById(productId),
      ...PRODUTOS_QUERY_OPTIONS,
      // Only prefetch if we don't have the data or it's stale
      staleTime: 5 * 60 * 1000, 
    });
  }, [queryClient]);

  return { prefetchProduct };
}
