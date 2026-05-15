-- Composite indexes for fast aggregation
CREATE INDEX IF NOT EXISTS idx_web_vitals_metric_created
  ON public.web_vitals (metric_name, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_web_vitals_page_metric
  ON public.web_vitals (page_url, metric_name)
  WHERE page_url IS NOT NULL;

-- Aggregated summary RPC (admin-only)
CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(
  days integer DEFAULT 7,
  metric_filter text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
  cutoff timestamptz;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  cutoff := now() - (days || ' days')::interval;

  WITH base AS (
    SELECT metric_name, metric_value, rating, page_url, navigation_type, created_at
    FROM public.web_vitals
    WHERE created_at >= cutoff
      AND (metric_filter IS NULL OR metric_name = metric_filter)
  ),
  percentiles AS (
    SELECT
      metric_name,
      COUNT(*) AS samples,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value) AS p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value) AS p99
    FROM base
    GROUP BY metric_name
  ),
  distribution AS (
    SELECT
      metric_name,
      COUNT(*) FILTER (WHERE rating = 'good')::numeric / NULLIF(COUNT(*),0) AS good_pct,
      COUNT(*) FILTER (WHERE rating = 'needs-improvement')::numeric / NULLIF(COUNT(*),0) AS ni_pct,
      COUNT(*) FILTER (WHERE rating = 'poor')::numeric / NULLIF(COUNT(*),0) AS poor_pct
    FROM base
    GROUP BY metric_name
  ),
  slowest_pages AS (
    SELECT
      page_url,
      metric_name,
      COUNT(*) AS samples,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75
    FROM base
    WHERE page_url IS NOT NULL AND metric_name IN ('LCP','INP','CLS')
    GROUP BY page_url, metric_name
    HAVING COUNT(*) >= 3
    ORDER BY p75 DESC
    LIMIT 10
  ),
  daily_trend AS (
    SELECT
      date_trunc('day', created_at) AS day,
      metric_name,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      COUNT(*) AS samples
    FROM base
    GROUP BY 1, 2
    ORDER BY 1
  ),
  nav_breakdown AS (
    SELECT
      COALESCE(navigation_type,'unknown') AS navigation_type,
      metric_name,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      COUNT(*) AS samples
    FROM base
    GROUP BY 1, 2
  )
  SELECT jsonb_build_object(
    'days', days,
    'cutoff', cutoff,
    'total_samples', (SELECT COUNT(*) FROM base),
    'percentiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM percentiles p), '[]'::jsonb),
    'distribution', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM distribution d), '[]'::jsonb),
    'slowest_pages', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM slowest_pages s), '[]'::jsonb),
    'daily_trend', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM daily_trend t), '[]'::jsonb),
    'nav_breakdown', COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM nav_breakdown n), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_web_vitals_summary(integer, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_summary(integer, text) TO authenticated;

-- Regression detection RPC (admin-only or service-role)
CREATE OR REPLACE FUNCTION public.get_web_vitals_regression()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  result jsonb;
BEGIN
  IF auth.role() <> 'service_role' AND NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied';
  END IF;

  WITH current_window AS (
    SELECT metric_name,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
           COUNT(*) AS samples
    FROM public.web_vitals
    WHERE created_at >= now() - interval '7 days'
      AND metric_name IN ('LCP','INP','CLS','FCP','TTFB')
    GROUP BY metric_name
  ),
  previous_window AS (
    SELECT metric_name,
           percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
           COUNT(*) AS samples
    FROM public.web_vitals
    WHERE created_at >= now() - interval '14 days'
      AND created_at < now() - interval '7 days'
      AND metric_name IN ('LCP','INP','CLS','FCP','TTFB')
    GROUP BY metric_name
  ),
  comparison AS (
    SELECT
      c.metric_name,
      c.p75 AS current_p75,
      p.p75 AS previous_p75,
      c.samples AS current_samples,
      p.samples AS previous_samples,
      CASE
        WHEN p.p75 IS NULL OR p.p75 = 0 THEN NULL
        ELSE ((c.p75 - p.p75) / p.p75) * 100
      END AS change_pct
    FROM current_window c
    LEFT JOIN previous_window p USING (metric_name)
  )
  SELECT jsonb_build_object(
    'generated_at', now(),
    'metrics', COALESCE(jsonb_agg(to_jsonb(c) ORDER BY c.metric_name), '[]'::jsonb),
    'regressions', COALESCE(
      jsonb_agg(to_jsonb(c) ORDER BY c.change_pct DESC) FILTER (
        WHERE c.change_pct IS NOT NULL
          AND c.change_pct > 20
          AND c.current_samples >= 10
          AND c.previous_samples >= 10
      ),
      '[]'::jsonb
    )
  ) INTO result FROM comparison c;

  RETURN result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_web_vitals_regression() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_web_vitals_regression() TO authenticated, service_role;