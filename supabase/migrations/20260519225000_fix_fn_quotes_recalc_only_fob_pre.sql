-- ============================================================================
-- FIX: fn_quotes_recalc_subtotal_from_items — alinhar shipping_type com helper
-- ============================================================================
--
-- CONTEXTO:
-- Em 18/mai (commit 72c8639), o frontend (src/hooks/quotes/quoteHelpers.ts:45)
-- foi alterado para considerar shipping_cost APENAS quando shipping_type='fob_pre'.
-- Antes era ('fob' OR 'fob_pre'). A semântica adotada pelo refactor é:
--
--   'cif'     → Cortesia (sem custo no orçamento)
--   'fob'     → Cliente paga frete diretamente (sem cost no orçamento)
--   'fob_pre' → FOB Pré-negociado (cost no orçamento, repassado ao cliente)
--
-- PROBLEMA RESOLVIDO POR ESTA MIGRATION:
-- A funcao trigger fn_quotes_recalc_subtotal_from_items (criada em Onda 17,
-- migration 20260515000000) ainda usa o critério antigo:
--   shipping := if shipping_type in ('fob','fob_pre') then shipping_cost else 0
--
-- Resultado: ao alterar quote_items de um orçamento com shipping_type='fob' e
-- shipping_cost>0, o trigger AFTER recalcula o total INCLUINDO o cost, gerando
-- divergência com o que o frontend salva (que não inclui cost para 'fob').
--
-- FIX: alinhar a função trigger com a nova regra (só 'fob_pre' soma cost).
--
-- IMPACTO EM DADOS EXISTENTES:
-- Orçamentos legados com shipping_type='fob' AND shipping_cost>0 precisam ser
-- migrados manualmente para 'fob_pre' (semanticamente o que eram). Isso é feito
-- na migration separada 20260519225100_backfill_legacy_fob_with_cost.sql
-- (executada em sequência).
--
-- VALIDACAO: a função foi reescrita preservando 100% da lógica de markup, disc
-- pct/amount e immutability check; apenas a expressao IN foi substituida.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_quotes_recalc_subtotal_from_items()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _quote_id uuid;
  _quote_status text;
  _markup numeric;
  _disc_amount_db numeric;
  _disc_pct numeric;
  _ship_type text;
  _ship_cost numeric;
  _real_subtotal numeric(12,2);
  _new_subtotal numeric(12,2);
  _ship_value numeric(12,2);
  _disc_value numeric(12,2);
  _new_total numeric(12,2);
BEGIN
  _quote_id := COALESCE(NEW.quote_id, OLD.quote_id);
  IF _quote_id IS NULL THEN RETURN COALESCE(NEW, OLD); END IF;

  SELECT
    status,
    LEAST(50, GREATEST(0, COALESCE(negotiation_markup_percent, 0))),
    COALESCE(discount_amount, 0),
    COALESCE(discount_percent, 0),
    shipping_type,
    COALESCE(shipping_cost, 0)
  INTO _quote_status, _markup, _disc_amount_db, _disc_pct, _ship_type, _ship_cost
  FROM public.quotes WHERE id = _quote_id;

  -- Nao mexer em quotes aprovados/convertidos (imutaveis)
  IF _quote_status IN ('approved', 'converted') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  -- REAL: soma pura dos itens (sem markup)
  SELECT COALESCE(SUM(quantity * unit_price + COALESCE(personalization_cost, 0)), 0)
  INTO _real_subtotal
  FROM public.quote_items
  WHERE quote_id = _quote_id;

  -- APRESENTADO ao cliente: aplica markup
  _new_subtotal := ROUND(_real_subtotal * (1 + _markup / 100.0), 2);

  -- DESCONTO: discount_percent tem prioridade (espelha logica do frontend)
  IF _disc_pct > 0 THEN
    _disc_value := ROUND(_new_subtotal * (_disc_pct / 100.0), 2);
  ELSE
    _disc_value := _disc_amount_db;
  END IF;

  -- FRETE: apenas 'fob_pre' (FOB Pré-negociado) tem custo no orçamento.
  -- 'fob' = cliente paga diretamente. 'cif' = cortesia.
  -- Alinhado com quoteHelpers.ts:45 e useQuoteBuilderState.ts:695 desde 18/mai.
  IF _ship_type = 'fob_pre' THEN
    _ship_value := _ship_cost;
  ELSE
    _ship_value := 0;
  END IF;

  _new_total := ROUND(_new_subtotal - _disc_value + _ship_value, 2);

  -- Persistir
  UPDATE public.quotes
  SET
    subtotal = _new_subtotal,
    discount_amount = _disc_value,
    total = _new_total,
    updated_at = now()
  WHERE id = _quote_id;

  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMENT ON FUNCTION public.fn_quotes_recalc_subtotal_from_items() IS
'Recalcula subtotal/discount_amount/total de quotes após mudanças em quote_items. Apenas shipping_type=fob_pre soma cost no total (alinhado com quoteHelpers.ts desde 18/mai/2026).';
