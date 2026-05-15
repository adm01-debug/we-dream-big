-- ═══════════════════════════════════════════════════════════════════
-- ROLLBACK — D1.4_kit_collaboration
-- Use SE patch ou validate falharem.
-- CUIDADO: DROP TABLE remove dados!
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- 1. DROP functions
DROP FUNCTION IF EXISTS public.is_kit_collaborator CASCADE;
DROP FUNCTION IF EXISTS public.is_kit_owner CASCADE;

-- 2. DROP tables (com CASCADE pra remover policies/indexes/triggers junto)
DROP TABLE IF EXISTS public.kit_collaborators CASCADE;
DROP TABLE IF EXISTS public.kit_comments CASCADE;
DROP TABLE IF EXISTS public.kit_share_tokens CASCADE;
DROP TABLE IF EXISTS public.kit_variants CASCADE;

-- 3. Validar reversão
SELECT 
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_collaborators') AS dropped_kit_collaborators,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_comments') AS dropped_kit_comments,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_share_tokens') AS dropped_kit_share_tokens,
  NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema='public' AND table_name='kit_variants') AS dropped_kit_variants,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_kit_collaborator') AS dropped_fn_is_kit_collaborator,
  NOT EXISTS (SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace WHERE n.nspname='public' AND p.proname='is_kit_owner') AS dropped_fn_is_kit_owner;

COMMIT;

-- ═══════════════════════════════════════════════════════════════════
-- RESTAURAR DEFINIÇÕES ANTERIORES (se backup capturou algo)
-- ═══════════════════════════════════════════════════════════════════
-- Manualmente: SELECT definition FROM public._backup_functions_d14;
-- Executar cada definition resultante.
