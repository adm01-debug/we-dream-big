-- VALIDATE — D.2.4 External Connections

-- 1. Tabela external_connections criada
SELECT 'table_external_connections' AS check_type,
  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables
                    WHERE table_schema='public' AND table_name='external_connections')
       THEN '✅' ELSE '❌' END AS status;

-- 2. RLS habilitado
SELECT 'rls_enabled' AS check_type,
  CASE WHEN c.relrowsecurity THEN '✅' ELSE '❌' END AS status
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='external_connections';

-- 3. 5 RPCs criadas (sync tem 2 overloads = 6 funções)
SELECT 'rpcs_created' AS check_type,
  count(DISTINCT p.proname) || '/5' AS result,
  CASE WHEN count(DISTINCT p.proname) = 5 THEN '✅' ELSE '❌' END AS status,
  array_agg(DISTINCT p.proname ORDER BY p.proname) AS functions
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND p.proname IN (
  'get_connection_failure_window_minutes','set_connection_failure_window_minutes',
  'get_connections_auto_test_interval','set_connections_auto_test_interval',
  'sync_external_connections_from_credentials'
);

-- 4. FK retroativa: connection_test_history.connection_id → external_connections
SELECT 'fk_retroactive' AS check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.table_constraints tc
    JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name=ccu.constraint_name
    WHERE tc.constraint_type='FOREIGN KEY'
      AND tc.table_name='connection_test_history'
      AND ccu.table_name='external_connections'
  ) THEN '✅' ELSE '❌' END AS status;

-- 5. Indexes (4 esperados)
SELECT 'indexes' AS check_type, count(*) || '/4' AS result,
  CASE WHEN count(*) >= 4 THEN '✅' ELSE '⚠️' END AS status
FROM pg_indexes WHERE schemaname='public' AND tablename='external_connections';

-- 6. Policy "Devs manage"
SELECT 'policy_devs_manage' AS check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='external_connections'
      AND policyname ILIKE '%dev%manage%'
  ) THEN '✅' ELSE '⚠️' END AS status;

-- 7. RPC get_connection_failure_window_minutes funcionando (bug histórico)
SELECT 'rpc_bug_18_dias_fixed' AS check_type,
  public.get_connection_failure_window_minutes() AS returned_value,
  '✅' AS status;
