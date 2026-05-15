-- Update get_web_vitals_summary to support device_filter, url_filter, compare_previous,
-- and return previous_percentiles + top_urls for the Performance Runtime dashboard 10/10 polish.
CREATE OR REPLACE FUNCTION public.get_web_vitals_summary(
  days integer DEFAULT 7,
  metric_filter text DEFAULT NULL,
  device_filter text DEFAULT NULL,
  url_filter text DEFAULT NULL,
  compare_previous boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  result jsonb;
  cutoff timestamptz;
  prev_cutoff timestamptz;
  device_regex text;
BEGIN
  IF NOT has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'Access denied: admin only';
  END IF;

  cutoff := now() - (days || ' days')::interval;
  prev_cutoff := now() - ((days * 2) || ' days')::interval;

  -- device_filter: 'mobile' | 'tablet' | 'desktop' | NULL
  device_regex := CASE lower(coalesce(device_filter, ''))
    WHEN 'mobile' THEN '(?i)(mobile|iphone|android(?!.*tablet)|ipod|blackberry|windows phone)'
    WHEN 'tablet' THEN '(?i)(ipad|tablet|playbook|silk|android(?=.*tablet))'
    WHEN 'desktop' THEN '__DESKTOP__'
    ELSE NULL
  END;

  WITH base AS (
    SELECT metric_name, metric_value, rating, page_url, navigation_type, created_at, user_agent
    FROM public.web_vitals
    WHERE created_at >= cutoff
      AND (metric_filter IS NULL OR metric_name = metric_filter)
      AND (url_filter IS NULL OR page_url = url_filter)
      AND (
        device_regex IS NULL
        OR (device_regex = '__DESKTOP__' AND user_agent IS NOT NULL
            AND user_agent !~* '(mobile|iphone|android|ipod|blackberry|windows phone|ipad|tablet|playbook|silk)')
        OR (device_regex <> '__DESKTOP__' AND user_agent ~* device_regex)
      )
  ),
  prev_base AS (
    SELECT metric_name, metric_value
    FROM public.web_vitals
    WHERE compare_previous = true
      AND created_at >= prev_cutoff AND created_at < cutoff
      AND (metric_filter IS NULL OR metric_name = metric_filter)
      AND (url_filter IS NULL OR page_url = url_filter)
      AND (
        device_regex IS NULL
        OR (device_regex = '__DESKTOP__' AND user_agent IS NOT NULL
            AND user_agent !~* '(mobile|iphone|android|ipod|blackberry|windows phone|ipad|tablet|playbook|silk)')
        OR (device_regex <> '__DESKTOP__' AND user_agent ~* device_regex)
      )
  ),
  percentiles AS (
    SELECT metric_name, COUNT(*) AS samples,
      percentile_cont(0.50) WITHIN GROUP (ORDER BY metric_value) AS p50,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      percentile_cont(0.95) WITHIN GROUP (ORDER BY metric_value) AS p95,
      percentile_cont(0.99) WITHIN GROUP (ORDER BY metric_value) AS p99
    FROM base GROUP BY metric_name
  ),
  previous_percentiles AS (
    SELECT metric_name, COUNT(*) AS samples,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75
    FROM prev_base GROUP BY metric_name
  ),
  distribution AS (
    SELECT metric_name,
      COUNT(*) FILTER (WHERE rating='good')::numeric / NULLIF(COUNT(*),0) AS good_pct,
      COUNT(*) FILTER (WHERE rating='needs-improvement')::numeric / NULLIF(COUNT(*),0) AS ni_pct,
      COUNT(*) FILTER (WHERE rating='poor')::numeric / NULLIF(COUNT(*),0) AS poor_pct
    FROM base GROUP BY metric_name
  ),
  slowest_pages AS (
    SELECT page_url, metric_name, COUNT(*) AS samples,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75
    FROM base
    WHERE page_url IS NOT NULL AND metric_name IN ('LCP','INP','CLS')
    GROUP BY page_url, metric_name
    HAVING COUNT(*) >= 3
    ORDER BY p75 DESC LIMIT 10
  ),
  daily_trend AS (
    SELECT date_trunc('day', created_at) AS day, metric_name,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      COUNT(*) AS samples
    FROM base GROUP BY 1,2 ORDER BY 1
  ),
  nav_breakdown AS (
    SELECT COALESCE(navigation_type,'unknown') AS navigation_type, metric_name,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY metric_value) AS p75,
      COUNT(*) AS samples
    FROM base GROUP BY 1,2
  ),
  top_urls AS (
    SELECT page_url, COUNT(*) AS samples
    FROM base WHERE page_url IS NOT NULL
    GROUP BY page_url ORDER BY COUNT(*) DESC LIMIT 20
  )
  SELECT jsonb_build_object(
    'days', days,
    'cutoff', cutoff,
    'device_filter', device_filter,
    'url_filter', url_filter,
    'total_samples', (SELECT COUNT(*) FROM base),
    'percentiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM percentiles p), '[]'::jsonb),
    'previous_percentiles', COALESCE((SELECT jsonb_agg(to_jsonb(p)) FROM previous_percentiles p), '[]'::jsonb),
    'distribution', COALESCE((SELECT jsonb_agg(to_jsonb(d)) FROM distribution d), '[]'::jsonb),
    'slowest_pages', COALESCE((SELECT jsonb_agg(to_jsonb(s)) FROM slowest_pages s), '[]'::jsonb),
    'daily_trend', COALESCE((SELECT jsonb_agg(to_jsonb(t)) FROM daily_trend t), '[]'::jsonb),
    'nav_breakdown', COALESCE((SELECT jsonb_agg(to_jsonb(n)) FROM nav_breakdown n), '[]'::jsonb),
    'top_urls', COALESCE((SELECT jsonb_agg(to_jsonb(u)) FROM top_urls u), '[]'::jsonb)
  ) INTO result;

  RETURN result;
END;
$function$;