-- VALIDATE — D.2.2 Outbound Webhooks

-- 1. Tabelas criadas
SELECT
  'tables_created' AS check_type,
  count(*) || '/2' AS result,
  CASE WHEN count(*) = 2 THEN '✅' ELSE '❌' END AS status,
  array_agg(table_name ORDER BY table_name) AS detail
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN ('outbound_webhooks','webhook_deliveries');

-- 2. RLS habilitado
SELECT
  'rls_enabled' AS check_type,
  count(*) || '/2' AS result,
  CASE WHEN count(*) = 2 THEN '✅' ELSE '❌' END AS status
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN ('outbound_webhooks','webhook_deliveries')
  AND c.relrowsecurity = true;

-- 3. Policies (3 esperadas)
SELECT 'policies' AS check_type, count(*) || '/3' AS result,
  CASE WHEN count(*) >= 3 THEN '✅' ELSE '⚠️' END AS status
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('outbound_webhooks','webhook_deliveries');

-- 4. FK webhook_deliveries → outbound_webhooks
SELECT 'fk_deliveries_to_webhooks' AS check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_type='FOREIGN KEY'
      AND table_schema='public' AND table_name='webhook_deliveries'
  ) THEN '✅' ELSE '⚠️' END AS status;

-- 5. Indexes
SELECT 'indexes' AS check_type, count(*) AS result,
  CASE WHEN count(*) >= 3 THEN '✅' ELSE '⚠️' END AS status
FROM pg_indexes WHERE schemaname='public'
  AND tablename IN ('outbound_webhooks','webhook_deliveries');
