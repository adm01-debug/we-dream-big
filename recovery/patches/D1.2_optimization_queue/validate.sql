-- ═══════════════════════════════════════════════════════════════════
-- VALIDATE — D1.2_optimization_queue
-- Rodar APÓS patch.sql. Todas as verificações devem retornar TRUE.
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'D1.2_optimization_queue' AS patch,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='optimization_queue') AS has_optimization_queue,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='claim_next_optimization') AS has_fn_claim_next_optimization,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='complete_optimization') AS has_fn_complete_optimization,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='enqueue_optimization') AS has_fn_enqueue_optimization,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='reset_optimization_queue') AS has_fn_reset_optimization_queue,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_auto_test_job_status') AS has_fn_get_auto_test_job_status,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='set_optimization_queue_updated_at') AS has_fn_set_optimization_queue_updated_at;

-- Contadores
SELECT 
  'D1.2_optimization_queue_counters' AS check_,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='optimization_queue') AS cols_optimization_queue;

-- Policies criadas?
SELECT tablename, count(*) AS policies_count
FROM pg_policies WHERE schemaname='public' AND tablename IN ('optimization_queue')
GROUP BY tablename;

-- Indexes criados?
SELECT tablename, count(*) AS indexes_count
FROM pg_indexes WHERE schemaname='public' AND tablename IN ('optimization_queue')
GROUP BY tablename;

-- Functions: callable como RPC?
SELECT proname, 
  CASE WHEN provolatile = 'i' THEN 'IMMUTABLE'
       WHEN provolatile = 's' THEN 'STABLE'
       WHEN provolatile = 'v' THEN 'VOLATILE' END AS volatility,
  prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN ('claim_next_optimization', 'complete_optimization', 'enqueue_optimization', 'reset_optimization_queue', 'get_auto_test_job_status', 'set_optimization_queue_updated_at')
ORDER BY proname;
