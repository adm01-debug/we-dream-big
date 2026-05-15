-- APLICADO MANUALMENTE VIA MCP apply_migration em 2026-05-12; não re-aplicar.
-- Ver docs/redeploy/REDEPLOY-FASE3-PLAN.md (critério C2).
--
-- T28 piloto Fase 3 — batch 2: 26 funções cleanup/purge/enforce/sync
-- claramente cron/trigger (não-usuário). service_role mantém execute.

DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_discount_test_data() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_collection_trash() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_favorite_trash() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_novelties() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_public_comparisons() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_step_up() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_expired_step_up_tokens() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_old_login_attempts() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_old_logs(integer) FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_old_notifications() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_orphan_step_up_artifacts() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_rate_limits() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_security_logs() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_user_search_history() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.cleanup_webhook_logs() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.enforce_created_by_owner() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.enforce_seller_id_owner() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.enforce_user_id_owner() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_edge_invocations_old() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_expired_step_up_artifacts() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_favorite_trash_old() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_old_audit_logs() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_old_login_attempts() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.purge_old_rate_limits() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials() FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
DO $$ BEGIN
  REVOKE EXECUTE ON FUNCTION public.sync_external_connections_from_credentials(text, text, uuid) FROM anon, authenticated, PUBLIC;
EXCEPTION WHEN undefined_function THEN NULL;
END $$;
