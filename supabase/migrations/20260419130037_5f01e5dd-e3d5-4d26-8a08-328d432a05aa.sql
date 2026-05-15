-- ============================================================================
-- Hub de Conexões: schema completo
-- ============================================================================

-- 1) external_connections: registry de conexões nomeadas
CREATE TABLE IF NOT EXISTS public.external_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  type text NOT NULL CHECK (type IN ('supabase','bitrix24','n8n','mcp','webhook_outbound','webhook_inbound')),
  name text NOT NULL,
  config jsonb NOT NULL DEFAULT '{}'::jsonb,
  secret_refs text[] NOT NULL DEFAULT ARRAY[]::text[],
  status text NOT NULL DEFAULT 'unconfigured' CHECK (status IN ('unconfigured','active','degraded','error','disabled')),
  last_test_at timestamptz,
  last_test_ok boolean,
  last_test_message text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (type, name)
);

ALTER TABLE public.external_connections ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'external_connections' AND policyname = 'Admins manage external_connections') THEN
    CREATE POLICY "Admins manage external_connections"
      ON public.external_connections
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_external_connections_updated_at ON public.external_connections;
CREATE TRIGGER trg_external_connections_updated_at
  BEFORE UPDATE ON public.external_connections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2) outbound_webhooks
CREATE TABLE IF NOT EXISTS public.outbound_webhooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  url text NOT NULL,
  secret_ref text,
  events text[] NOT NULL DEFAULT ARRAY[]::text[],
  active boolean NOT NULL DEFAULT true,
  retry_policy jsonb NOT NULL DEFAULT jsonb_build_object('max_attempts',3,'backoff_seconds',ARRAY[5,30,120]),
  description text,
  created_by uuid NOT NULL,
  last_triggered_at timestamptz,
  total_success int NOT NULL DEFAULT 0,
  total_failure int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.outbound_webhooks ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'outbound_webhooks' AND policyname = 'Admins manage outbound_webhooks') THEN
    CREATE POLICY "Admins manage outbound_webhooks"
      ON public.outbound_webhooks
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_outbound_webhooks_updated_at ON public.outbound_webhooks;
CREATE TRIGGER trg_outbound_webhooks_updated_at
  BEFORE UPDATE ON public.outbound_webhooks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_outbound_webhooks_active_events
  ON public.outbound_webhooks USING GIN (events) WHERE active = true;

-- 3) webhook_deliveries
CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  webhook_id uuid NOT NULL REFERENCES public.outbound_webhooks(id) ON DELETE CASCADE,
  event text NOT NULL,
  payload jsonb,
  payload_hash text,
  status_code int,
  response_body_truncated text,
  attempt int NOT NULL DEFAULT 1,
  success boolean NOT NULL DEFAULT false,
  error_message text,
  delivered_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_deliveries' AND policyname = 'Admins read webhook_deliveries') THEN
    CREATE POLICY "Admins read webhook_deliveries"
      ON public.webhook_deliveries
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'webhook_deliveries' AND policyname = 'Admins delete webhook_deliveries') THEN
    CREATE POLICY "Admins delete webhook_deliveries"
      ON public.webhook_deliveries
      FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_webhook_time
  ON public.webhook_deliveries (webhook_id, delivered_at DESC);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_event_time
  ON public.webhook_deliveries (event, delivered_at DESC);

-- 4) inbound_webhook_endpoints
CREATE TABLE IF NOT EXISTS public.inbound_webhook_endpoints (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  slug text NOT NULL UNIQUE,
  name text NOT NULL,
  source_system text NOT NULL,
  hmac_secret_ref text NOT NULL,
  allowed_events text[] NOT NULL DEFAULT ARRAY[]::text[],
  active boolean NOT NULL DEFAULT true,
  description text,
  created_by uuid NOT NULL,
  last_received_at timestamptz,
  total_received int NOT NULL DEFAULT 0,
  total_invalid int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_webhook_endpoints ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbound_webhook_endpoints' AND policyname = 'Admins manage inbound_webhook_endpoints') THEN
    CREATE POLICY "Admins manage inbound_webhook_endpoints"
      ON public.inbound_webhook_endpoints
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_inbound_endpoints_updated_at ON public.inbound_webhook_endpoints;
CREATE TRIGGER trg_inbound_endpoints_updated_at
  BEFORE UPDATE ON public.inbound_webhook_endpoints
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 5) inbound_webhook_events
CREATE TABLE IF NOT EXISTS public.inbound_webhook_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  endpoint_id uuid NOT NULL REFERENCES public.inbound_webhook_endpoints(id) ON DELETE CASCADE,
  event_type text,
  payload jsonb,
  signature_valid boolean NOT NULL DEFAULT false,
  processed boolean NOT NULL DEFAULT false,
  error text,
  source_ip text,
  received_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.inbound_webhook_events ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbound_webhook_events' AND policyname = 'Admins read inbound_webhook_events') THEN
    CREATE POLICY "Admins read inbound_webhook_events"
      ON public.inbound_webhook_events
      FOR SELECT
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'inbound_webhook_events' AND policyname = 'Admins delete inbound_webhook_events') THEN
    CREATE POLICY "Admins delete inbound_webhook_events"
      ON public.inbound_webhook_events
      FOR DELETE
      USING (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_inbound_events_endpoint_time
  ON public.inbound_webhook_events (endpoint_id, received_at DESC);

-- 6) mcp_api_keys
CREATE TABLE IF NOT EXISTS public.mcp_api_keys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  key_hash text NOT NULL UNIQUE,
  key_prefix text NOT NULL,
  scopes text[] NOT NULL DEFAULT ARRAY[]::text[],
  description text,
  created_by uuid NOT NULL,
  last_used_at timestamptz,
  expires_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.mcp_api_keys ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_api_keys' AND policyname = 'Admins manage mcp_api_keys') THEN
    CREATE POLICY "Admins manage mcp_api_keys"
      ON public.mcp_api_keys
      FOR ALL
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DROP TRIGGER IF EXISTS trg_mcp_api_keys_updated_at ON public.mcp_api_keys;
CREATE TRIGGER trg_mcp_api_keys_updated_at
  BEFORE UPDATE ON public.mcp_api_keys
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ============================================================================
-- Funções
-- ============================================================================

