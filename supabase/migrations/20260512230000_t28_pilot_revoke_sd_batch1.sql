-- APLICADO MANUALMENTE VIA MCP apply_migration em 2026-05-12; não re-aplicar.
-- Ver docs/redeploy/REDEPLOY-FASE3-PLAN.md (critério C2) e
-- supabase/migrations/README.md (política contra db push).
--
-- T28 piloto Fase 3 — batch 1: 10 funções audit/auto/build claramente
-- admin/internas (não usadas em pg_policies, não em flows pré-login).
-- Reduz advisors anon_security_definer_function_executable e
-- authenticated_security_definer_function_executable.

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_mcp_api_keys_changes() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_mcp_api_keys_changes() IS
  'Trigger de auditoria de MCP API keys. Executável apenas pelo trigger owner. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_mcp_key_insert() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_mcp_key_insert() IS
  'Trigger de auditoria de MCP key INSERT. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_mcp_key_revoke() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_mcp_key_revoke() IS
  'Trigger de auditoria de MCP key REVOKE. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_ownership_orphans(text) FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_ownership_orphans(text) IS
  'Auditoria de orfãos de ownership. Cron job interno. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_rls_coverage() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_rls_coverage() IS
  'Audit interna de cobertura RLS. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_rls_matrix() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_rls_matrix() IS
  'Audit interna de matriz RLS. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.audit_user_role_changes() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.audit_user_role_changes() IS
  'Trigger de auditoria de mudanças em user_role. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.auto_block_extreme_offenders() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.auto_block_extreme_offenders() IS
  'Cron de bloqueio automático de ofensores. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.auto_revoke_orphan_full_keys(text) FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.auto_revoke_orphan_full_keys(text) IS
  'Cron de revogação automática de full-scope keys órfãs. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.build_full_scope_grants_v() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  COMMENT ON FUNCTION public.build_full_scope_grants_v() IS
  'Construção interna da view de grants full-scope. service_role apenas. T28 piloto Fase 3.';
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
