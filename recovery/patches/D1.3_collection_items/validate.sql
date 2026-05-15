-- ═══════════════════════════════════════════════════════════════════
-- VALIDATE — D1.3_collection_items
-- Rodar APÓS patch.sql. Todas as verificações devem retornar TRUE.
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'D1.3_collection_items' AS patch,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items') AS has_collection_items,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items_trash') AS has_collection_items_trash,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='move_collection_item_to_trash') AS has_fn_move_collection_item_to_trash,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='cleanup_expired_collection_trash') AS has_fn_cleanup_expired_collection_trash;

-- Contadores
SELECT 
  'D1.3_collection_items_counters' AS check_,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='collection_items') AS cols_collection_items,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='collection_items_trash') AS cols_collection_items_trash;

-- Policies criadas?
SELECT tablename, count(*) AS policies_count
FROM pg_policies WHERE schemaname='public' AND tablename IN ('collection_items', 'collection_items_trash')
GROUP BY tablename;

-- Indexes criados?
SELECT tablename, count(*) AS indexes_count
FROM pg_indexes WHERE schemaname='public' AND tablename IN ('collection_items', 'collection_items_trash')
GROUP BY tablename;

-- Functions: callable como RPC?
SELECT proname, 
  CASE WHEN provolatile = 'i' THEN 'IMMUTABLE'
       WHEN provolatile = 's' THEN 'STABLE'
       WHEN provolatile = 'v' THEN 'VOLATILE' END AS volatility,
  prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN ('move_collection_item_to_trash', 'cleanup_expired_collection_trash')
ORDER BY proname;
