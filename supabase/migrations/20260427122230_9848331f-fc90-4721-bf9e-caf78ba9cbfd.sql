-- ============================================================================
-- Observability: webhook delivery metrics + 4xx/5xx aggregator
-- ============================================================================
-- Tabela append-only que registra cada tentativa de entrega de webhook
-- (inbound e outbound). Alimentada pelas edge functions webhook-* via
-- service_role. Usada para dashboards e alertas (ver docs/OBSERVABILITY.md).

CREATE TABLE IF NOT EXISTS public.webhook_delivery_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_id TEXT NOT NULL,
  direction TEXT NOT NULL CHECK (direction IN ('inbound','outbound')),
  source TEXT NOT NULL,                 -- ex: 'bitrix', 'product-webhook', 'stripe'
  event_type TEXT,                      -- ex: 'order.created'
  endpoint TEXT,                        -- URL chamada (outbound) ou path (inbound)
  http_status INT,                      -- código HTTP retornado/recebido
  duration_ms INT,
  attempt INT NOT NULL DEFAULT 1,
  success BOOLEAN NOT NULL,
  error_class TEXT,                     -- ex: 'TimeoutError', 'AuthError'
  error_message TEXT,
  payload_bytes INT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb
);

CREATE INDEX IF NOT EXISTS idx_webhook_metrics_occurred_at
  ON public.webhook_delivery_metrics (occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_source_status
  ON public.webhook_delivery_metrics (source, http_status, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_failures
  ON public.webhook_delivery_metrics (occurred_at DESC)
  WHERE success = false;
CREATE INDEX IF NOT EXISTS idx_webhook_metrics_request_id
  ON public.webhook_delivery_metrics (request_id);

ALTER TABLE public.webhook_delivery_metrics ENABLE ROW LEVEL SECURITY;

-- Apenas dev/supervisor pode inspecionar; service_role escreve. Anon/auth bloqueados.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny anon select webhook_metrics') THEN
    CREATE POLICY "deny anon select webhook_metrics"
      ON public.webhook_delivery_metrics FOR SELECT TO anon USING (false);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny anon insert webhook_metrics') THEN
    CREATE POLICY "deny anon insert webhook_metrics"
      ON public.webhook_delivery_metrics FOR INSERT TO anon WITH CHECK (false);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny anon update webhook_metrics') THEN
    CREATE POLICY "deny anon update webhook_metrics"
      ON public.webhook_delivery_metrics FOR UPDATE TO anon USING (false);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny anon delete webhook_metrics') THEN
    CREATE POLICY "deny anon delete webhook_metrics"
      ON public.webhook_delivery_metrics FOR DELETE TO anon USING (false);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'supervisors view webhook_metrics') THEN
    CREATE POLICY "supervisors view webhook_metrics"
      ON public.webhook_delivery_metrics FOR SELECT TO authenticated
      USING (public.has_role(auth.uid(), 'dev'::app_role)
          OR public.has_role(auth.uid(), 'supervisor'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny auth insert webhook_metrics') THEN
    CREATE POLICY "deny auth insert webhook_metrics"
      ON public.webhook_delivery_metrics FOR INSERT TO authenticated WITH CHECK (false);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny auth update webhook_metrics') THEN
    CREATE POLICY "deny auth update webhook_metrics"
      ON public.webhook_delivery_metrics FOR UPDATE TO authenticated USING (false);
  END IF;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_delivery_metrics' AND policyname = 'deny auth delete webhook_metrics') THEN
    CREATE POLICY "deny auth delete webhook_metrics"
      ON public.webhook_delivery_metrics FOR DELETE TO authenticated USING (false);
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- RPC: agregação para dashboards (últimos N minutos por source + status_class)
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_webhook_delivery_summary(_minutes INT DEFAULT 60)
RETURNS TABLE (
  source TEXT,
  direction TEXT,
  status_class TEXT,
  total BIGINT,
  failures BIGINT,
  p95_ms INT,
  last_failure_at TIMESTAMPTZ
)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
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

REVOKE ALL ON FUNCTION public.get_webhook_delivery_summary(INT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.get_webhook_delivery_summary(INT) FROM anon;
GRANT EXECUTE ON FUNCTION public.get_webhook_delivery_summary(INT) TO authenticated;

COMMENT ON TABLE public.webhook_delivery_metrics IS
  'Append-only webhook delivery telemetry. Written by edge functions via service_role. Used for OBSERVABILITY dashboards and alerts.';
COMMENT ON FUNCTION public.get_webhook_delivery_summary(INT) IS
  'Aggregates webhook deliveries by source/direction/status_class for the last N minutes. Used by /admin/observability dashboard.';