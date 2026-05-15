-- ═══════════════════════════════════════════════════════════════════
-- PATCH D2.5_telemetry — Telemetry & Monitoring
-- Prioridade: P2
-- Extraído por extract_d2.mjs (parsing por blocos pg_dump)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─────────── FUNCTION: public.get_app_health_summary ───────────
CREATE OR REPLACE FUNCTION public.get_app_health_summary(_minutes integer DEFAULT 60) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_since timestamptz := now() - make_interval(mins => GREATEST(1, LEAST(_minutes, 1440)));
  v_kpis jsonb;
  v_routes jsonb;
  v_webhooks jsonb;
  v_edges jsonb;
  v_vitals jsonb;
BEGIN
  -- Authorization: admin or dev only
  IF NOT (public.has_role(auth.uid(), 'admin'::app_role) OR public.has_role(auth.uid(), 'dev'::app_role)) THEN
    RAISE EXCEPTION 'forbidden' USING ERRCODE = '42501';
  END IF;

  -- 1) KPIs globais
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

  -- 2) Top rotas por erro
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

  -- 3) Webhooks por source
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

  -- 4) Edge functions por p95 latency
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

  -- 5) Core Web Vitals (P75 + breakdown)
  SELECT COALESCE(jsonb_agg(row_to_json(r)), '[]'::jsonb)
  INTO v_vitals
  FROM (
    SELECT
      metric_name AS name,
      COUNT(*) AS total,
      COALESCE(percentile_disc(0.75) WITHIN GROUP (ORDER BY metric_value), 0) AS p75,
      COUNT(*) FILTER (WHERE rating = 'good') AS count_good,
      COUNT(*) FILTER (WHERE rating = 'needs-improvement') AS count_needs_improvement,
      COUNT(*) FILTER (WHERE rating = 'poor') AS count_poor,
      ROUND((COUNT(*) FILTER (WHERE rating = 'good'))::numeric * 100.0 / NULLIF(COUNT(*), 0), 1) AS good_pct
    FROM public.app_vitals
    WHERE created_at >= v_since
    GROUP BY metric_name
    ORDER BY metric_name ASC
  ) r;

  RETURN jsonb_build_object(
    'kpis', v_kpis,
    'top_routes_by_error', v_routes,
    'webhooks_by_source', v_webhooks,
    'edges_by_latency', v_edges,
    'web_vitals', v_vitals
  );
END;
$$;

-- ─────────── FUNCTION: public.get_platform_failure_metrics ───────────
CREATE OR REPLACE FUNCTION public.get_platform_failure_metrics(window_minutes integer DEFAULT 60) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  window_start timestamptz := now() - make_interval(mins => COALESCE(window_minutes, 60));
  total_calls bigint;
  total_503 bigint;
  total_cold bigint;
  recent_cold_at timestamptz;
  prev_window_start timestamptz := now() - make_interval(mins => COALESCE(window_minutes, 60) * 2);
  prev_503 bigint;
BEGIN
  SELECT COUNT(*),
         COUNT(*) FILTER (WHERE is_503 = true),
         COUNT(*) FILTER (WHERE is_cold_start = true),
         MAX(created_at) FILTER (WHERE is_cold_start = true)
    INTO total_calls, total_503, total_cold, recent_cold_at
  FROM public.query_telemetry
  WHERE created_at >= window_start;

  SELECT COUNT(*) FILTER (WHERE is_503 = true)
    INTO prev_503
  FROM public.query_telemetry
  WHERE created_at >= prev_window_start AND created_at < window_start;

  RETURN jsonb_build_object(
    'window_minutes', window_minutes,
    'total_calls', COALESCE(total_calls, 0),
    'total_503', COALESCE(total_503, 0),
    'total_cold_starts', COALESCE(total_cold, 0),
    'rate_503_pct', CASE WHEN COALESCE(total_calls, 0) = 0 THEN 0
                         ELSE ROUND(total_503::numeric / total_calls::numeric * 100, 2) END,
    'rate_cold_start_pct', CASE WHEN COALESCE(total_calls, 0) = 0 THEN 0
                                ELSE ROUND(total_cold::numeric / total_calls::numeric * 100, 2) END,
    'last_cold_start_at', recent_cold_at,
    'prev_window_503', COALESCE(prev_503, 0),
    'delta_503', COALESCE(total_503, 0) - COALESCE(prev_503, 0)
  );
