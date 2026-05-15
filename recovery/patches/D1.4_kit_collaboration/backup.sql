-- ═══════════════════════════════════════════════════════════════════
-- BACKUP — D1.4_kit_collaboration
-- Rodar ANTES do patch.sql. Captura estado atual (se existir).
-- ═══════════════════════════════════════════════════════════════════

-- Snapshot da tabela kit_collaborators (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_kit_collaborators_20260511_d14 AS
SELECT *, now() AS backup_ts FROM public.kit_collaborators WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_collaborators') THEN
    INSERT INTO public._backup_kit_collaborators_20260511_d14
    SELECT *, now() FROM public.kit_collaborators;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup kit_collaborators skipped: %', SQLERRM;
END $$;

-- Snapshot da tabela kit_comments (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_kit_comments_20260511_d14 AS
SELECT *, now() AS backup_ts FROM public.kit_comments WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_comments') THEN
    INSERT INTO public._backup_kit_comments_20260511_d14
    SELECT *, now() FROM public.kit_comments;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup kit_comments skipped: %', SQLERRM;
END $$;

-- Snapshot da tabela kit_share_tokens (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_kit_share_tokens_20260511_d14 AS
SELECT *, now() AS backup_ts FROM public.kit_share_tokens WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_share_tokens') THEN
    INSERT INTO public._backup_kit_share_tokens_20260511_d14
    SELECT *, now() FROM public.kit_share_tokens;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup kit_share_tokens skipped: %', SQLERRM;
END $$;

-- Snapshot da tabela kit_variants (se existir hoje)
CREATE TABLE IF NOT EXISTS public._backup_kit_variants_20260511_d14 AS
SELECT *, now() AS backup_ts FROM public.kit_variants WHERE 1=0;
-- Tentativa: copiar dados se a tabela existir
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_variants') THEN
    INSERT INTO public._backup_kit_variants_20260511_d14
    SELECT *, now() FROM public.kit_variants;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'Backup kit_variants skipped: %', SQLERRM;
END $$;

-- Snapshot das functions existentes (se houver com nomes iguais)
CREATE TABLE IF NOT EXISTS public._backup_functions_d14 AS
SELECT 
  proname, 
  pg_get_functiondef(p.oid) AS definition,
  now() AS backup_ts
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname = 'public'
  AND proname IN ('is_kit_collaborator', 'is_kit_owner');

SELECT 'BACKUP DONE' AS status,
  (SELECT count(*) FROM information_schema.tables WHERE table_name LIKE '_backup_%_d14') AS backup_tables_created,
  (SELECT count(*) FROM public._backup_functions_d14) AS backup_funcs_captured;
