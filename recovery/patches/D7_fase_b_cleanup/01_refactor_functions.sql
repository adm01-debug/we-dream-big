-- ═══════════════════════════════════════════════════════════════════
-- D.7 Fase B.1 — Refactor funcional pré-DROP
-- ═══════════════════════════════════════════════════════════════════
-- Remove branches mortas das 3 funções que ainda mencionam as tables
-- candidatas a DROP (kit_share_tokens, quote_approval_tokens).
--
-- Aplicado em PROD: 2026-05-12
-- Estado pós-aplicação: 3 funções compilam e funcionam só com branches vivas
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1) validate_status_fields — remove branches kit_share_tokens + quote_approval_tokens
CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft','pending','sent','approved','rejected','expired','revision','pending_approval','converted','viewed') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending','confirmed','in_production','shipped','delivered','cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled','partially_fulfilled','fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;
  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft','ready','shared','archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;
  RETURN NEW;
END;
$function$;

-- 2) dispatch_quote_webhook_event — remove branch kit_share_tokens
CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public','extensions'
AS $func$
DECLARE
  _event text;
  _payload jsonb;
  _project_url text := 'https://doufsxqlfjyuvxuezpln.supabase.co';
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF TG_OP = 'INSERT' THEN _event := 'quote.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN _event := 'quote.' || NEW.status;
    ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object('id', NEW.id, 'quote_number', NEW.quote_number, 'status', NEW.status,
      'client_name', NEW.client_name, 'client_email', NEW.client_email, 'total', NEW.total,
      'seller_id', NEW.seller_id, 'updated_at', NEW.updated_at);
  ELSIF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN _event := 'order.created'; ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object('id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status,
      'client_name', NEW.client_name, 'total', NEW.total, 'seller_id', NEW.seller_id);
  ELSIF TG_TABLE_NAME = 'discount_approval_requests' THEN
    IF TG_OP = 'INSERT' THEN _event := 'discount.requested';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved','rejected') THEN _event := 'discount.' || NEW.status;
    ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object('id', NEW.id, 'quote_id', NEW.quote_id,
      'requested_discount_percent', NEW.requested_discount_percent, 'status', NEW.status, 'seller_id', NEW.seller_id);
  ELSE RETURN NEW; END IF;

  IF NOT EXISTS (SELECT 1 FROM public.outbound_webhooks WHERE active = true AND _event = ANY(events)) THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _project_url || '/functions/v1/webhook-dispatcher',
    body := jsonb_build_object('event', _event, 'payload', _payload)::text,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$func$;

-- 3) audit_security_definer_acl — whitelist zerada
CREATE OR REPLACE FUNCTION public.audit_security_definer_acl() 
RETURNS TABLE(function_name text, arguments text, problem text, granted_to text)
LANGUAGE sql STABLE SET search_path TO 'public','pg_catalog'
AS $func$
  WITH defs AS (
    SELECT p.oid, p.proname, pg_get_function_identity_arguments(p.oid) AS args, p.proacl,
      (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
      false AS public_intent
    FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT d.proname, d.args, d.is_trigger, d.public_intent, a.grantee::regrole::text AS grantee
    FROM defs d
    LEFT JOIN LATERAL (SELECT (aclexplode(d.proacl)).grantee) a ON true
    WHERE a.grantee IS NOT NULL
  )
  SELECT proname, args, 'PUBLIC has EXECUTE'::text, 'PUBLIC'::text FROM acl_expanded WHERE grantee = '-'
  UNION ALL
  SELECT proname, args, 'anon has EXECUTE (not in public-intent whitelist)'::text, 'anon' FROM acl_expanded WHERE grantee = 'anon' AND NOT public_intent
  UNION ALL
  SELECT proname, args, 'trigger function has EXECUTE for authenticated'::text, 'authenticated' FROM acl_expanded WHERE grantee = 'authenticated' AND is_trigger
  ORDER BY 1, 2;
$func$;

COMMIT;
