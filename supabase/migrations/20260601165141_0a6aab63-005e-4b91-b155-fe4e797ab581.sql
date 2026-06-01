-- Audit and fix critical SECURITY DEFINER functions with correct signatures
-- Guard: cada função pode não existir em preview snapshots; skip silently.

DO $$
DECLARE
  fns text[] := ARRAY[
    'get_unread_count()',
    'acquire_ai_quota(uuid, text, text)',
    'check_auth_throttling(text, text)',
    'check_ip_access(text)',
    'get_auto_test_job_status(integer)',
    'claim_next_optimization()',
    'complete_optimization(uuid, text, text, text, jsonb, text)',
    'enqueue_optimization(text, text, text, integer)',
    'generate_secure_token()',
    'check_hardening_status()',
    'audit_security_definer_acl()'
  ];
  f text;
BEGIN
  FOREACH f IN ARRAY fns LOOP
    BEGIN
      EXECUTE format('ALTER FUNCTION public.%s SET search_path = public', f);
    EXCEPTION
      WHEN undefined_function THEN
        RAISE NOTICE 'function public.% ausente em preview — skipping', f;
    END;
  END LOOP;
END $$;