END;
$$;

-- ─────────── FUNCTION: public.check_telemetry_regression ───────────
CREATE OR REPLACE FUNCTION public.check_telemetry_regression() RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  current_window_start timestamptz := now() - interval '2 hours';
  baseline_window_start timestamptz := now() - interval '26 hours';
  baseline_window_end timestamptz := now() - interval '24 hours';

  cur_samples int := 0;
  cur_p95 numeric := 0;
  cur_avg numeric := 0;
  cur_errors int := 0;
  cur_very_slow int := 0;
  cur_error_rate numeric := 0;

  base_samples int := 0;
  base_p95 numeric := 0;
  base_error_rate numeric := 0;
  base_very_slow int := 0;

  p95_delta_pct numeric := 0;
  error_rate_delta_pp numeric := 0;
  very_slow_ratio numeric := 1;

  status text := 'ok';
  reasons jsonb := '[]'::jsonb;
BEGIN
  -- Apenas admins podem consultar
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RETURN jsonb_build_object('error', 'forbidden');
  END IF;

  -- Janela atual (somente queries não-cache para medir performance real)
  SELECT
    count(*),
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0),
    COALESCE(AVG(duration_ms), 0),
    count(*) FILTER (WHERE severity = 'error'),
    count(*) FILTER (WHERE severity = 'very_slow')
  INTO cur_samples, cur_p95, cur_avg, cur_errors, cur_very_slow
  FROM public.query_telemetry
  WHERE created_at >= current_window_start
    AND cache_hit = false;

  cur_error_rate := CASE WHEN cur_samples > 0
    THEN ROUND(100.0 * cur_errors / cur_samples, 2)
    ELSE 0 END;

  -- Janela baseline (24-48h atrás)
  SELECT
    count(*),
    COALESCE(PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms), 0),
    CASE WHEN count(*) > 0
      THEN ROUND(100.0 * count(*) FILTER (WHERE severity = 'error') / count(*), 2)
      ELSE 0 END,
    count(*) FILTER (WHERE severity = 'very_slow')
  INTO base_samples, base_p95, base_error_rate, base_very_slow
  FROM public.query_telemetry
  WHERE created_at >= baseline_window_start
    AND created_at < baseline_window_end
    AND cache_hit = false;

  -- Sem amostras suficientes → status 'insufficient_data'
  IF cur_samples < 5 OR base_samples < 5 THEN
    RETURN jsonb_build_object(
      'status', 'insufficient_data',
      'reasons', jsonb_build_array(format('Amostras insuficientes (atual=%s, baseline=%s)', cur_samples, base_samples)),
      'current', jsonb_build_object('samples', cur_samples, 'p95_ms', cur_p95, 'error_rate_pct', cur_error_rate, 'very_slow', cur_very_slow),
      'baseline', jsonb_build_object('samples', base_samples, 'p95_ms', base_p95, 'error_rate_pct', base_error_rate, 'very_slow', base_very_slow),
      'checked_at', now()
    );
  END IF;

  -- Calcula deltas
  p95_delta_pct := CASE WHEN base_p95 > 0
    THEN ROUND(100.0 * (cur_p95 - base_p95) / base_p95, 1)
    ELSE 0 END;
  error_rate_delta_pp := ROUND(cur_error_rate - base_error_rate, 2);
  very_slow_ratio := CASE WHEN base_very_slow > 0
    THEN ROUND(cur_very_slow::numeric / base_very_slow, 2)
    ELSE CASE WHEN cur_very_slow > 0 THEN 999 ELSE 1 END END;

  -- Avaliação de regressão
  -- REGRESSION (crítico): qualquer um abaixo
  IF p95_delta_pct > 50 THEN
    status := 'regression';
    reasons := reasons || jsonb_build_array(format('Latência P95 piorou %s%% (atual %sms vs baseline %sms)', p95_delta_pct, ROUND(cur_p95)::int, ROUND(base_p95)::int));
  END IF;
  IF error_rate_delta_pp > 5 THEN
    status := 'regression';
    reasons := reasons || jsonb_build_array(format('Taxa de erro subiu %spp (atual %s%% vs baseline %s%%)', error_rate_delta_pp, cur_error_rate, base_error_rate));
  END IF;
  IF very_slow_ratio > 2 AND cur_very_slow >= 3 THEN
    status := 'regression';
    reasons := reasons || jsonb_build_array(format('Queries muito lentas (>8s) %sx baseline (%s vs %s)', very_slow_ratio, cur_very_slow, base_very_slow));
  END IF;

  -- WARNING (moderado) — só promove se ainda não é regression
  IF status = 'ok' THEN
    IF p95_delta_pct > 25 THEN
      status := 'warning';
      reasons := reasons || jsonb_build_array(format('Latência P95 subiu %s%% (atual %sms vs baseline %sms)', p95_delta_pct, ROUND(cur_p95)::int, ROUND(base_p95)::int));
    END IF;
    IF error_rate_delta_pp > 2 THEN
      status := 'warning';
      reasons := reasons || jsonb_build_array(format('Taxa de erro subiu %spp (atual %s%% vs baseline %s%%)', error_rate_delta_pp, cur_error_rate, base_error_rate));
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'status', status,
    'reasons', reasons,
    'current', jsonb_build_object(
      'samples', cur_samples,
      'p95_ms', ROUND(cur_p95)::int,
      'avg_ms', ROUND(cur_avg)::int,
      'error_rate_pct', cur_error_rate,
      'very_slow', cur_very_slow
    ),
    'baseline', jsonb_build_object(
      'samples', base_samples,
      'p95_ms', ROUND(base_p95)::int,
      'error_rate_pct', base_error_rate,
      'very_slow', base_very_slow
    ),
    'deltas', jsonb_build_object(
      'p95_delta_pct', p95_delta_pct,
      'error_rate_delta_pp', error_rate_delta_pp,
      'very_slow_ratio', very_slow_ratio
    ),
    'checked_at', now()
  );
