-- ═══════════════════════════════════════════════════════════════════
-- PATCH D.4.2 Quote Advanced (P2)
-- Gerado automaticamente a partir do dump Lovable
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Table: quote_drafts ───
--

CREATE TABLE public.quote_drafts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    data jsonb NOT NULL,
    last_saved_at timestamp with time zone DEFAULT now()
);


--

--

ALTER TABLE public.quote_drafts ENABLE ROW LEVEL SECURITY;

--

--

CREATE POLICY "Users can manage own drafts" ON public.quote_drafts USING ((auth.uid() = user_id));


--

COMMIT;


-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.2 Quote Advanced (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Function: dispatch_quote_webhook_event() ───
--

CREATE FUNCTION public.dispatch_quote_webhook_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
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


--

COMMIT;
