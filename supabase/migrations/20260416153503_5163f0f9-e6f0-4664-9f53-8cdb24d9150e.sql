-- Commission rules table
CREATE TABLE IF NOT EXISTS public.commission_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  commission_percent NUMERIC(5,2) NOT NULL DEFAULT 5.00,
  min_order_value NUMERIC(12,2) DEFAULT 0,
  max_order_value NUMERIC(12,2),
  is_default BOOLEAN NOT NULL DEFAULT false,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Commission entries table
CREATE TABLE IF NOT EXISTS public.commission_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  order_id UUID REFERENCES public.orders(id) ON DELETE SET NULL,
  seller_id UUID NOT NULL,
  order_total NUMERIC(12,2) NOT NULL DEFAULT 0,
  commission_percent NUMERIC(5,2) NOT NULL,
  commission_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'pending',
  paid_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.commission_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.commission_entries ENABLE ROW LEVEL SECURITY;

-- RLS: commission_rules
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commission_rules' AND policyname = 'Admins can manage commission rules') THEN
    CREATE POLICY "Admins can manage commission rules"
    ON public.commission_rules FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commission_rules' AND policyname = 'Sellers can view their own commission rules') THEN
    CREATE POLICY "Sellers can view their own commission rules"
    ON public.commission_rules FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid() OR is_default = true);
  END IF;
END $$;

-- RLS: commission_entries
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commission_entries' AND policyname = 'Admins can manage all commission entries') THEN
    CREATE POLICY "Admins can manage all commission entries"
    ON public.commission_entries FOR ALL
    TO authenticated
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commission_entries' AND policyname = 'Sellers can view their own commissions') THEN
    CREATE POLICY "Sellers can view their own commissions"
    ON public.commission_entries FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid());
  END IF;
END $$;

-- Status validation trigger
CREATE OR REPLACE FUNCTION public.validate_commission_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status NOT IN ('pending', 'approved', 'paid', 'cancelled') THEN
    RAISE EXCEPTION 'Invalid commission status: %', NEW.status;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_validate_commission_status ON public.commission_entries;
CREATE TRIGGER trg_validate_commission_status
BEFORE INSERT OR UPDATE ON public.commission_entries
FOR EACH ROW EXECUTE FUNCTION public.validate_commission_status();

-- Updated_at triggers
DROP TRIGGER IF EXISTS update_commission_rules_updated_at ON public.commission_rules;
CREATE TRIGGER update_commission_rules_updated_at
BEFORE UPDATE ON public.commission_rules
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_commission_entries_updated_at ON public.commission_entries;
CREATE TRIGGER update_commission_entries_updated_at
BEFORE UPDATE ON public.commission_entries
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default commission rule
INSERT INTO public.commission_rules (commission_percent, is_default, is_active)
VALUES (5.00, true, true);