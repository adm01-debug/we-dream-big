
-- Validation trigger function for status fields
CREATE OR REPLACE FUNCTION public.validate_status_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate quotes.status
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'sent', 'approved', 'rejected', 'expired', 'revision') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;

  -- Validate orders.status
  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  -- Validate custom_kits.status
  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;

  -- Validate kit_share_tokens.status
  IF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
      RAISE EXCEPTION 'Invalid token status: %', NEW.status;
    END IF;
  END IF;

  -- Validate quote_approval_tokens.status
  IF TG_TABLE_NAME = 'quote_approval_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded') THEN
      RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

-- Apply triggers
DROP TRIGGER IF EXISTS trg_validate_quote_status ON public.quotes;
CREATE TRIGGER trg_validate_quote_status
  BEFORE INSERT OR UPDATE ON public.quotes
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

DROP TRIGGER IF EXISTS trg_validate_order_status ON public.orders;
CREATE TRIGGER trg_validate_order_status
  BEFORE INSERT OR UPDATE ON public.orders
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

DROP TRIGGER IF EXISTS trg_validate_kit_status ON public.custom_kits;
CREATE TRIGGER trg_validate_kit_status
  BEFORE INSERT OR UPDATE ON public.custom_kits
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

DROP TRIGGER IF EXISTS trg_validate_kit_share_token_status ON public.kit_share_tokens;
CREATE TRIGGER trg_validate_kit_share_token_status
  BEFORE INSERT OR UPDATE ON public.kit_share_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();

DROP TRIGGER IF EXISTS trg_validate_approval_token_status ON public.quote_approval_tokens;
CREATE TRIGGER trg_validate_approval_token_status
  BEFORE INSERT OR UPDATE ON public.quote_approval_tokens
  FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();