END;
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

-- ─────────── FUNCTION: public.lookup_request_id ───────────
CREATE OR REPLACE FUNCTION public.lookup_request_id(_request_id text) RETURNS jsonb
    LANGUAGE plpgsql STABLE SECURITY DEFINER
    SET search_path TO 'public'
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

-- ─────────── FUNCTION: public.record_dev_route_telemetry ───────────
CREATE OR REPLACE FUNCTION public.record_dev_route_telemetry(_event_type text, _blocked_path text, _user_role text DEFAULT NULL::text, _duration_ms integer DEFAULT NULL::integer) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _uid uuid := auth.uid();
  _safe_path text;
  _safe_role text;
  _safe_duration integer;
  _recent_count integer;
  _allowed_events constant text[] := ARRAY[
    'view',           -- usuário viu a tela 403
    'back',           -- clicou em "Voltar" (history -1)
    'retry',          -- clicou em "Tentar novamente" (mesmo path)
    'fallback',       -- foi para área segura (Início/Usuários/Catálogo)
    'request_access', -- clicou em "Solicitar acesso a Dev"
    'copy_link',      -- copiou o link da rota bloqueada
    'mail',           -- abriu cliente de e-mail
    'abandon'         -- saiu/fechou a aba (best-effort beacon)
  ];
