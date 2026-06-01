/**
 * useProdutoRamoAtividade — busca os ramos de atividade vinculados a um produto.
 * Consulta o banco externo Promobrind via external-db-bridge (SSOT).
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { dbInvoke } from '@/lib/db/postgrest';

export interface ProdutoRamo {
  ramo_id: string;
  ramo_nome: string;
  segmento_id?: string | null;
  segmento_nome?: string | null;
}

export function useProdutoRamoAtividade(productId: string | null | undefined) {
  return useQuery({
    queryKey: ['produto-ramo-atividade', productId],
    enabled: !!productId,
    queryFn: async (): Promise<ProdutoRamo[]> => {
      const result = await dbInvoke<ProdutoRamo>({
        operation: 'select',
        table: 'produto_ramo_atividade',
        filters: { product_id: productId },
      });
      return result.records;
    },
    staleTime: 5 * 60 * 1000,
  });
}
