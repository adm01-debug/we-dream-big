-- BACKUP — D.2.4 External Connections
-- Pré-requisito: rodar ANTES do patch.sql
-- O patch cria 1 table (external_connections) + 5 RPCs + 1 FK retroativa
-- em connection_test_history (criada em D.1.2).

BEGIN;

-- Backup defensivo: connection_test_history vai ganhar FK CASCADE
-- Snapshot do estado atual em caso de algum row inválido
CREATE TABLE IF NOT EXISTS public._backup_connection_test_history_pre_d24 AS
SELECT * FROM public.connection_test_history;

COMMENT ON TABLE public._backup_connection_test_history_pre_d24 IS
  'Backup pré D.2.4 — connection_test_history antes da FK CASCADE. Criado em 2026-05-11.';

-- Verificação: external_connections NÃO deve existir antes
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables
             WHERE table_schema='public' AND table_name='external_connections') THEN
    RAISE WARNING 'external_connections já existe — verifique antes de aplicar patch';
  END IF;
END$$;

COMMIT;

SELECT
  'connection_test_history_backup' AS object,
  count(*) AS rows_backed_up
FROM public._backup_connection_test_history_pre_d24;
