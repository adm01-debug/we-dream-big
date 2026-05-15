-- Allowed intervals (minutes). Keeps cron parseable and avoids weird schedules.
-- 5, 10, 15, 30, 60, 120, 240
CREATE OR REPLACE FUNCTION public.get_connections_auto_test_interval()
RETURNS integer
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  s text;
  m text;
BEGIN
  SELECT schedule INTO s FROM cron.job WHERE jobname = 'connections-auto-test' LIMIT 1;
  IF s IS NULL THEN RETURN NULL; END IF;
  -- Expect "*/N * * * *" or "N * * * *"
  m := split_part(s, ' ', 1);
  IF m LIKE '*/%' THEN
    RETURN NULLIF(substring(m FROM 3), '')::int;
  ELSIF m ~ '^[0-9]+$' THEN
    -- Single-minute schedule means "once per hour at minute N" → treat as 60
    RETURN 60;
  END IF;
  RETURN NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_connections_auto_test_interval(minutes integer)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, cron
AS $$
DECLARE
  schedule text;
  job_id bigint;
BEGIN
  -- Admin only
  IF NOT public.has_role(auth.uid(), 'admin'::public.app_role) THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  IF minutes NOT IN (5, 10, 15, 30, 60, 120, 240) THEN
    RAISE EXCEPTION 'invalid interval: must be one of 5, 10, 15, 30, 60, 120, 240 minutes';
  END IF;

  IF minutes < 60 THEN
    schedule := '*/' || minutes::text || ' * * * *';
  ELSIF minutes = 60 THEN
    schedule := '0 * * * *';
  ELSIF minutes = 120 THEN
    schedule := '0 */2 * * *';
  ELSIF minutes = 240 THEN
    schedule := '0 */4 * * *';
  END IF;

  SELECT jobid INTO job_id FROM cron.job WHERE jobname = 'connections-auto-test' LIMIT 1;
  IF job_id IS NULL THEN
    RAISE EXCEPTION 'cron job connections-auto-test not found';
  END IF;

  PERFORM cron.alter_job(job_id := job_id, schedule := schedule);

  -- Audit
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    auth.uid(),
    'connections_auto_test_interval_changed',
    'cron_job',
    job_id::text,
    jsonb_build_object('minutes', minutes, 'schedule', schedule)
  );

  RETURN minutes;
END;
$$;

REVOKE ALL ON FUNCTION public.set_connections_auto_test_interval(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_connections_auto_test_interval(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_connections_auto_test_interval() TO authenticated;