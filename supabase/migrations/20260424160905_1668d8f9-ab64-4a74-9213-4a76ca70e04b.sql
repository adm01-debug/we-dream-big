-- Função SECURITY DEFINER: compara KPIs (P95 latência, error rate, very_slow count)
-- da janela atual (últimas 2h) vs baseline (mesmo período 24-48h atrás).
-- Thresholds: regressão crítica se P95 piora >50% OU error_rate sobe >5pp OU very_slow >2x baseline.
CREATE OR REPLACE FUNCTION public.check_telemetry_regression()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.check_telemetry_regression() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.check_telemetry_regression() TO authenticated;