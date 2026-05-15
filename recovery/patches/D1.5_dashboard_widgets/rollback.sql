-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK — D1.5_dashboard_widgets
-- Use SE patch ou validate falharem.
-- CUIDADO: DROP TABLE remove dados!
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. DROP functions
DROP FUNCTION IF EXISTS public.get_top_collected_products CASCADE;
DROP FUNCTION IF EXISTS public.get_top_compared_products CASCADE;
DROP FUNCTION IF EXISTS public.get_top_favorited_products CASCADE;
DROP FUNCTION IF EXISTS public.get_collections_weekly_count CASCADE;
DROP FUNCTION IF EXISTS public.get_favorites_weekly_count CASCADE;
DROP FUNCTION IF EXISTS public.get_user_recent_comparisons CASCADE;

-- 2. DROP tables (com CASCADE pra remover policies/indexes/triggers junto)
DROP TABLE IF EXISTS public.user_comparisons CASCADE;

-- 3. Validar reversão
SELECT 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='user_comparisons') AS dropped_user_comparisons,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_collected_products') AS dropped_fn_get_top_collected_products,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_compared_products') AS dropped_fn_get_top_compared_products,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_top_favorited_products') AS dropped_fn_get_top_favorited_products,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_collections_weekly_count') AS dropped_fn_get_collections_weekly_count,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_favorites_weekly_count') AS dropped_fn_get_favorites_weekly_count,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='get_user_recent_comparisons') AS dropped_fn_get_user_recent_comparisons;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- RESTAURAR DEFINIÇÕES ANTERIORES (se backup capturou algo)
-- ═══════════════════════════════════════════════════════════════════
-- Manualmente: SELECT definition FROM public._backup_functions_d15;
-- Executar cada definition resultante.
