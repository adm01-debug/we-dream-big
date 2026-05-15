-- ROLLBACK — D.2.5 Telemetry & Monitoring
BEGIN;

DROP FUNCTION IF EXISTS public.get_app_health_summary() CASCADE;
DROP FUNCTION IF EXISTS public.get_platform_failure_metrics() CASCADE;
DROP FUNCTION IF EXISTS public.check_telemetry_regression() CASCADE;
DROP FUNCTION IF EXISTS public.lookup_request_id(text) CASCADE;
DROP FUNCTION IF EXISTS public.record_dev_route_telemetry(text, jsonb) CASCADE;
DROP FUNCTION IF EXISTS public.record_platform_failure(text, text, jsonb) CASCADE;

DROP TABLE IF EXISTS public.webhook_delivery_metrics CASCADE;
DROP TABLE IF EXISTS public.query_telemetry CASCADE;
DROP TABLE IF EXISTS public.app_vitals CASCADE;

COMMIT;

SELECT
  'D.2.5 rollback complete' AS status,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN ('app_vitals','query_telemetry','webhook_delivery_metrics')) AS remaining,
  CASE
    WHEN (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN ('app_vitals','query_telemetry','webhook_delivery_metrics')) = 0
    THEN '✅ rollback ok' ELSE '❌ parcial' END AS verdict;
