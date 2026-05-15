-- RPC: aggregate connection_test_history (cron) into "runs" — a run is a burst
-- of cron-triggered tests within a 60s window. Returns last N runs with
-- duration (max-min tested_at), ok/fail counts, and total tested.
CREATE OR REPLACE FUNCTION public.get_auto_test_job_status(_limit int DEFAULT 20)
RETURNS TABLE (
  run_started_at timestamptz,
  run_ended_at timestamptz,
  duration_ms int,
  total_tested int,
  ok_count int,
  fail_count int,
  retried_count int,
  avg_latency_ms int
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH ordered AS (
    SELECT
      tested_at,
      success,
      latency_ms,
      attempts,
      -- Bucket: floor to nearest minute. Cron fires at minute boundaries and
      -- the whole batch finishes within seconds, so this groups one run.
      date_trunc('minute', tested_at) AS bucket
    FROM public.connection_test_history
    WHERE triggered_by = 'cron'
      AND tested_at > now() - interval '7 days'
  ),
  runs AS (
    SELECT
      bucket,
      MIN(tested_at) AS run_started_at,
      MAX(tested_at) AS run_ended_at,
      GREATEST(EXTRACT(EPOCH FROM (MAX(tested_at) - MIN(tested_at))) * 1000, 0)::int AS duration_ms,
      COUNT(*)::int AS total_tested,
      COUNT(*) FILTER (WHERE success)::int AS ok_count,
      COUNT(*) FILTER (WHERE NOT success)::int AS fail_count,
      COUNT(*) FILTER (WHERE attempts > 1)::int AS retried_count,
      COALESCE(AVG(latency_ms) FILTER (WHERE latency_ms IS NOT NULL), 0)::int AS avg_latency_ms
    FROM ordered
    GROUP BY bucket
  )
  SELECT
    run_started_at,
    run_ended_at,
    duration_ms,
    total_tested,
    ok_count,
    fail_count,
    retried_count,
    avg_latency_ms
  FROM runs
  ORDER BY run_started_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
$$;

REVOKE ALL ON FUNCTION public.get_auto_test_job_status(int) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_auto_test_job_status(int) TO authenticated;

-- Restrict to admins via wrapper-style check inside (security definer + role guard).
-- Add an admin guard at the call site by re-creating with role check:
CREATE OR REPLACE FUNCTION public.get_auto_test_job_status(_limit int DEFAULT 20)
RETURNS TABLE (
  run_started_at timestamptz,
  run_ended_at timestamptz,
  duration_ms int,
  total_tested int,
  ok_count int,
  fail_count int,
  retried_count int,
  avg_latency_ms int
)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'forbidden: admin role required';
  END IF;

  RETURN QUERY
  WITH ordered AS (
    SELECT
      cth.tested_at,
      cth.success,
      cth.latency_ms,
      cth.attempts,
      date_trunc('minute', cth.tested_at) AS bucket
    FROM public.connection_test_history cth
    WHERE cth.triggered_by = 'cron'
      AND cth.tested_at > now() - interval '7 days'
  ),
  runs AS (
    SELECT
      o.bucket,
      MIN(o.tested_at) AS run_started_at,
      MAX(o.tested_at) AS run_ended_at,
      GREATEST(EXTRACT(EPOCH FROM (MAX(o.tested_at) - MIN(o.tested_at))) * 1000, 0)::int AS duration_ms,
      COUNT(*)::int AS total_tested,
      COUNT(*) FILTER (WHERE o.success)::int AS ok_count,
      COUNT(*) FILTER (WHERE NOT o.success)::int AS fail_count,
      COUNT(*) FILTER (WHERE o.attempts > 1)::int AS retried_count,
      COALESCE(AVG(o.latency_ms) FILTER (WHERE o.latency_ms IS NOT NULL), 0)::int AS avg_latency_ms
    FROM ordered o
    GROUP BY o.bucket
  )
  SELECT
    r.run_started_at,
    r.run_ended_at,
    r.duration_ms,
    r.total_tested,
    r.ok_count,
    r.fail_count,
    r.retried_count,
    r.avg_latency_ms
  FROM runs r
  ORDER BY r.run_started_at DESC
  LIMIT GREATEST(1, LEAST(_limit, 100));
END;
$$;
