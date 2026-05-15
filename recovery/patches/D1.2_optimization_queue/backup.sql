-- ═══════════════════════════════════════════════════════════════════
-- BACKUP — D1.2_optimization_queue
-- Rodar ANTES do patch.sql. Captura estado atual (se existir).
-- ═══════════════════════════════════════════════════════════════════

-- Snapshot da tabela optimization_queue (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_optimization_queue_20260511_d12 AS
SELECT *, now() AS backup_ts FROM public.optimization_queue WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='optimization_queue') THEN
    INSERT INTO public._backup_optimization_queue_20260511_d12
    SELECT *, now() FROM public.optimization_queue;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup optimization_queue skipped: %', SQLERRM;
END $$;

-- Snapshot das functions existentes (se houver com nomes iguais)
CREATE TABLE IF NOT EXISTS public._backup_functions_d12 AS
SELECT 
  proname, 
  pg_get_functiondef(p.oid) AS definition,
  now() AS backup_ts
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('claim_next_optimization', 'complete_optimization', 'enqueue_optimization', 'reset_optimization_queue', 'get_auto_test_job_status', 'set_optimization_queue_updated_at');

SELECT 'BACKUP DONE' AS status,
  (SELECT count(*) FROM information_schema.tables WHERE table_name LIKE '_backup_%_d12') AS backup_tables_created,
  (SELECT count(*) FROM public._backup_functions_d12) AS backup_funcs_captured;
