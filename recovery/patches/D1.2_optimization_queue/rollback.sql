-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK — D1.2_optimization_queue
-- Use SE patch ou validate falharem.
-- CUIDADO: DROP TABLE remove dados!
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. DROP functions
DROP FUNCTION IF EXISTS public.claim_next_optimization CASCADE;
DROP FUNCTION IF EXISTS public.complete_optimization CASCADE;
DROP FUNCTION IF EXISTS public.enqueue_optimization CASCADE;
DROP FUNCTION IF EXISTS public.reset_optimization_queue CASCADE;
DROP FUNCTION IF EXISTS public.get_auto_test_job_status CASCADE;
DROP FUNCTION IF EXISTS public.set_optimization_queue_updated_at CASCADE;

-- 2. DROP tables (com CASCADE pra remover policies/indexes/triggers junto)
DROP TABLE IF EXISTS public.optimization_queue CASCADE;

-- 3. Validar reversão
SELECT 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='optimization_queue') AS dropped_optimization_queue,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_next_optimization') AS dropped_fn_claim_next_optimization,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='complete_optimization') AS dropped_fn_complete_optimization,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enqueue_optimization') AS dropped_fn_enqueue_optimization,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reset_optimization_queue') AS dropped_fn_reset_optimization_queue,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_auto_test_job_status') AS dropped_fn_get_auto_test_job_status,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_optimization_queue_updated_at') AS dropped_fn_set_optimization_queue_updated_at;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- RESTAURAR DEFINIÇÕES ANTERIORES (se backup capturou algo)
-- ═══════════════════════════════════════════════════════════════════
-- Manualmente: SELECT definition FROM public._backup_functions_d12;
-- Executar cada definition resultante.
