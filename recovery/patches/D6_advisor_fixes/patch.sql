-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.6 — Advisor Fixes pós D.3+D.4 (security hardening)
-- ═══════════════════════════════════════════════════════════════════
-- Aplica correções identificadas pelo Supabase Advisor após o
-- merge dos batches D.3+D.4:
--
-- 1. conversation_delivery_status: RLS estava habilitado SEM nenhuma
--    policy (tabela totalmente bloqueada — issue clássico advisor).
--    Solução: adicionar 3 policies (service_role manage, user read own,
--    admin read all) seguindo o padrão dos eventos relacionados.
--
-- 2. cleanup_webhook_logs: função SECURITY DEFINER estava sem
--    search_path setado (issue clássico Supabase advisor:
--    function_search_path_mutable). Solução: recriar com
--    SET search_path = 'public'.
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Fix 1: Policies em conversation_delivery_status
DROP POLICY IF EXISTS "Service role manages delivery status" ON public.conversation_delivery_status;
DROP POLICY IF EXISTS "Users read own delivery status" ON public.conversation_delivery_status;
DROP POLICY IF EXISTS "Admins read all delivery status" ON public.conversation_delivery_status;

CREATE POLICY "Service role manages delivery status"
ON public.conversation_delivery_status TO service_role
USING (true) WITH CHECK (true);

CREATE POLICY "Users read own delivery status"
ON public.conversation_delivery_status FOR SELECT TO authenticated
USING (EXISTS (
  SELECT 1 FROM public.conversation_event_history e
  JOIN public.conversation_audit_logs a ON a.id = e.conversation_id
  WHERE e.id = conversation_delivery_status.event_id
    AND a.user_id = auth.uid()
));

CREATE POLICY "Admins read all delivery status"
ON public.conversation_delivery_status FOR SELECT TO authenticated
USING (public.is_supervisor_or_above(auth.uid()));

-- Fix 2: search_path em cleanup_webhook_logs
CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  v_deleted_outbound int;
  v_deleted_inbound int;
  v_deleted_metrics int;
BEGIN
  WITH del AS (
    DELETE FROM public.webhook_deliveries
    WHERE delivered_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_outbound FROM del;

  WITH del AS (
    DELETE FROM public.inbound_webhook_events
    WHERE received_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_inbound FROM del;

  WITH del AS (
    DELETE FROM public.webhook_delivery_metrics
    WHERE occurred_at < now() - interval '90 days'
    RETURNING 1
  ) SELECT count(*) INTO v_deleted_metrics FROM del;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'deleted_metrics', v_deleted_metrics,
    'ran_at', now()
  );
END;
$function$;

COMMIT;
