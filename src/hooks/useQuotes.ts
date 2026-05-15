/**
 * useQuotes — Hook de orçamentos (refatorado)
 * Tipos em quotes/quoteTypes.ts, helpers em quotes/quoteHelpers.ts
 */
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { invokeExternalDb } from '@/lib/external-db';
import { useAuth } from '@/contexts/AuthContext';
import { useOrganization } from '@/contexts/OrganizationContext';
import { useSalesScope } from '@/lib/auth/visibility-scope';
import { applySellerScope } from '@/lib/auth/apply-seller-scope';
import { createClientLogger } from '@/lib/telemetry/structuredLogger';
import { toast } from 'sonner';
import type { Quote, QuoteItem, PersonalizationTechnique } from './quotes/quoteTypes';
import {
  calculateQuoteTotals,
  buildInsertPayload,
  buildUpdatePayload,
  buildItemsInsertPayload,
  buildPersonalizationsInsertPayload,
  STATUS_LABELS,
} from './quotes/quoteHelpers';

// Re-export types for backward compatibility
export type {
  Quote,
  QuoteItem,
  QuoteItemPersonalization,
  PersonalizationTechnique,
} from './quotes/quoteTypes';

export function useQuotes() {
  const { user } = useAuth();
  const { currentOrg } = useOrganization();
  const orgId = currentOrg?.id || null;
  const scope = useSalesScope();
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [techniques, setTechniques] = useState<PersonalizationTechnique[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchQuotes = async () => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    try {
      // Defesa em profundidade: vendedor (scope === "self") só pede os
      // próprios orçamentos. RLS garante o resto, mas evitamos rodar uma
      // query potencialmente ampla que será cortada pelo banco.
      let q = supabase
        // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);
      q = applySellerScope(q, { scope, userId: user.id });
      const { data, error: qErr } = await q;
      if (qErr) throw new Error(qErr.message);
      setQuotes((data || []) as Quote[]);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Erro ao buscar orçamentos';
      setError(message);
      toast.error('Erro ao carregar orçamentos', { description: message });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQuote = async (quoteId: string): Promise<Quote | null> => {
    setIsLoading(true);
    try {
      const { data: quoteData, error: qErr } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
      if (qErr) throw new Error(qErr.message);
      if (!quoteData) return null;

      const { data: itemsData } = await supabase
        .from('quote_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('sort_order', { ascending: true });

      const itemIds = (itemsData || []).map((i) => i.id);
      let allPersonalizations: Record<string, unknown>[] = [];
      if (itemIds.length > 0) {
        const { data: persData } = await supabase
          .from('quote_item_personalizations')
          .select('*')
          .in('quote_item_id', itemIds);
        allPersonalizations = persData || [];
      }

      const items: QuoteItem[] = (itemsData || []).map((item) => ({
        ...item,
        personalizations: allPersonalizations.filter((p) => p.quote_item_id === item.id),
      }));

      return { ...quoteData, items } as Quote;
    } catch (err) {
      toast.error('Erro ao carregar orçamento', {
        description: err instanceof Error ? err.message : 'Erro',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const logQuoteHistory = async (
    quoteId: string,
    action: string,
    description: string,
    options?: {
      fieldChanged?: string;
      oldValue?: string;
      newValue?: string;
      metadata?: Record<string, unknown>;
    },
  ) => {
    if (!user) return;
    try {
      await supabase.from('quote_history').insert({
        quote_id: quoteId,
        user_id: user.id,
        action,
        description,
        field_changed: options?.fieldChanged || null,
        old_value: options?.oldValue || null,
        new_value: options?.newValue || null,
        metadata: options?.metadata || {},
      });
    } catch (err) {
      console.error('Error logging history:', err);
    }
  };

  async function insertItemsWithPersonalizations(items: QuoteItem[], quoteId: string) {
    if (items.length === 0) return;
    const itemsPayload = buildItemsInsertPayload(items, quoteId).map((item) => ({
      ...item,
      product_name: item.product_name?.trim().slice(0, 255),
      notes: item.notes?.trim().slice(0, 1000),
    }));
    const { data: insertedItems, error: itemsErr } = await supabase
      .from('quote_items')
      .insert(itemsPayload)
      .select('*');
    if (itemsErr) throw new Error(itemsErr.message);

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const insertedItem = insertedItems?.[i];
      if (item.personalizations?.length && insertedItem) {
        const persPayload = buildPersonalizationsInsertPayload(
          item.personalizations,
          insertedItem.id,
        );
        await supabase.from('quote_item_personalizations').insert(persPayload);
      }
    }
  }

  const createQuote = async (quote: Partial<Quote>, items: QuoteItem[]): Promise<Quote | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }
    setIsLoading(true);
    try {
      const totals = calculateQuoteTotals(quote, items);
      const insertPayload = buildInsertPayload(quote, user.id, orgId, totals);
      const { data: inserted, error: insErr } = await supabase
        // rls-allow: mutação INSERT; RLS valida seller_id via policy on quotes
        .from('quotes')
        .insert(insertPayload)
        .select('*');
      if (insErr) throw new Error(insErr.message);
      const newQuote = inserted?.[0];
      if (!newQuote) throw new Error('Falha ao inserir orçamento');

      await insertItemsWithPersonalizations(items, newQuote.id);
      await logQuoteHistory(newQuote.id, 'created', `Orçamento ${newQuote.quote_number} criado`);
      toast.success('Orçamento criado!', { description: `Número: ${newQuote.quote_number}` });
      await fetchQuotes();
      return newQuote as unknown as Quote;
    } catch (err) {
      toast.error('Erro ao criar orçamento', {
        description: err instanceof Error ? err.message : 'Erro',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateQuoteStatus = async (quoteId: string, status: Quote['status']): Promise<boolean> => {
    try {
      const oldStatus = quotes.find((q) => q.id === quoteId)?.status || 'draft';
      // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
      const { error: updErr } = await supabase.from('quotes').update({ status }).eq('id', quoteId);
      if (updErr) throw new Error(updErr.message);
      await logQuoteHistory(
        quoteId,
        'status_changed',
        `Status alterado de "${STATUS_LABELS[oldStatus]}" para "${STATUS_LABELS[status]}"`,
        { fieldChanged: 'status', oldValue: oldStatus, newValue: status },
      );
      toast.success('Status atualizado');
      await fetchQuotes();
      return true;
    } catch {
      toast.error('Erro ao atualizar status');
      return false;
    }
  };

  const deleteQuote = async (quoteId: string): Promise<boolean> => {
    try {
      // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
      const { error: delErr } = await supabase.from('quotes').delete().eq('id', quoteId);
      if (delErr) throw new Error(delErr.message);
      toast.success('Orçamento excluído');
      await fetchQuotes();
      return true;
    } catch {
      toast.error('Erro ao excluir orçamento');
      return false;
    }
  };

  const updateQuote = async (
    quoteId: string,
    quote: Partial<Quote>,
    items: QuoteItem[],
  ): Promise<Quote | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }
    setIsLoading(true);
    try {
      const totals = calculateQuoteTotals(quote, items);
      const updatePayload = buildUpdatePayload(quote, totals);
      const { data: updated, error: updErr } = await supabase
        // rls-allow: applySellerScope chamado dinamicamente; mutações por id com RLS
        .from('quotes')
        .update(updatePayload)
        .eq('id', quoteId)
        .select('*');
      if (updErr) throw new Error(updErr.message);

      await supabase.from('quote_items').delete().eq('quote_id', quoteId);
      await insertItemsWithPersonalizations(items, quoteId);

      await logQuoteHistory(
        quoteId,
        'updated',
        `Orçamento atualizado: ${items.length} item(s), total ${new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totals.total)}`,
      );
      toast.success('Orçamento atualizado!');
      await fetchQuotes();
      return updated?.[0] as unknown as Quote;
    } catch (err) {
      toast.error('Erro ao atualizar orçamento', {
        description: err instanceof Error ? err.message : 'Erro',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const duplicateQuote = async (quoteId: string): Promise<Quote | null> => {
    if (!user) {
      toast.error('Usuário não autenticado');
      return null;
    }
    setIsLoading(true);
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
          bitrix_product_id: item.bitrix_product_id,
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
          internal_notes: original.internal_notes
            ? `[Duplicado de ${original.quote_number}] ${original.internal_notes}`
            : `Duplicado de ${original.quote_number}`,
          valid_until: original.valid_until,
        },
        items,
      );

      if (newQuote) {
        await logQuoteHistory(
          newQuote.id!,
          'created',
          `Duplicado a partir de ${original.quote_number}`,
        );
      }
      return newQuote;
    } catch (err) {
      toast.error('Erro ao duplicar', { description: err instanceof Error ? err.message : 'Erro' });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const syncQuoteToBitrix = async (quoteId: string): Promise<boolean> => {
    const log = createClientLogger('quote.syncBitrix', { base: { quoteId } });
    log.info('start');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('quote-sync', {
        body: { action: 'sync_quote', data: { quoteId } },
        headers: log.headers(),
      });
      if (fnError) throw new Error(fnError.message);
      if (data.error) throw new Error(data.error);
      log.info('ok', { bitrix_deal_id: data.bitrix_deal_id ?? null });
      toast.success('Sincronizado com Bitrix!', {
        description: `Deal ID: ${data.bitrix_deal_id || 'N/A'}`,
      });
      await fetchQuotes();
      return true;
    } catch (err) {
      log.error('failed', { err });
      toast.error('Erro ao sincronizar', {
        description: err instanceof Error ? err.message : 'Erro',
      });
      return false;
    }
  };

  const testWebhookConnection = async (): Promise<boolean> => {
    const log = createClientLogger('quote.testWebhook');
    log.info('start');
    try {
      const { data, error: fnError } = await supabase.functions.invoke('quote-sync', {
        body: { action: 'test_webhook', data: {} },
        headers: log.headers(),
      });
      if (fnError) throw new Error(fnError.message);
      if (data.success) {
        log.info('ok');
        toast.success('Conexão com N8N estabelecida!');
        return true;
      }
      log.warn('not_ok');
      toast.error('Falha na conexão com N8N');
      return false;
    } catch (err) {
      log.error('failed', { err });
      toast.error('Erro ao testar webhook', {
        description: err instanceof Error ? err.message : 'Erro',
      });
      return false;
    }
  };

  const fetchTechniques = async () => {
    try {
      const result = await invokeExternalDb<PersonalizationTechnique>({
        table: 'personalization_techniques',
        operation: 'select',
        filters: { is_active: true },
        orderBy: { column: 'name', ascending: true },
        limit: 100,
      });
      setTechniques(result.records || []);
    } catch (err) {
      console.error('Error fetching techniques:', err);
    }
  };

  useEffect(() => {
    if (user) {
      fetchQuotes();
      fetchTechniques();
    }
  }, [user]);

  return {
    quotes,
    techniques,
    isLoading,
    error,
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
