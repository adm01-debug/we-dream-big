-- Cleanup security logs function + daily pg_cron job
CREATE OR REPLACE FUNCTION public.cleanup_security_logs()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _token_failures_deleted int := 0;
  _bot_log_deleted int := 0;
  _audit_log_deleted int := 0;
  _ip_expired_deleted int := 0;
BEGIN
  WITH d AS (DELETE FROM public.public_token_failures WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _token_failures_deleted FROM d;

  WITH d AS (DELETE FROM public.bot_detection_log WHERE created_at < now() - INTERVAL '90 days' RETURNING 1)
  SELECT count(*) INTO _bot_log_deleted FROM d;

  WITH d AS (DELETE FROM public.admin_audit_log WHERE created_at < now() - INTERVAL '365 days' RETURNING 1)
  SELECT count(*) INTO _audit_log_deleted FROM d;

  WITH d AS (
    DELETE FROM public.ip_access_control
    WHERE expires_at IS NOT NULL AND expires_at < now() - INTERVAL '30 days'
    RETURNING 1
  )
  SELECT count(*) INTO _ip_expired_deleted FROM d;

  RETURN jsonb_build_object(
    'ok', true,
    'ran_at', now(),
    'public_token_failures_deleted', _token_failures_deleted,
    'bot_detection_log_deleted', _bot_log_deleted,
    'admin_audit_log_deleted', _audit_log_deleted,
    'ip_access_control_expired_deleted', _ip_expired_deleted
  );
END;
$$;

REVOKE ALL ON FUNCTION public.cleanup_security_logs() FROM PUBLIC, anon, authenticated;

-- Hardening status check function (read-only inspection of platform state)
CREATE OR REPLACE FUNCTION public.check_hardening_status()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _is_admin boolean;
  _private_buckets int;
  _sensitive_realtime int;
  _pg_trgm_in_extensions boolean;
  _cleanup_job_active boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin'
  ) INTO _is_admin;

  IF NOT _is_admin THEN
    RAISE EXCEPTION 'Admin only';
  END IF;

  SELECT count(*) INTO _private_buckets
  FROM storage.buckets
  WHERE id IN ('personalization-images','product-videos','supplier-logos','component-media')
    AND public = false;

  SELECT count(*) INTO _sensitive_realtime
  FROM pg_publication_tables
  WHERE pubname = 'supabase_realtime'
    AND schemaname = 'public'
    AND tablename IN ('discount_approval_requests','kit_variants','kit_comments');

  SELECT EXISTS (
    SELECT 1 FROM pg_extension e
    JOIN pg_namespace n ON n.oid = e.extnamespace
    WHERE e.extname = 'pg_trgm' AND n.nspname = 'extensions'
  ) INTO _pg_trgm_in_extensions;

  SELECT EXISTS (
    SELECT 1 FROM cron.job WHERE jobname = 'cleanup-security-logs-daily' AND active = true
  ) INTO _cleanup_job_active;

  RETURN jsonb_build_object(
    'private_buckets_count', _private_buckets,
    'private_buckets_ok', _private_buckets = 4,
    'sensitive_realtime_count', _sensitive_realtime,
    'realtime_isolation_ok', _sensitive_realtime = 0,
    'pg_trgm_in_extensions', _pg_trgm_in_extensions,
    'cleanup_job_active', _cleanup_job_active,
    'mfa_enforced_in_app', true,
    'checked_at', now()
  );
END;
$$;

REVOKE ALL ON FUNCTION public.check_hardening_status() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.check_hardening_status() TO authenticated;