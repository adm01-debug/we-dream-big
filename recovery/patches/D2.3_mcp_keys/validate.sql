-- VALIDATE — D.2.3 MCP API Keys System

-- 1. 4 tabelas criadas
SELECT 'tables_created' AS check_type, count(*) || '/4' AS result,
  CASE WHEN count(*) = 4 THEN '✅' ELSE '❌' END AS status,
  array_agg(table_name ORDER BY table_name) AS tables
FROM information_schema.tables
WHERE table_schema='public' AND table_name IN (
  'mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations');

-- 2. FORCE RLS em mcp_api_keys (crítico: bypass não permitido nem para o owner)
SELECT 'force_rls_mcp_api_keys' AS check_type,
  CASE WHEN c.relforcerowsecurity THEN '✅ FORCED' ELSE '❌ não forçado' END AS status
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname='mcp_api_keys';

-- 3. RLS habilitado nas 4
SELECT 'rls_enabled' AS check_type, count(*) || '/4' AS result,
  CASE WHEN count(*) = 4 THEN '✅' ELSE '❌' END AS status
FROM pg_class c JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE n.nspname='public' AND c.relname IN (
  'mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations'
) AND c.relrowsecurity;

-- 4. RPC can_grant_mcp_full criada
SELECT 'rpc_can_grant_mcp_full' AS check_type,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND p.proname='can_grant_mcp_full'
  ) THEN '✅' ELSE '❌' END AS status;

-- 5. Policies (8 esperadas)
SELECT 'policies' AS check_type, count(*) || '/8' AS result,
  CASE WHEN count(*) >= 8 THEN '✅' ELSE '⚠️' END AS status
FROM pg_policies WHERE schemaname='public'
  AND tablename IN ('mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations');

-- 6. Indexes
SELECT 'indexes' AS check_type, count(*) AS result,
  CASE WHEN count(*) >= 6 THEN '✅' ELSE '⚠️' END AS status
FROM pg_indexes WHERE schemaname='public'
  AND tablename IN ('mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations');
