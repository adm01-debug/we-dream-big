-- T40: Fix remaining ERROR-level advisor violations
-- Add missing SECURITY DEFINER ACL hardening for vault helper introduced as a stubbed prod migration.
-- This function is called by service-only SQL callers and must never be executable by
-- anon/authenticated/PUBLIC. We also keep search_path explicit and the whitelist strict.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_proc p
    JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname = 'get_edge_function_secret'
      AND pg_get_function_identity_arguments(p.oid) = '_name text'
  ) THEN
    REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM PUBLIC;
    REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM anon;
    REVOKE ALL ON FUNCTION public.get_edge_function_secret(text) FROM authenticated;
    GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO service_role;
    GRANT EXECUTE ON FUNCTION public.get_edge_function_secret(text) TO postgres;
  END IF;
END $$;
