-- ═══════════════════════════════════════════════════════════════════
-- VALIDATE — D1.5_dashboard_widgets
-- Rodar APÓS patch.sql. Todas as verificações devem retornar TRUE.
-- ═══════════════════════════════════════════════════════════════════

SELECT 
  'D1.5_dashboard_widgets' AS patch,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_comparisons') AS has_user_comparisons,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_collected_products') AS has_fn_get_top_collected_products,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_compared_products') AS has_fn_get_top_compared_products,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_favorited_products') AS has_fn_get_top_favorited_products,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_collections_weekly_count') AS has_fn_get_collections_weekly_count,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_favorites_weekly_count') AS has_fn_get_favorites_weekly_count,
  EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_user_recent_comparisons') AS has_fn_get_user_recent_comparisons;

-- Contadores
SELECT 
  'D1.5_dashboard_widgets_counters' AS check_,
  (SELECT count(*) FROM information_schema.columns WHERE table_schema='public' AND table_name='user_comparisons') AS cols_user_comparisons;

-- Policies criadas?
SELECT tablename, count(*) AS policies_count
FROM pg_policies WHERE schemaname='public' AND tablename IN ('user_comparisons')
GROUP BY tablename;

-- Indexes criados?
SELECT tablename, count(*) AS indexes_count
FROM pg_indexes WHERE schemaname='public' AND tablename IN ('user_comparisons')
GROUP BY tablename;

-- Functions: callable como RPC?
SELECT proname, 
  CASE WHEN provolatile = 'i' THEN 'IMMUTABLE'
       WHEN provolatile = 's' THEN 'STABLE'
       WHEN provolatile = 'v' THEN 'VOLATILE' END AS volatility,
  prosecdef AS security_definer
FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
WHERE n.nspname='public' AND proname IN ('get_top_collected_products', 'get_top_compared_products', 'get_top_favorited_products', 'get_collections_weekly_count', 'get_favorites_weekly_count', 'get_user_recent_comparisons')
ORDER BY proname;
