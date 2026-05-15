-- BACKUP — D.2.3 MCP API Keys System
-- Pré-requisito: rodar ANTES do patch.sql
-- O patch cria 4 tables (mcp_api_keys com FORCE RLS, mcp_key_auto_revocations,
-- mcp_full_grantors, mcp_access_violations) + 1 RPC (can_grant_mcp_full).

BEGIN;

DO $$
DECLARE
  v_count integer;
BEGIN
  SELECT count(*) INTO v_count
  FROM information_schema.tables
  WHERE table_schema='public' AND table_name IN (
    'mcp_api_keys','mcp_key_auto_revocations','mcp_full_grantors','mcp_access_violations'
  );
  IF v_count > 0 THEN
    RAISE WARNING 'Tables MCP já existem (%/4) — verifique antes de aplicar patch', v_count;
  END IF;
END$$;

COMMIT;

SELECT 'no_backup_needed' AS status, 'tabelas são novas' AS reason;
