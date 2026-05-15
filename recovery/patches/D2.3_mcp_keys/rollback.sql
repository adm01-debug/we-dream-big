-- ROLLBACK — D.2.3 MCP API Keys System
BEGIN;

DROP FUNCTION IF EXISTS public.can_grant_mcp_full(uuid) CASCADE;

DROP TABLE IF EXISTS public.mcp_access_violations CASCADE;
DROP TABLE IF EXISTS public.mcp_key_auto_revocations CASCADE;
DROP TABLE IF EXISTS public.mcp_full_grantors CASCADE;
DROP TABLE IF EXISTS public.mcp_api_keys CASCADE;

COMMIT;

SELECT
  'D.2.3 rollback complete' AS status,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name IN (
     'mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations')) AS remaining,
  CASE
    WHEN (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name IN (
            'mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations')) = 0
    THEN '✅ rollback ok' ELSE '❌ parcial' END AS verdict;