-- validate_mcp_key: recebe chave plain, retorna scopes se válida
CREATE OR REPLACE FUNCTION public.validate_mcp_key(_key_plain text)
RETURNS TABLE(key_id uuid, scopes text[])
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _hash text;
  _row record;
BEGIN
  IF _key_plain IS NULL OR length(_key_plain) < 16 THEN
    RETURN;
  END IF;

  _hash := encode(extensions.digest(_key_plain, 'sha256'), 'hex');

  SELECT id, mcp_api_keys.scopes, expires_at, revoked_at
  INTO _row
  FROM public.mcp_api_keys
  WHERE key_hash = _hash
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF _row.revoked_at IS NOT NULL THEN
    RETURN;
  END IF;

  IF _row.expires_at IS NOT NULL AND _row.expires_at < now() THEN
    RETURN;
  END IF;

  UPDATE public.mcp_api_keys SET last_used_at = now() WHERE id = _row.id;

  RETURN QUERY SELECT _row.id, _row.scopes;
END;
$$;

-- dispatch helper chamado por triggers — invoca edge function via pg_net
CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions
AS $$
DECLARE
  _event text;
  _payload jsonb;
  _project_url text := 'https://nmojwpihnslkssljowjh.supabase.co';
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF TG_OP = 'INSERT' THEN
      _event := 'quote.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _event := 'quote.' || NEW.status;
    ELSE
      RETURN NEW;
    END IF;
    _payload := jsonb_build_object(
      'id', NEW.id,
      'quote_number', NEW.quote_number,
      'status', NEW.status,
      'client_name', NEW.client_name,
      'client_email', NEW.client_email,
      'total', NEW.total,
      'seller_id', NEW.seller_id,
      'updated_at', NEW.updated_at
    );

  ELSIF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN
      _event := 'order.created';
    ELSE
      RETURN NEW;
    END IF;
    _payload := jsonb_build_object(
      'id', NEW.id,
      'order_number', NEW.order_number,
      'status', NEW.status,
      'client_name', NEW.client_name,
      'total', NEW.total,
      'seller_id', NEW.seller_id
    );

  ELSIF TG_TABLE_NAME = 'discount_approval_requests' THEN
    IF TG_OP = 'INSERT' THEN
      _event := 'discount.requested';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved','rejected') THEN
      _event := 'discount.' || NEW.status;
    ELSE
      RETURN NEW;
    END IF;
    _payload := jsonb_build_object(
      'id', NEW.id,
      'quote_id', NEW.quote_id,
      'requested_discount_percent', NEW.requested_discount_percent,
      'status', NEW.status,
      'seller_id', NEW.seller_id
    );

  ELSIF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF TG_OP = 'INSERT' THEN
      _event := 'kit.shared';
    ELSE
      RETURN NEW;
    END IF;
    _payload := jsonb_build_object(
      'id', NEW.id,
      'kit_id', NEW.kit_id,
      'token', NEW.token,
      'client_name', NEW.client_name,
      'seller_id', NEW.seller_id
    );

  ELSE
    RETURN NEW;
  END IF;

  -- Só dispara se houver pelo menos um webhook ativo subscrito
  IF NOT EXISTS (
    SELECT 1 FROM public.outbound_webhooks
    WHERE active = true AND _event = ANY(events)
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _project_url || '/functions/v1/webhook-dispatcher',
    body := jsonb_build_object('event', _event, 'payload', _payload)::text,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Nunca quebra a transação principal por causa de webhook
  RETURN NEW;
END;
$$;

-- Triggers de disparo (depois de INSERT/UPDATE)
DROP TRIGGER IF EXISTS trg_dispatch_webhook_quotes ON public.quotes;
DROP TRIGGER IF EXISTS trg_dispatch_webhook_quotes ON public.quotes;
CREATE TRIGGER trg_dispatch_webhook_quotes
  AFTER INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();

DROP TRIGGER IF EXISTS trg_dispatch_webhook_orders ON public.orders;
DROP TRIGGER IF EXISTS trg_dispatch_webhook_orders ON public.orders;
CREATE TRIGGER trg_dispatch_webhook_orders
  AFTER INSERT ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();

DROP TRIGGER IF EXISTS trg_dispatch_webhook_discount ON public.discount_approval_requests;
DROP TRIGGER IF EXISTS trg_dispatch_webhook_discount ON public.discount_approval_requests;
CREATE TRIGGER trg_dispatch_webhook_discount
  AFTER INSERT OR UPDATE ON public.discount_approval_requests
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();

DROP TRIGGER IF EXISTS trg_dispatch_webhook_kit_share ON public.kit_share_tokens;
DROP TRIGGER IF EXISTS trg_dispatch_webhook_kit_share ON public.kit_share_tokens;
CREATE TRIGGER trg_dispatch_webhook_kit_share
  AFTER INSERT ON public.kit_share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();