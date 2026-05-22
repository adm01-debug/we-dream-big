/**
 * useQuotes — Hook de orçamentos (Refatorado para usar React Query e quoteService)
 */
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { toast } from 'sonner';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { quoteService } from '@/services/quoteService';
import type { Quote, QuoteItem } from '@/hooks/quotes/quoteTypes';
import { supabase } from '@/integrations/supabase/client';

export type {
  Quote,
  QuoteItem,
  QuoteItemPersonalization,
  PersonalizationTechnique,
} from '@/hooks/quotes/quoteTypes';

export function useQuotes() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id || null;
  const scope = useSalesScope();
  const queryClient = useQueryClient();

  // Estabiliza a chave do scope para a queryKey. Sem isso, `useSalesScope`
  // retornando objeto novo a cada render dispararia refetch desnecessário.
  const scopeKey = JSON.stringify(scope);
  const userId = user?.id;

  // Queries
  const {
    data: quotes = [],
    isLoading,
    error,
    refetch: fetchQuotes,
  } = useQuery({
    queryKey: ['quotes', userId, scopeKey],
    queryFn: () => {
      if (!userId) throw new Error('useQuotes: missing userId');
      return quoteService.fetchQuotes(userId, scope);
    },
    enabled: !!userId,
  });

  const { data: techniques = [], refetch: fetchTechniques } = useQuery({
    queryKey: ['techniques'],
    queryFn: () => quoteService.fetchTechniques(),
    enabled: !!user,
    staleTime: 60 * 60 * 1000, // 1 hour
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: ({ quote, items }: { quote: Partial<Quote>; items: QuoteItem[] }) => {
      if (!userId) throw new Error('useQuotes.createMutation: usuário não autenticado');
      return quoteService.createQuote(quote, items, userId, orgId);
    },
    onSuccess: (newQuote) => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Orçamento criado!', { description: `Número: ${newQuote.quote_number}` });
    },
    onError: (err: Error) => {
      toast.error('Erro ao criar orçamento', { description: err.message });
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({
      quoteId,
      quote,
      items,
    }: {
      quoteId: string;
      quote: Partial<Quote>;
      items: QuoteItem[];
    }) => quoteService.updateQuote(quoteId, quote, items),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Orçamento atualizado!');
    },
    onError: (err: Error) => {
      toast.error('Erro ao atualizar orçamento', { description: err.message });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ quoteId, status }: { quoteId: string; status: Quote['status'] }) =>
      quoteService.updateQuoteStatus(quoteId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Status atualizado');
    },
    onError: () => {
      toast.error('Erro ao atualizar status');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (quoteId: string) => quoteService.deleteQuote(quoteId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      toast.success('Orçamento excluído');
    },
    onError: () => {
      toast.error('Erro ao excluir orçamento');
    },
  });

  // Actions
  const fetchQuote = async (quoteId: string) => {
    try {
      return await quoteService.fetchQuote(quoteId);
    } catch (err) {
      toast.error('Erro ao carregar orçamento', {
        description: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  };

  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]) => {
    if (!userId) return null;
    return await createMutation.mutateAsync({ quote, items });
  };

  const updateQuote = async (quoteId: string, quote: Partial<Quote>, items: QuoteItem[]) => {
    if (!userId) return null;
    return await updateMutation.mutateAsync({ quoteId, quote, items });
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']) => {
    try {
      await statusMutation.mutateAsync({ quoteId, status });
      return true;
    } catch {
      return false;
    }
  };

  const deleteQuote = async (quoteId: string) => {
    try {
      await deleteMutation.mutateAsync(quoteId);
      return true;
    } catch {
      return false;
    }
  };

  const duplicateQuote = async (quoteId: string): Promise<Quote | null> => {
    if (!userId) return null;
    try {
      const original = await fetchQuote(quoteId);
      if (!original) throw new Error('Orçamento não encontrado');

      const items: QuoteItem[] =
        original.items?.map((item) => ({
          product_id: item.product_id,
          product_name: item.product_name,
          product_sku: item.product_sku,
          product_image_url: item.product_image_url,
          quantity: item.quantity,
          unit_price: item.unit_price,
          color_name: item.color_name,
          color_hex: item.color_hex,
          notes: item.notes,
          personalizations: item.personalizations?.map((p) => ({
            technique_id: p.technique_id,
            technique_name: p.technique_name,
            colors_count: p.colors_count,
            positions_count: p.positions_count,
            area_cm2: p.area_cm2,
            width_cm: p.width_cm,
            height_cm: p.height_cm,
            setup_cost: p.setup_cost,
            unit_cost: p.unit_cost,
            total_cost: p.total_cost,
            notes: p.notes,
          })),
        })) || [];

      const newQuote = await createQuote(
        {
          client_id: original.client_id,
          client_name: original.client_name,
          client_email: original.client_email,
          client_phone: original.client_phone,
          client_company: original.client_company,
          status: 'draft',
          discount_percent: original.discount_percent,
          discount_amount: original.discount_amount,
          notes: original.notes,
          payment_terms: original.payment_terms,
          delivery_time: original.delivery_time,
          shipping_type: original.shipping_type,
          shipping_cost: original.shipping_cost,
          internal_notes: `Duplicado de ${original.quote_number}`,
          valid_until: original.valid_until,
        },
        items,
      );

      return newQuote;
    } catch (err) {
      toast.error('Erro ao duplicar', {
        description: err instanceof Error ? err.message : String(err),
      });
      return null;
    }
  };

  const syncQuoteToBitrix = async (quoteId: string): Promise<boolean> => {
    const log = createClientLogger('quote.syncBitrix', { base: { quoteId } });
    try {
      const { data, error: fnError } = await supabase.functions.invoke('quote-sync', {
        body: { action: 'sync_quote', data: { quoteId } },
        headers: log.headers(),
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);
      toast.success('Sincronizado com Bitrix!', {
        description: `Deal ID: ${data?.bitrix_deal_id || 'N/A'}`,
      });
      queryClient.invalidateQueries({ queryKey: ['quotes'] });
      return true;
    } catch (err) {
      toast.error('Erro ao sincronizar', {
        description: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  };

  const testWebhookConnection = async (): Promise<boolean> => {
    try {
      const { data, error: fnError } = await supabase.functions.invoke('quote-sync', {
        body: { action: 'test_webhook', data: {} },
      });
      if (fnError) throw new Error(fnError.message);
      if (data?.success) {
        toast.success('Conexão com N8N estabelecida!');
        return true;
      }
      toast.error('Falha na conexão com N8N');
      return false;
    } catch (err) {
      toast.error('Erro ao testar webhook', {
        description: err instanceof Error ? err.message : String(err),
      });
      return false;
    }
  };

  const logQuoteHistory = async (
    quoteId: string,
    action: string,
    description: string,
    options?: Record<string, unknown>,
  ) => {
    if (!userId) return;
    try {
      await quoteService.logHistory(quoteId, userId, action, description, options);
    } catch (err) {
      console.error('Error logging history:', err);
    }
  };

  return {
    quotes,
    techniques,
    isLoading: isLoading || createMutation.isPending || updateMutation.isPending,
    error: error instanceof Error ? error.message : null,
    fetchQuotes,
    fetchQuote,
    createQuote,
    updateQuote,
    updateQuoteStatus,
    deleteQuote,
    duplicateQuote,
    fetchTechniques,
    syncQuoteToBitrix,
    testWebhookConnection,
    logQuoteHistory,
  };
}
