-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK — D1.3_collection_items
-- Use SE patch ou validate falharem.
-- CUIDADO: DROP TABLE remove dados!
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. DROP functions
DROP FUNCTION IF EXISTS public.move_collection_item_to_trash CASCADE;
DROP FUNCTION IF EXISTS public.cleanup_expired_collection_trash CASCADE;

-- 2. DROP tables (com CASCADE pra remover policies/indexes/triggers junto)
DROP TABLE IF EXISTS public.collection_items CASCADE;
DROP TABLE IF EXISTS public.collection_items_trash CASCADE;

-- 3. Validar reversão
SELECT 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items') AS dropped_collection_items,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items_trash') AS dropped_collection_items_trash,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='move_collection_item_to_trash') AS dropped_fn_move_collection_item_to_trash,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='cleanup_expired_collection_trash') AS dropped_fn_cleanup_expired_collection_trash;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- RESTAURAR DEFINIÇÕES ANTERIORES (se backup capturou algo)
-- ═══════════════════════════════════════════════════════════════════
-- Manualmente: SELECT definition FROM public._backup_functions_d13;
-- Executar cada definition resultante.
