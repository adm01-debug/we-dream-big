-- O cron 'connections-auto-test' (a cada 15 min) usava current_setting('app.supabase_functions_base_url')
-- que era NULL (ALTER DATABASE SET não está disponível via MCP/pipeline — exige Dashboard).
-- url=NULL → NOT NULL violation em net.http_request_queue → ~4 falhas/hora → cron_health_1h FAIL.
--
-- Solução: recriar o job com URL hardcoded do projeto doufsxqlfjyuvxuezpln.
-- A chave anon é pública (frontend key, visível a todos os clientes).
-- Guard: cron.unschedule lança erro se job ausente em preview snapshots;
-- skip-and-create silenciosamente se cron schema/jobs não existirem.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON c.relnamespace = n.oid
    WHERE n.nspname = 'cron' AND c.relname = 'job'
  ) THEN
    RAISE NOTICE 'cron schema/job table ausente — skipping reschedule de connections-auto-test';
    RETURN;
  END IF;

  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'connections-auto-test') THEN
    PERFORM cron.unschedule('connections-auto-test');
  END IF;

  PERFORM cron.schedule(
    'connections-auto-test',
    '*/15 * * * *',
    $job$
    SELECT net.http_post(
      url := 'https://doufsxqlfjyuvxuezpln.supabase.co/functions/v1/connections-auto-test',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRvdWZzeHFsZmp5dXZ4dWV6cGxuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjczODY2NDMsImV4cCI6MjA4Mjk2MjY0M30.nm3WMOBSx5SUnIBmvF_Mj0Y-4hV6UohrBF0sUpuQvPc'
      ),
      body := '{"trigger":"cron"}'::jsonb,
      timeout_milliseconds := 30000
    ) AS request_id;
    $job$
  );
END $$;
