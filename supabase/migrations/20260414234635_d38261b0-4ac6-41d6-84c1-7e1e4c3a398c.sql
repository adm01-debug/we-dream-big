
CREATE OR REPLACE FUNCTION public.validate_status_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval') THEN
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
