-- Fix: include 'converted' in allowed quote statuses (legacy data uses it)
CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval', 'converted', 'viewed') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
      RAISE EXCEPTION 'Invalid token status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'quote_approval_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded') THEN
      RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$function$;

-- ============================================================
-- Quote Negotiation Markup — schema
-- ============================================================
ALTER TABLE public.quotes
  ADD COLUMN IF NOT EXISTS negotiation_markup_percent NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS real_subtotal NUMERIC(12,2),
  ADD COLUMN IF NOT EXISTS real_discount_percent NUMERIC(5,2);

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'quotes_negotiation_markup_range') THEN
    ALTER TABLE public.quotes
      ADD CONSTRAINT quotes_negotiation_markup_range
      CHECK (negotiation_markup_percent >= 0 AND negotiation_markup_percent <= 50);
  END IF;
END $$;

-- ============================================================
-- Trigger: real discount validation
-- ============================================================
CREATE OR REPLACE FUNCTION public.validate_quote_real_discount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _markup       NUMERIC := COALESCE(NEW.negotiation_markup_percent, 0);
  _apparent_pct NUMERIC := COALESCE(NEW.discount_percent, 0);
  _presented    NUMERIC := COALESCE(NEW.subtotal, 0);
  _real_sub     NUMERIC;
  _final        NUMERIC;
  _real_pct     NUMERIC;
  _max_allowed  NUMERIC;
  _is_admin     BOOLEAN;
BEGIN
  IF _markup > 0 THEN
    _real_sub := _presented / (1 + _markup / 100);
  ELSE
    _real_sub := _presented;
  END IF;

  _final := _presented * (1 - _apparent_pct / 100);

  IF _real_sub > 0 THEN
    _real_pct := ROUND(((_real_sub - _final) / _real_sub) * 100, 2);
  ELSE
    _real_pct := 0;
  END IF;

  NEW.real_subtotal := ROUND(_real_sub, 2);
  NEW.real_discount_percent := _real_pct;

  IF NEW.status IN ('draft', 'pending') AND NEW.seller_id IS NOT NULL AND _real_pct > 0 THEN
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = NEW.seller_id AND role = 'admin'
    ) INTO _is_admin;

    IF NOT _is_admin THEN
      SELECT max_discount_percent INTO _max_allowed
      FROM public.seller_discount_limits
      WHERE user_id = NEW.seller_id;

      IF _max_allowed IS NOT NULL AND _real_pct > _max_allowed THEN
        IF NOT EXISTS (
          SELECT 1 FROM public.discount_approval_requests
          WHERE quote_id = NEW.id
            AND status = 'approved'
            AND requested_discount_percent >= _real_pct
        ) THEN
          RAISE EXCEPTION
            'Desconto real (%.2f%%) excede o limite do vendedor (%.2f%%). Solicite aprovação antes de salvar.',
            _real_pct, _max_allowed
            USING ERRCODE = 'check_violation';
        END IF;
      END IF;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_quote_real_discount ON public.quotes;
DROP TRIGGER IF EXISTS trg_validate_quote_real_discount ON public.quotes;
CREATE TRIGGER trg_validate_quote_real_discount
BEFORE INSERT OR UPDATE OF subtotal, discount_percent, negotiation_markup_percent, status
ON public.quotes
FOR EACH ROW
EXECUTE FUNCTION public.validate_quote_real_discount();

-- Backfill
UPDATE public.quotes
SET real_subtotal = subtotal,
    real_discount_percent = discount_percent
WHERE real_subtotal IS NULL;

COMMENT ON COLUMN public.quotes.negotiation_markup_percent IS
  'Margem de negociação interna (0–50%). Infla o subtotal apresentado para criar margem psicológica de desconto. Nunca exposto ao cliente.';
COMMENT ON COLUMN public.quotes.real_subtotal IS
  'Subtotal real (sem markup). Usado para auditoria e alçada.';
COMMENT ON COLUMN public.quotes.real_discount_percent IS
  'Desconto efetivo real vs real_subtotal. Usado para validar a alçada do vendedor.';