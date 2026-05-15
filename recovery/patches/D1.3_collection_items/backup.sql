-- ═══════════════════════════════════════════════════════════════════
-- BACKUP — D1.3_collection_items
-- Rodar ANTES do patch.sql. Captura estado atual (se existir).
-- ═══════════════════════════════════════════════════════════════════

-- Snapshot da tabela collection_items (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_collection_items_20260511_d13 AS
SELECT *, now() AS backup_ts FROM public.collection_items WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items') THEN
    INSERT INTO public._backup_collection_items_20260511_d13
    SELECT *, now() FROM public.collection_items;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup collection_items skipped: %', SQLERRM;
END $$;

-- Snapshot da tabela collection_items_trash (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_collection_items_trash_20260511_d13 AS
SELECT *, now() AS backup_ts FROM public.collection_items_trash WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='collection_items_trash') THEN
    INSERT INTO public._backup_collection_items_trash_20260511_d13
    SELECT *, now() FROM public.collection_items_trash;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup collection_items_trash skipped: %', SQLERRM;
END $$;

-- Snapshot das functions existentes (se houver com nomes iguais)
CREATE TABLE IF NOT EXISTS public._backup_functions_d13 AS
SELECT 
  proname, 
  pg_get_functiondef(p.oid) AS definition,
  now() AS backup_ts
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('move_collection_item_to_trash', 'cleanup_expired_collection_trash');

SELECT 'BACKUP DONE' AS status,
  (SELECT count(*) FROM information_schema.tables WHERE table_name LIKE '_backup_%_d13') AS backup_tables_created,
  (SELECT count(*) FROM public._backup_functions_d13) AS backup_funcs_captured;
