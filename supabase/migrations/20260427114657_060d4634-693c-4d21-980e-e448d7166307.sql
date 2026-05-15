-- =====================================================================
-- HARDENING SECURITY DEFINER — Onda 1
-- Corrige lints 0028 (anon executable) e 0029 (authenticated executable)
-- do Supabase Database Linter para todas as funções SECURITY DEFINER.
-- =====================================================================

-- -----------------------------------------------------------------
-- PASSO 1 — REVOGAÇÃO UNIVERSAL
-- Para TODA função SECURITY DEFINER em public, remove EXECUTE de
-- PUBLIC, anon e authenticated. Em seguida concedemos seletivamente.
-- -----------------------------------------------------------------
DO $$
DECLARE
  r RECORD;
  fn_signature TEXT;
BEGIN
  FOR r IN
    SELECT n.nspname, p.proname, p.oid,
           pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  LOOP
    fn_signature := format('%I.%I(%s)', r.nspname, r.proname, r.args);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM PUBLIC', fn_signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM anon', fn_signature);
    EXECUTE format('REVOKE EXECUTE ON FUNCTION %s FROM authenticated', fn_signature);
  END LOOP;
END$$;

-- -----------------------------------------------------------------
-- PASSO 2 — TRIGGER FUNCTIONS
-- Funções que retornam `trigger` só são chamadas pelo motor de
-- triggers do Postgres (que ignora ACL). Mantemos zero EXECUTE
-- para qualquer cliente — defesa em profundidade contra invocação
-- direta via RPC.
-- (REVOKE acima já cuidou. Nada a fazer aqui — apenas auditável.)
-- -----------------------------------------------------------------

-- -----------------------------------------------------------------
-- PASSO 3 — RPCs DO FRONTEND (usuário autenticado)
-- Lista construída a partir de `rg .rpc(...)` em src/ e supabase/functions/.
-- Concedemos EXECUTE apenas a `authenticated` (não a anon).
-- -----------------------------------------------------------------
DO $$
DECLARE
  fn TEXT;
  rec RECORD;
  authenticated_rpcs TEXT[] := ARRAY[
    'acquire_ai_quota',
    'audit_ownership_orphans',
    'audit_rls_matrix',
    'can_grant_mcp_full',
    'check_ai_quota',
    'check_hardening_status',
    'check_ip_access',
    'check_rate_limit',
    'check_telemetry_regression',
    'claim_next_optimization',
    'cleanup_expired_novelties',
    'cleanup_old_logs',
    'cleanup_old_notifications',
    'complete_optimization',
    'consume_step_up_token',
    'enqueue_optimization',
    'ensure_default_favorite_list',
    'execute_role_migration_batch',
    'get_active_commemorative_dates',
    'get_all_material_groups_safe',
    'get_all_material_types_safe',
    'get_auto_test_job_status',
    'get_bundle_suggestions',
    'get_category_descendants',
    'get_client_top_products',
    'get_collections_weekly_count',
    'get_connection_failure_window_minutes',
    'get_connections_auto_test_interval',
    'get_favorites_weekly_count',
    'get_industry_benchmark_stats',
    'get_industry_top_products',
    'get_material_types_by_group_slug',
    'get_materials_complete_safe',
    'get_platform_failure_metrics',
    'get_quote_token_by_value',
    'get_top_collected_products',
    'get_top_compared_products',
    'get_top_favorited_products',
    'get_upcoming_commemorative_dates',
    'get_user_recent_comparisons',
    'get_variants_for_commemorative_date',
    'has_role',
    'is_admin',
    'is_dev',
    'is_dnd_active',
    'increment_kit_template_usage',
    'log_access_denied',
    'log_full_scope_grant',
    'log_rls_denial',
    'mark_step_up_password_verified',
    'record_dev_route_telemetry',
    'record_mcp_access_violation',
    'record_platform_failure',
    'record_public_token_failure',
    'repair_ownership_orphans',
    'request_step_up_challenge',
    'reset_optimization_queue',
    'search_products_semantic',
    'search_records_rerank',
    'set_connection_failure_window_minutes',
    'set_connections_auto_test_interval',
    'submit_quote_response',
    'sync_external_connections_from_credentials',
    'validate_mcp_key',
    'verify_step_up_otp',
    'can_approve_discount',
    'can_manage_connections',
    'can_manage_quotes',
    'can_view_all_sales',
    'can_view_audit_logs',
    'can_view_connections',
    'can_view_telemetry',
    'create_organization_with_owner',
    'audit_rls_coverage'
  ];
