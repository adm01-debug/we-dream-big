-- ============================================================================
-- Onda 17 — fn_quotes_recalc_subtotal_from_items: formula completa
-- ============================================================================
--
-- Auditoria pre-prod (10/mai/2026) item 5.1 apontou que subtotal era gravado
-- pelo cliente sem recalculo server-side. Sessoes anteriores ja criaram triggers
-- de recalc, MAS a funcao fn_quotes_recalc_subtotal_from_items tinha BUG:
-- nao aplicava negotiation_markup_percent nem discount_percent.
--
-- BUG ANTERIOR:
--   _new_subtotal := SUM(qty*price + perso);           -- sem markup
--   _new_total := _new_subtotal - discount_amount;     -- sem disc_pct, sem shipping
--
-- Como trg_quotes_calc_real_values (BEFORE em quotes) calcula
--   real_subtotal := subtotal / (1 + markup/100)
-- assumindo que NEW.subtotal vem COM markup, qualquer INSERT/UPDATE/DELETE em
-- quote_items corrompia real_subtotal:
--   1. Cliente: quote com markup=10%, items totalizam 1000
--   2. Frontend envia subtotal=1100, trigger BEFORE calcula real=1100/1.1=1000 OK
--   3. Cliente adiciona item: INSERT quote_items
--   4. AFTER trigger faz UPDATE quotes SET subtotal=1000 (sem markup)
--   5. BEFORE trigger faz real := 1000/1.1 = 909.09 (CORROMPIDO)
-- Isso afetava validacao de alcada de desconto (real_discount_percent).
--
-- FIX: replicar a formula completa do frontend (calculateQuoteTotals):
--   real_subtotal := SUM(qty * unit_price + personalization_cost)
--   subtotal := real_subtotal * (1 + markup/100)              [aplica markup]
--   discount := if discount_percent > 0 then subtotal*(disc_pct/100)
--                else discount_amount                            [reconcilia]
--   shipping := if shipping_type in ('fob','fob_pre') then shipping_cost else 0
--   total := subtotal - discount + shipping
--
-- TAMBEM grava discount_amount derivado de discount_percent (resolve item 2 da
-- auditoria: "discount_amount inconsistente com discount_percent").
--
-- VALIDACAO em PROD via transacao BEGIN/ROLLBACK testou 5 cenarios:
--   1. Markup 10%, 2 items 5×R$100=1000 → subtotal=1100, real=1000, total=1100 OK
--   2. + discount_percent=5% → disc_amt=55, total=1045 OK
--   3. + shipping FOB R$200 → total=1245 OK
--   4. + item R$500 (real=1500) → subtotal=1650, real=1500, disc=82.50, total=1767.50 OK
--   5. status=approved + UPDATE items → bloqueado por immutability OK
--
-- Quotes existentes em PROD (3, todos markup=0 sem desconto): idem antes/depois.
--
-- Ref: docs/AUDITORIA-PROFUNDA-PROMOGIFTS-PRE-PROD.md (item 5.1)
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

  -- FRETE FOB (somente FOB entra no total)
  _ship_value := CASE WHEN _ship_type IN ('fob', 'fob_pre') THEN _ship_cost ELSE 0 END;

  -- TOTAL final
  _new_total := _new_subtotal - _disc_value + _ship_value;

  -- UPDATE apenas se mudou (evita loop com trigger BEFORE em quotes)
  UPDATE public.quotes
  SET subtotal = _new_subtotal,
      total = _new_total,
      discount_amount = _disc_value,
      updated_at = now()
  WHERE id = _quote_id
    AND (subtotal IS DISTINCT FROM _new_subtotal
      OR total IS DISTINCT FROM _new_total
      OR discount_amount IS DISTINCT FROM _disc_value);

  RETURN COALESCE(NEW, OLD);
END;
$function$;

COMMENT ON FUNCTION public.fn_quotes_recalc_subtotal_from_items() IS
  'Onda 17 / item 5.1: recalcula quotes.subtotal/total/discount_amount a partir '
  'de quote_items, aplicando negotiation_markup_percent e discount_percent. '
  'Espelha logica de calculateQuoteTotals do frontend. Skip para approved/converted.';
