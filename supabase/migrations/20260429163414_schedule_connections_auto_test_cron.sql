-- ============================================================================
-- Schedule the `connections-auto-test` cron job
-- ----------------------------------------------------------------------------
-- A migration anterior (20260423184705) criou as helpers
-- public.get_connections_auto_test_interval() / set_connections_auto_test_interval()
-- assumindo que o cron job `connections-auto-test` já existia. Mas nenhuma
-- migration criava de fato esse job — então o auto-test nunca rodava em
-- produção e o card AutoTestJobStatus ficava sempre "untested".
--
-- Esta migration cria o job idempotentemente apontando para a edge function
-- /functions/v1/connections-auto-test, com schedule default a cada 15 min
-- (valor permitido pela helper set_connections_auto_test_interval).
-- ============================================================================

DO $$
BEGIN
  -- Idempotente: remove versão antiga se existir antes de re-agendar
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test') THEN
    PERFORM cron.unschedule('connections-auto-test');
  END IF;
END $$;

SELECT cron.schedule(
  'connections-auto-test',
  '*/15 * * * *', -- a cada 15 minutos (valor permitido pela helper de intervalo)
  $$
  SELECT net.http_post(
    url := 'https://nmojwpihnslkssljowjh.supabase.co/functions/v1/connections-auto-test',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb2p3cGlobnNsa3NzbGpvd2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc0MjgsImV4cCI6MjA4ODE1MzQyOH0.49N47oFn_4O9EGZdoPOYDd_Iez7ft4s9eNITM8N1Eeg'
    ),
    body := '{"trigger":"cron"}'::jsonb,
    timeout_milliseconds := 30000
  ) AS request_id;
  $$
);

-- Sanity check: helper deve agora retornar 15 (não NULL)
DO $$
DECLARE
  configured_minutes integer;
BEGIN
  SELECT public.get_connections_auto_test_interval() INTO configured_minutes;
  IF configured_minutes IS DISTINCT FROM 15 THEN
    RAISE WARNING 'connections-auto-test scheduled but interval helper returned %, expected 15',
      configured_minutes;
  END IF;
END $$;
