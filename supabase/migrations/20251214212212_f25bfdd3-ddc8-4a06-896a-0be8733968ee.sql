-- Create table for saved personalization simulations
CREATE TABLE IF NOT EXISTS public.personalization_simulations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  product_unit_price NUMERIC NOT NULL DEFAULT 0,
  simulation_data JSONB NOT NULL DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.personalization_simulations ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_simulations' AND policyname = 'Sellers can view their own simulations') THEN
    CREATE POLICY "Sellers can view their own simulations"
    ON public.personalization_simulations
    FOR SELECT
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_simulations' AND policyname = 'Sellers can create their own simulations') THEN
    CREATE POLICY "Sellers can create their own simulations"
    ON public.personalization_simulations
    FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_simulations' AND policyname = 'Sellers can update their own simulations') THEN
    CREATE POLICY "Sellers can update their own simulations"
    ON public.personalization_simulations
    FOR UPDATE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_simulations' AND policyname = 'Sellers can delete their own simulations') THEN
    CREATE POLICY "Sellers can delete their own simulations"
    ON public.personalization_simulations
    FOR DELETE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS update_personalization_simulations_updated_at ON public.personalization_simulations;
CREATE TRIGGER update_personalization_simulations_updated_at
BEFORE UPDATE ON public.personalization_simulations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();