-- Auto-generate commission entry on order creation
CREATE OR REPLACE FUNCTION public.auto_create_commission_entry()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _rule RECORD;
  _percent NUMERIC(5,2);
  _amount NUMERIC(12,2);
BEGIN
  -- Only on INSERT
  IF TG_OP != 'INSERT' THEN
    RETURN NEW;
  END IF;

  -- Skip cancelled orders
  IF NEW.status = 'cancelled' THEN
    RETURN NEW;
  END IF;

  -- Find seller-specific rule first
  SELECT commission_percent INTO _percent
  FROM public.commission_rules
  WHERE seller_id = NEW.seller_id
    AND is_active = true
    AND (NEW.total >= COALESCE(min_order_value, 0))
    AND (max_order_value IS NULL OR NEW.total <= max_order_value)
  ORDER BY commission_percent DESC
  LIMIT 1;

  -- Fall back to default rule
  IF _percent IS NULL THEN
    SELECT commission_percent INTO _percent
    FROM public.commission_rules
    WHERE is_default = true
      AND is_active = true
      AND (NEW.total >= COALESCE(min_order_value, 0))
      AND (max_order_value IS NULL OR NEW.total <= max_order_value)
    LIMIT 1;
  END IF;

  -- If no rule found, skip
  IF _percent IS NULL OR _percent = 0 THEN
    RETURN NEW;
  END IF;

  _amount := (COALESCE(NEW.total, 0) * _percent) / 100;

  INSERT INTO public.commission_entries (
    order_id, seller_id, order_total, commission_percent, commission_amount, status
  ) VALUES (
    NEW.id, NEW.seller_id, COALESCE(NEW.total, 0), _percent, _amount, 'pending'
  );

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_commission_on_order ON public.orders;
CREATE TRIGGER trg_auto_commission_on_order
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.auto_create_commission_entry();