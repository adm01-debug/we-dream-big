-- =============================================================================
-- Dashboard "Saúde da Aplicação" — RPCs read-only sobre webhook_delivery_metrics
-- =============================================================================

CREATE OR REPLACE FUNCTION public.get_app_health_summary(_minutes INT DEFAULT 60)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_since timestamptz := now() - make_interval(mins => GREATEST(1, LEAST(_minutes, 1440)));
  v_kpis jsonb;
  v_routes jsonb;
  v_webhooks jsonb;
  v_edges jsonb;
BEGIN
  -- Authorization: admin or dev only
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- ======================================================================
  -- 1) KPIs globais (req/min, %4xx, %5xx, p95 ms)
  -- ======================================================================
  SELECT jsonb_build_object(
    'total', COUNT(*),
    'req_per_min', ROUND((COUNT(*)::numeric / GREATEST(1, _minutes))::numeric, 2),
    'pct_4xx', CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND((COUNT(*) FILTER (WHERE http_status BETWEEN 400 AND 499))::numeric * 100.0 / COUNT(*), 2) END,
    'pct_5xx', CASE WHEN COUNT(*) = 0 THEN 0
                    ELSE ROUND((COUNT(*) FILTER (WHERE http_status >= 500))::numeric * 100.0 / COUNT(*), 2) END,
    'p95_ms', COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0),
    'p99_ms', COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0),
    'window_minutes', _minutes,
    'since', v_since
  )
  INTO v_kpis
  FROM public.webhook_delivery_metrics
  WHERE occurred_at >= v_since;

  -- ======================================================================
  -- 2) Top rotas por erro (4xx + 5xx), com breakdown
  -- ======================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_routes
  FROM (
    SELECT
      endpoint,
      direction,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE http_status BETWEEN 400 AND 499) AS count_4xx,
      COUNT(*) FILTER (WHERE http_status >= 500) AS count_5xx,
      ROUND((COUNT(*) FILTER (WHERE http_status >= 400))::numeric * 100.0
            / NULLIF(COUNT(*),0), 2) AS error_rate_pct,
      MAX(occurred_at) FILTER (WHERE http_status >= 400) AS last_error_at
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
      AND endpoint IS NOT NULL
    GROUP BY endpoint, direction
    HAVING COUNT(*) FILTER (WHERE http_status >= 400) > 0
    ORDER BY (COUNT(*) FILTER (WHERE http_status >= 400)) DESC
    LIMIT 20
  ) r;

  -- ======================================================================
  -- 3) Webhooks por source × direction (taxa de falha)
  -- ======================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_webhooks
  FROM (
    SELECT
      source,
      direction,
      COUNT(*) AS total,
      COUNT(*) FILTER (WHERE NOT success) AS failures,
      ROUND((COUNT(*) FILTER (WHERE NOT success))::numeric * 100.0
            / NULLIF(COUNT(*),0), 2) AS failure_rate_pct,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_ms,
      MAX(occurred_at) FILTER (WHERE NOT success) AS last_failure_at
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
    GROUP BY source, direction
    ORDER BY failures DESC, total DESC
    LIMIT 30
  ) r;

  -- ======================================================================
  -- 4) Edge functions por p95 latency (proxy: source agrupado)
  -- ======================================================================
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_edges
  FROM (
    SELECT
      source AS edge_function,
      COUNT(*) AS total,
      COALESCE(percentile_disc(0.50) WITHIN GROUP (ORDER BY duration_ms), 0) AS p50_ms,
      COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY duration_ms), 0) AS p95_ms,
      COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY duration_ms), 0) AS p99_ms,
      ROUND(AVG(duration_ms)::numeric, 0) AS avg_ms,
      MAX(duration_ms) AS max_ms
    FROM public.webhook_delivery_metrics
    WHERE occurred_at >= v_since
    GROUP BY source
    ORDER BY p95_ms DESC NULLS LAST
    LIMIT 30
  ) r;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'top_routes_by_error', v_routes,
    'webhooks_by_source', v_webhooks,
    'edges_by_latency', v_edges
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_app_health_summary(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_app_health_summary(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_app_health_summary(INT) TO authenticated;

COMMENT ON FUNCTION public.get_app_health_summary(INT) IS
'Dashboard "Saúde da Aplicação" — KPIs agregados de webhook_delivery_metrics. Admin/dev only.';

-- =============================================================================
-- Lookup por request-id: timeline cross-camada (apenas tabelas com request_id)
-- =============================================================================
CREATE OR REPLACE FUNCTION public.lookup_request_id(_request_id text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_webhook_events jsonb;
BEGIN
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  IF _request_id IS NULL OR length(_request_id) < 8 OR length(_request_id) > 128 THEN
    RAISE EXCEPTION 'invalid_request_id' USING ERRCODE = '22023';
  END IF;

  SELECT COALESCE(jsonb_agg(row_to_json(r) ORDER BY (r->>'occurred_at')), '[]'::jsonb)
  INTO v_webhook_events
  FROM (
    SELECT
      occurred_at,
      source,
      direction,
      event_type,
      endpoint,
      http_status,
      duration_ms,
      attempt,
      success,
      error_class,
      error_message,
      payload_bytes
    FROM public.webhook_delivery_metrics
    WHERE request_id = _request_id
    ORDER BY occurred_at ASC
    LIMIT 200
  ) r;

  RETURN jsonb_build_object(
    'request_id', _request_id,
    'webhook_events', v_webhook_events,
    'event_count', jsonb_array_length(v_webhook_events)
  );
END;
$$;

REVOKE ALL ON FUNCTION public.lookup_request_id(text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.lookup_request_id(text) FROM anon;
GRANT EXECUTE ON FUNCTION public.lookup_request_id(text) TO authenticated;

COMMENT ON FUNCTION public.lookup_request_id(text) IS
'Lookup cross-camada por X-Request-Id — retorna timeline de eventos correlacionados. Admin/dev only.';
