-- Remove cron job (idempotent)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'web-vitals-regression-check-daily') THEN
    PERFORM cron.unschedule('web-vitals-regression-check-daily');
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END$$;

-- Drop RPCs (all overloads)
DROP FUNCTION IF EXISTS public.get_web_vitals_summary(integer, text);
DROP FUNCTION IF EXISTS public.get_web_vitals_summary(integer, text, text, text, boolean);
DROP FUNCTION IF EXISTS public.get_web_vitals_regression();

-- DROP TABLE IF EXISTS (cascades indexes + RLS policies)
DROP TABLE IF EXISTS public.web_vitals CASCADE;