BEGIN
  FOREACH fn IN ARRAY authenticated_rpcs LOOP
    FOR rec IN
      SELECT pg_get_function_identity_arguments(p.oid) AS args
      FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE n.nspname = 'public' AND p.proname = fn AND p.prosecdef = true
    LOOP
      EXECUTE format('GRANT EXECUTE ON FUNCTION public.%I(%s) TO authenticated', fn, rec.args);
    END LOOP;
  END LOOP;
END$$;

-- -----------------------------------------------------------------
-- PASSO 4 — RPC PÚBLICA INTENCIONAL
-- `submit_quote_response` é chamada via token público (cliente não logado
-- aprovando orçamento). Permite `anon`. A função valida o token internamente.
-- -----------------------------------------------------------------
DO $$
DECLARE rec RECORD;
BEGIN
  FOR rec IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'submit_quote_response' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.submit_quote_response(%s) TO anon', rec.args);
  END LOOP;
  -- get_quote_token_by_value também é chamado em rota pública de aprovação
  FOR rec IN
    SELECT pg_get_function_identity_arguments(p.oid) AS args
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.proname = 'get_quote_token_by_value' AND p.prosecdef = true
  LOOP
    EXECUTE format('GRANT EXECUTE ON FUNCTION public.get_quote_token_by_value(%s) TO anon', rec.args);
  END LOOP;
END$$;

-- -----------------------------------------------------------------
-- PASSO 5 — FUNÇÃO DE AUDITORIA (gate de CI)
-- Lista funções SECURITY DEFINER ainda executáveis por papéis indevidos.
-- Quem pode chamar: authenticated (para dashboards admin) — service_role acessa direto.
-- Esta função é SECURITY INVOKER (só lê catálogo do Postgres).
-- -----------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_security_definer_acl()
RETURNS TABLE(
  function_name TEXT,
  arguments TEXT,
  problem TEXT,
  granted_to TEXT
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public, pg_catalog
AS $$
  WITH defs AS (
    SELECT
      p.oid,
      p.proname,
      pg_get_function_identity_arguments(p.oid) AS args,
      p.proacl,
      (pg_get_function_result(p.oid) = 'trigger') AS is_trigger,
      -- whitelist de funções intencionalmente acessíveis a anon
      (p.proname IN ('submit_quote_response', 'get_quote_token_by_value')) AS public_intent
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public' AND p.prosecdef = true
  ),
  acl_expanded AS (
    SELECT
      d.proname,
      d.args,
      d.is_trigger,
      d.public_intent,
      a.grantee::regrole::text AS grantee
    FROM defs d
    LEFT JOIN LATERAL (
      SELECT (aclexplode(d.proacl)).grantee
    ) a ON true
    WHERE a.grantee IS NOT NULL
  )
  -- Caso 1: PUBLIC (grantee 0) — sempre proibido
  SELECT proname, args, 'PUBLIC has EXECUTE'::text, 'PUBLIC'::text
  FROM acl_expanded
  WHERE grantee = '-'
  UNION ALL
  -- Caso 2: anon — proibido exceto whitelist
  SELECT proname, args, 'anon has EXECUTE (not in public-intent whitelist)'::text, 'anon'
  FROM acl_expanded
  WHERE grantee = 'anon' AND NOT public_intent
  UNION ALL
  -- Caso 3: authenticated em trigger function — não faz sentido
  SELECT proname, args, 'trigger function has EXECUTE for authenticated'::text, 'authenticated'
  FROM acl_expanded
  WHERE grantee = 'authenticated' AND is_trigger
  ORDER BY 1, 2;
$$;

COMMENT ON FUNCTION public.audit_security_definer_acl() IS
'Audit gate: lista funções SECURITY DEFINER em public ainda executáveis por papéis indevidos. Usado pelo CI (scripts/check-security-definer-acl.mjs). Lints Supabase 0028/0029.';

GRANT EXECUTE ON FUNCTION public.audit_security_definer_acl() TO authenticated, service_role;
