-- ROLLBACK — D.2.4 External Connections
-- ATENÇÃO: vai remover a FK fechada em connection_test_history.

BEGIN;

-- 1. Remover FK retroativa (criada pelo D.2.4)
ALTER TABLE public.connection_test_history
  DROP CONSTRAINT IF EXISTS connection_test_history_connection_id_fkey;

-- 2. Drop 5 RPCs
DROP FUNCTION IF EXISTS public.get_connection_failure_window_minutes() CASCADE;
DROP FUNCTION IF EXISTS public.set_connection_failure_window_minutes(integer) CASCADE;
DROP FUNCTION IF EXISTS public.get_connections_auto_test_interval() CASCADE;
DROP FUNCTION IF EXISTS public.set_connections_auto_test_interval(integer) CASCADE;
DROP FUNCTION IF EXISTS public.sync_external_connections_from_credentials() CASCADE;
DROP FUNCTION IF EXISTS public.sync_external_connections_from_credentials(text) CASCADE;

-- 3. Drop tabela external_connections
DROP TABLE IF EXISTS public.external_connections CASCADE;

COMMIT;

SELECT
  'D.2.4 rollback complete' AS status,
  (SELECT count(*) FROM information_schema.tables
   WHERE table_schema='public' AND table_name='external_connections') AS table_exists,
  CASE
    WHEN (SELECT count(*) FROM information_schema.tables
          WHERE table_schema='public' AND table_name='external_connections') = 0
    THEN '✅ rollback ok' ELSE '❌ parcial' END AS verdict;
