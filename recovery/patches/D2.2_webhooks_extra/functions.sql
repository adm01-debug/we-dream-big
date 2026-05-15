-- ═══════════════════════════════════════════════════════════════════
-- BATCH D2.2_webhooks_extra - RPCs follow-up post merge
-- 4 functions extraídas do dump Lovable (block04)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- Name: maintain_webhook_metrics(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.maintain_webhook_metrics() RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
    partition_name TEXT;
    next_month DATE := date_trunc('month', now() + interval '1 month');
    next_month_end DATE := date_trunc('month', now() + interval '2 month');
BEGIN
    DELETE FROM public.webhook_delivery_metrics WHERE occurred_at < now() - INTERVAL '90 days';

    partition_name := 'webhook_delivery_metrics_y' || to_char(next_month, 'YYYY') || 'm' || to_char(next_month, 'MM');
    
    IF NOT EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = partition_name) THEN
        EXECUTE format('CREATE TABLE public.%I PARTITION OF public.webhook_delivery_metrics FOR VALUES FROM (%L) TO (%L)', 
            partition_name, next_month, next_month_end);
    END IF;
END;
$$;


--

--

--

-- Name: cleanup_webhook_logs(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.cleanup_webhook_logs() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_deleted_outbound int;
  v_deleted_inbound int;
  v_deleted_metrics int;
BEGIN
  WITH del AS (
    DELETE FROM public.webhook_deliveries
    WHERE delivered_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_outbound FROM del;

  WITH del AS (
    DELETE FROM public.inbound_webhook_events
    WHERE received_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_inbound FROM del;

  -- Add metrics cleanup
  WITH del AS (
    DELETE FROM public.webhook_delivery_metrics
    WHERE occurred_at < now() - interval '90 days'
    RETURNING 1
  )
  SELECT count(*) INTO v_deleted_metrics FROM del;

  RETURN jsonb_build_object(
    'ok', true,
    'deleted_outbound', v_deleted_outbound,
    'deleted_inbound', v_deleted_inbound,
    'deleted_metrics', v_deleted_metrics,
    'ran_at', now()
  );
END;
$$;


--

--

--

-- Name: retry_failed_webhook_deliveries(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.retry_failed_webhook_deliveries() RETURNS jsonb
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_supabase_url text := 'https://nmojwpihnslkssljowjh.supabase.co';
  v_service_key text;
  v_retried int := 0;
  v_skipped int := 0;
  rec record;
  v_max_attempts int;
BEGIN
  -- Busca service role key do vault (se disponível) ou usa o setting
  BEGIN
    v_service_key := current_setting('app.supabase_service_role_key', true);
  EXCEPTION WHEN OTHERS THEN
    v_service_key := NULL;
  END;

  IF v_service_key IS NULL OR v_service_key = '' THEN
    RETURN jsonb_build_object(
      'ok', false,
      'error', 'service_role_key not configured in app.supabase_service_role_key'
    );
  END IF;

  -- Pega a ÚLTIMA tentativa de cada (webhook_id, event, payload_hash) na última hora
  -- Re-dispara apenas se ainda há margem em retry_policy.max_attempts
  FOR rec IN
    WITH latest AS (
      SELECT DISTINCT ON (d.webhook_id, d.event, d.payload_hash)
        d.id, d.webhook_id, d.event, d.payload, d.attempt, d.success
      FROM public.webhook_deliveries d
      WHERE d.delivered_at > now() - interval '1 hour'
      ORDER BY d.webhook_id, d.event, d.payload_hash, d.attempt DESC
    )
    SELECT l.*, w.active, w.retry_policy
    FROM latest l
    JOIN public.outbound_webhooks w ON w.id = l.webhook_id
    WHERE l.success = false AND w.active = true
  LOOP
    v_max_attempts := COALESCE((rec.retry_policy->>'max_attempts')::int, 3);

    IF rec.attempt >= v_max_attempts THEN
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    PERFORM net.http_post(
      url := v_supabase_url || '/functions/v1/webhook-dispatcher',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'Authorization', 'Bearer ' || v_service_key
      ),
      body := jsonb_build_object(
        'event', rec.event,
        'payload', rec.payload
      )
    );
    v_retried := v_retried + 1;
  END LOOP;

  RETURN jsonb_build_object(
    'ok', true,
    'retried', v_retried,
    'skipped_max_attempts', v_skipped,
    'ran_at', now()
  );
END;
$$;


--

--

--

-- Name: get_webhook_delivery_summary(integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.get_webhook_delivery_summary(_minutes integer DEFAULT 60) RETURNS TABLE(source text, direction text, status_class text, total bigint, failures bigint, p95_ms integer, last_failure_at timestamp with time zone)
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    source,
    direction,
    CASE
      WHEN http_status BETWEEN 200 AND 299 THEN '2xx'
      WHEN http_status BETWEEN 300 AND 399 THEN '3xx'
      WHEN http_status BETWEEN 400 AND 499 THEN '4xx'
      WHEN http_status BETWEEN 500 AND 599 THEN '5xx'
      ELSE 'unknown'
    END AS status_class,
    COUNT(*)::BIGINT AS total,
    COUNT(*) FILTER (WHERE success = false)::BIGINT AS failures,
    PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY duration_ms)::INT AS p95_ms,
    MAX(occurred_at) FILTER (WHERE success = false) AS last_failure_at
  FROM public.webhook_delivery_metrics
  WHERE occurred_at >= now() - make_interval(mins => _minutes)
  GROUP BY source, direction, status_class
  ORDER BY source, direction, status_class;
$$;


--

--

COMMIT;
