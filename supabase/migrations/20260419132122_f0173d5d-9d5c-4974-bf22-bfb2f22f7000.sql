
-- ============================================================
-- Onda 9 — Operacionalização Connections Hub
-- Retry de webhooks falhados + limpeza de logs antigos
-- ============================================================

-- Garantir extensões
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- ============================================================
-- FUNÇÃO 1: Retry de entregas falhadas
-- ============================================================
CREATE OR REPLACE FUNCTION public.retry_failed_webhook_deliveries()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_supabase_url text := 'https://nmojwpihnslkssljowjh.supabase.co';
  v_service_key text;
  v_retried int := 0;
  v_skipped int := 0;
  rec record;
  v_max_attempts int;
BEGIN
  -- Busca service role key do vault (se disponível) ou usa o setting
  BEGIN
    v_service_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'service_role_key not configured in app.supabase_service_role_key'
    );
  END IF;

  -- Pega a ÚLTIMA tentativa de cada (webhook_id, event, payload_hash) na última hora
  -- Re-dispara apenas se ainda há margem em retry_policy.max_attempts
  FOR rec IN
    WITH latest AS (
      SELECT DISTINCT ON (d.webhook_id, d.event, d.payload_hash)
        d.id, d.webhook_id, d.event, d.payload, d.attempt, d.success
      FROM public.webhook_deliveries d
      WHERE d.delivered_at > now() - interval '1 hour'
      ORDER BY d.webhook_id, d.event, d.payload_hash, d.attempt DESC
    )
    SELECT l.*, w.active, w.retry_policy
    FROM latest l
    JOIN public.outbound_webhooks w ON w.id = l.webhook_id
    WHERE l.success = false AND w.active = true
  LOOP
    v_max_attempts := COALESCE((rec.retry_policy->>'max_attempts')::int, 3);

    IF rec.attempt >= v_max_attempts THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/webhook-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'event', rec.event,
        'payload', rec.payload
      )
    );
    v_retried := v_retried + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'retried', v_retried,
    'skipped_max_attempts', v_skipped,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.retry_failed_webhook_deliveries() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.retry_failed_webhook_deliveries() TO postgres, service_role;

COMMENT ON FUNCTION public.retry_failed_webhook_deliveries() IS
'Onda 9: Reprocessa entregas de webhook que falharam na última hora, respeitando max_attempts da retry_policy.';

-- ============================================================
-- FUNÇÃO 2: Limpeza de logs antigos (>90 dias)
-- ============================================================
CREATE OR REPLACE FUNCTION public.cleanup_webhook_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_deleted_outbound int;
  v_deleted_inbound int;
BEGIN
  WITH del AS (
    DELETE FROM public.webhook_deliveries
    WHERE delivered_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_outbound FROM del;

  WITH del AS (
    DELETE FROM public.inbound_webhook_events
    WHERE received_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_inbound FROM del;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'ran_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_webhook_logs() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.cleanup_webhook_logs() TO postgres, service_role;

COMMENT ON FUNCTION public.cleanup_webhook_logs() IS
'Onda 9: Apaga registros em webhook_deliveries e inbound_webhook_events com mais de 90 dias.';

-- ============================================================
-- CRON 1: Retry a cada 10 minutos
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('webhook-retry-failed');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'webhook-retry-failed',
  '*/10 * * * *',
  $$ SELECT public.retry_failed_webhook_deliveries(); $$
);

-- ============================================================
-- CRON 2: Limpeza diária 03:30 UTC
-- ============================================================
DO $$
BEGIN
  PERFORM cron.unschedule('webhook-logs-cleanup-daily');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'webhook-logs-cleanup-daily',
  '30 3 * * *',
  $$ SELECT public.cleanup_webhook_logs(); $$
);
