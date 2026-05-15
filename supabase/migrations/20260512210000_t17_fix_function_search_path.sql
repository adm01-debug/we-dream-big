-- ============================================================================
-- T17: Garantir search_path seguro em funções públicas (postgres-owned)
-- ============================================================================
-- Contexto (Tarefa #17 do redeploy Promo_Gifts 2026-05-12):
--   A Supabase Security Advisor alerta quando funções não têm search_path
--   explícito — vetor de SQL injection via search_path hijacking.
--
-- Diagnóstico (2026-05-12 via pg_proc query):
--   - 768 funções postgres-owned em public: TODAS já têm search_path definido.
--   - 4 funções supabase_admin-owned (unaccent): NÃO podem ser alteradas
--     — são gerenciadas pela plataforma Supabase (pg_catalog-owned extension).
--
-- Esta migration é IDEMPOTENTE e serve como guardrail futuro:
--   Re-execução em ambiente onde funções ainda não têm search_path aplica
--   a correção. Em produção (2026-05-12), o DO block completa sem ALTER.
--
-- SEGURANÇA: NÃO altera funções de supabase_admin (platform-managed).
--   Alterá-las causaria erro de permissão ou comportamento inesperado.
-- ============================================================================

DO $$
DECLARE
  r          RECORD;
  v_count    INT := 0;
  v_skipped  INT := 0;
BEGIN
  FOR r IN
    SELECT
      p.oid,
      p.proname,
      n.nspname AS schema_name,
      pg_get_userbyid(p.proowner) AS owner
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND pg_get_userbyid(p.proowner) = 'postgres'
      AND (
        p.proconfig IS NULL
        OR NOT EXISTS (
          SELECT 1 FROM unnest(p.proconfig) AS cfg
          WHERE cfg LIKE 'search_path=%'
        )
      )
  LOOP
    BEGIN
      EXECUTE format(
        'ALTER FUNCTION %s SET search_path = public',
        r.oid::regprocedure
      );
      v_count := v_count + 1;
      RAISE NOTICE 'T17: search_path definido em %.% (owner=postgres)',
        r.schema_name, r.proname;
    EXCEPTION WHEN OTHERS THEN
      v_skipped := v_skipped + 1;
      RAISE WARNING 'T17: não foi possível alterar %.% — %',
        r.schema_name, r.proname, SQLERRM;
    END;
  END LOOP;

  IF v_count = 0 AND v_skipped = 0 THEN
    RAISE NOTICE 'T17: todas as funções postgres-owned já têm search_path definido. Nada a fazer.';
  ELSE
    RAISE NOTICE 'T17: concluído — % função(ões) corrigida(s), % ignorada(s).', v_count, v_skipped;
  END IF;
END $$;
