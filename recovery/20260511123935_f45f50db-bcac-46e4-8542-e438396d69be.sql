
-- Purge function for expired step-up challenges and tokens
CREATE OR REPLACE FUNCTION public.purge_expired_step_up_artifacts(
  _challenge_grace_minutes integer DEFAULT 60,
  _token_grace_minutes integer DEFAULT 60
)
RETURNS TABLE(challenges_deleted bigint, tokens_deleted bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _ch bigint := 0;
  _tk bigint := 0;
BEGIN
  -- Delete tokens first (FK challenge_id ON DELETE may be SET NULL/CASCADE; safe either way)
  WITH del AS (
    DELETE FROM public.step_up_tokens
    WHERE expires_at < (now() - make_interval(mins => _token_grace_minutes))
       OR (consumed = true AND consumed_at < (now() - make_interval(mins => _token_grace_minutes)))
    RETURNING 1
  )
  SELECT count(*) INTO _tk FROM del;

  WITH del AS (
    DELETE FROM public.step_up_challenges
    WHERE expires_at < (now() - make_interval(mins => _challenge_grace_minutes))
       OR (consumed = true AND created_at < (now() - make_interval(mins => _challenge_grace_minutes)))
    RETURNING 1
  )
  SELECT count(*) INTO _ch FROM del;

  -- Audit (best-effort; don't fail the job if table missing)
  BEGIN
    INSERT INTO public.admin_audit_log(action, target, metadata)
    VALUES (
      'step_up_artifacts_purged',
      'step_up_challenges,step_up_tokens',
      jsonb_build_object(
        'challenges_deleted', _ch,
        'tokens_deleted', _tk,
        'challenge_grace_minutes', _challenge_grace_minutes,
        'token_grace_minutes', _token_grace_minutes,
        'ran_at', now()
      )
    );
  EXCEPTION WHEN undefined_table OR undefined_column THEN
    NULL;
  END;

  RETURN QUERY SELECT _ch, _tk;
END;
$$;

-- Lock down: service_role / postgres only
REVOKE ALL ON FUNCTION public.purge_expired_step_up_artifacts(integer, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.purge_expired_step_up_artifacts(integer, integer) TO service_role;

COMMENT ON FUNCTION public.purge_expired_step_up_artifacts(integer, integer) IS
  'Purges expired/consumed rows from step_up_challenges and step_up_tokens. Scheduled via pg_cron job purge-step-up-artifacts (every 15 min). Logs result in admin_audit_log when available.';

-- Schedule via pg_cron (idempotent: unschedule existing first)
DO $$
DECLARE
  _jid bigint;
BEGIN
  SELECT jobid INTO _jid FROM cron.job WHERE jobname = 'purge-step-up-artifacts';
  IF _jid IS NOT NULL THEN
    PERFORM cron.unschedule(_jid);
  END IF;

  PERFORM cron.schedule(
    'purge-step-up-artifacts',
    '*/15 * * * *',
    $cron$ SELECT public.purge_expired_step_up_artifacts(60, 60); $cron$
  );
END $$;
