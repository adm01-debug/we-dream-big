-- Add version column to orders for optimistic locking
ALTER TABLE public.orders 
  ADD COLUMN IF NOT EXISTS version INTEGER NOT NULL DEFAULT 1;

-- Generic version-increment trigger function
CREATE OR REPLACE FUNCTION public.increment_row_version()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Only bump version on actual data changes (not when only version itself was sent)
  IF TG_OP = 'UPDATE' AND OLD.version IS NOT DISTINCT FROM NEW.version THEN
    NEW.version := COALESCE(OLD.version, 1) + 1;
  END IF;
  RETURN NEW;
END;
$$;

-- Attach to orders
DROP TRIGGER IF EXISTS trg_orders_increment_version ON public.orders;
DROP TRIGGER IF EXISTS trg_orders_increment_version ON public.orders;
CREATE TRIGGER trg_orders_increment_version
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_row_version();

-- Attach to quotes (column already existed but had no auto-increment)
DROP TRIGGER IF EXISTS trg_quotes_increment_version ON public.quotes;
DROP TRIGGER IF EXISTS trg_quotes_increment_version ON public.quotes;
CREATE TRIGGER trg_quotes_increment_version
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.increment_row_version();