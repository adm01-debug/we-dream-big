/**
 * useProductCustomizationOptions — Hook para buscar opções de personalização
 *
 * Chama fn_get_product_customization_options via external-db-bridge.
 * Retorna todos os locais e técnicas disponíveis para um produto.
 *
 * O payload bruto passa pelo `adaptCustomizationOptions` para que o front
 * receba sempre a struct canônica, independentemente do back enviar nomes
 * em PT (atual) ou EN (futuro).
 */

import { useQuery } from '@tanstack/react-query';
import { invokeExternalRpc } from '@/lib/external-rpc';
import { adaptCustomizationOptions } from '@/lib/personalization/adapters';
import type { CustomizationOptionsResponse } from '@/types/customization';

export function useProductCustomizationOptions(productId: string | null) {
  return useQuery({
    queryKey: ['product-customization-options', productId],
    queryFn: async (): Promise<CustomizationOptionsResponse | null> => {
      if (!productId) return null;

      try {
        const result = await invokeExternalRpc<Record<string, unknown>>(
          'fn_get_product_customization_options',
          { p_product_id: productId },
        );

        return adaptCustomizationOptions(result);
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : String(err);
        if (msg.includes('410') || msg.includes('Gone')) {
          const { reportSilentEmpty } = await import('@/lib/external-db/silent-empty-report');
          reportSilentEmpty({
            reason: 'gone_410',
            table: 'fn_get_product_customization_options',
            operation: 'rpc',
            message: err.message,
          });
          return null;
        }
        throw err;
      }
    },
    enabled: !!productId,
    staleTime: 5 * 60 * 1000,
  });
}
