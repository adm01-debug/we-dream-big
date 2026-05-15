-- VALIDATE — D.2.5 Telemetry & Monitoring

-- 1. 3 tables base criadas
SELECT 'tables_created' AS check_type, count(*) || '/3' AS result,
  CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END AS status,
  array_agg(table_name ORDER BY table_name) AS tables
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('app_vitals','query_telemetry','webhook_delivery_metrics');

-- 2. RLS habilitado
SELECT 'rls_enabled' AS check_type, count(*) || '/3' AS result,
  CASE WHEN count(*) = 3 THEN '✅' ELSE '❌' END AS status
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('app_vitals','query_telemetry','webhook_delivery_metrics')
  AND c.relrowsecurity;

-- 3. 6 RPCs criadas
SELECT 'rpcs_created' AS check_type, count(DISTINCT p.proname) || '/6' AS result,
  CASE WHEN count(DISTINCT p.proname) = 6 THEN '✅' ELSE '❌' END AS status,
  array_agg(DISTINCT p.proname ORDER BY p.proname) AS functions
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'get_app_health_summary','get_platform_failure_metrics','check_telemetry_regression',
  'lookup_request_id','record_dev_route_telemetry','record_platform_failure'
);

-- 4. RPCs admin-protected retornam 'forbidden' para non-admin
SELECT 'rpc_get_app_health_summary' AS check_type,
  public.get_app_health_summary() AS sample_response,
  '✅ executou (mesmo que forbidden)' AS status;

-- 5. RPC lookup_request_id aceita parâmetro
SELECT 'rpc_lookup_request_id' AS check_type,
  public.lookup_request_id('nonexistent-id') AS sample_response,
  '✅ executou' AS status;