BEGIN
  -- 1) Anônimo: ignora silenciosamente (não polui audit log).
  IF _uid IS NULL THEN
    RETURN;
  END IF;

  -- 2) Whitelist de event_type (defense-in-depth).
  IF NOT (_event_type = ANY (_allowed_events)) THEN
    RAISE EXCEPTION 'invalid event_type: %', _event_type
      USING ERRCODE = '22023';
  END IF;

  -- 3) Sanitização (sem PII):
  --    - path: trim + corta em 200 chars (rotas internas são curtas).
  --    - role: corta em 32 chars; só aceita papéis conhecidos.
  --    - duration_ms: clamp em [0, 3_600_000] (1h).
  _safe_path := substring(coalesce(_blocked_path, '') from 1 for 200);
  IF length(_safe_path) = 0 THEN
    RAISE EXCEPTION 'blocked_path required' USING ERRCODE = '22023';
  END IF;

  _safe_role := substring(coalesce(_user_role, '') from 1 for 32);
  IF _safe_role NOT IN ('dev','admin','supervisor','agente','agent','vendedor','') THEN
    _safe_role := 'unknown';
  END IF;
  IF length(_safe_role) = 0 THEN
    _safe_role := NULL;
  END IF;

  IF _duration_ms IS NULL THEN
    _safe_duration := NULL;
  ELSIF _duration_ms < 0 THEN
    _safe_duration := 0;
  ELSIF _duration_ms > 3600000 THEN
    _safe_duration := 3600000;
  ELSE
    _safe_duration := _duration_ms;
  END IF;

  -- 4) Rate limit por usuário: 30 eventos/min.
  --    Usa o mesmo log para evitar tabela auxiliar.
  SELECT count(*) INTO _recent_count
  FROM public.admin_audit_log
  WHERE user_id = _uid
    AND action  = 'route.ux_event'
    AND source  = 'dev-route-ui'
    AND created_at > now() - interval '1 minute';

  IF _recent_count >= 30 THEN
    -- Excede orçamento: descarta silenciosamente para não amplificar abuso.
    RETURN;
  END IF;

  -- 5) Insere o evento. payload_summary intencionalmente mínimo (sem
  --    user_agent/IP/email — esses campos só são preenchidos por edge
  --    functions com service role e contexto de request).
  INSERT INTO public.admin_audit_log (
    user_id,
    action,
    resource_type,
    resource_id,
    status,
    source,
    started_at,
    finished_at,
    duration_ms,
    request_id,
    payload_summary,
    details
  ) VALUES (
    _uid,
    'route.ux_event',
    'route',
    _safe_path,
    CASE WHEN _event_type IN ('view','abandon','copy_link','mail') THEN 'denied'
         WHEN _event_type IN ('back','retry','fallback')           THEN 'partial'
         WHEN _event_type = 'request_access'                       THEN 'success'
         ELSE 'denied' END,
    'dev-route-ui',
    now(),
    now(),
    _safe_duration,
    gen_random_uuid()::text,
    jsonb_build_object(
      'event_type',   _event_type,
      'blocked_path', _safe_path
    ),
    jsonb_build_object(
      'event_type',   _event_type,
      'blocked_path', _safe_path,
      'user_role',    _safe_role,
      'duration_ms',  _safe_duration
    )
  );
END;
$$;

-- ─────────── FUNCTION: public.record_platform_failure ───────────
CREATE OR REPLACE FUNCTION public.record_platform_failure(p_operation text, p_table text DEFAULT NULL::text, p_rpc_name text DEFAULT NULL::text, p_duration_ms integer DEFAULT 0, p_error_message text DEFAULT NULL::text, p_is_503 boolean DEFAULT true, p_is_cold_start boolean DEFAULT false, p_retry_count integer DEFAULT 0) RETURNS uuid
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  new_id uuid;
BEGIN
  INSERT INTO public.query_telemetry (
    operation, table_name, rpc_name, duration_ms, record_count,
    severity, error_message, error_kind, user_id,
    retry_count, cache_hit, is_503, is_cold_start
  ) VALUES (
    COALESCE(p_operation, 'unknown'),
    p_table,
    p_rpc_name,
    GREATEST(COALESCE(p_duration_ms, 0), 0),
    NULL,
    'error',
    p_error_message,
    'network',
    auth.uid(),
    GREATEST(COALESCE(p_retry_count, 0), 0),
    false,
    COALESCE(p_is_503, true),
    COALESCE(p_is_cold_start, false)
  )
  RETURNING id INTO new_id;

  RETURN new_id;
END;
$$;

COMMIT;