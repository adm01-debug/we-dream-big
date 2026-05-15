-- Keep external-db-bridge warm: ping leve a cada 4 minutos
-- Evita cold start de 700ms+ por boot ocioso
DO $$
BEGIN
  -- Remove job antigo se existir (idempotente)
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'external-db-bridge-keepalive') THEN
    PERFORM cron.unschedule('external-db-bridge-keepalive');
  END IF;
END $$;

SELECT cron.schedule(
  'external-db-bridge-keepalive',
  '*/4 * * * *', -- a cada 4 minutos
  $$
  SELECT net.http_post(
    url := 'https://nmojwpihnslkssljowjh.supabase.co/functions/v1/external-db-bridge',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5tb2p3cGlobnNsa3NzbGpvd2poIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI1Nzc0MjgsImV4cCI6MjA4ODE1MzQyOH0.49N47oFn_4O9EGZdoPOYDd_Iez7ft4s9eNITM8N1Eeg'
    ),
    body := '{"operation":"ping"}'::jsonb,
    timeout_milliseconds := 5000
  ) AS request_id;
  $$
);