-- ═══════════════════════════════════════════════════════════════════
-- BACKUP — D1.5_dashboard_widgets
-- Rodar ANTES do patch.sql. Captura estado atual (se existir).
-- ═══════════════════════════════════════════════════════════════════

-- Snapshot da tabela user_comparisons (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_user_comparisons_20260511_d15 AS
SELECT *, now() AS backup_ts FROM public.user_comparisons WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_comparisons') THEN
    INSERT INTO public._backup_user_comparisons_20260511_d15
    SELECT *, now() FROM public.user_comparisons;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup user_comparisons skipped: %', SQLERRM;
END $$;

-- Snapshot das functions existentes (se houver com nomes iguais)
CREATE TABLE IF NOT EXISTS public._backup_functions_d15 AS
SELECT 
  proname, 
  pg_get_functiondef(p.oid) AS definition,
  now() AS backup_ts
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('get_top_collected_products', 'get_top_compared_products', 'get_top_favorited_products', 'get_collections_weekly_count', 'get_favorites_weekly_count', 'get_user_recent_comparisons');

SELECT 'BACKUP DONE' AS status,
  (SELECT count(*) FROM information_schema.tables WHERE table_name LIKE '_backup_%_d15') AS backup_tables_created,
  (SELECT count(*) FROM public._backup_functions_d15) AS backup_funcs_captured;
