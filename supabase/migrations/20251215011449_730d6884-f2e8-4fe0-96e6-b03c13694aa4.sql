-- Create table for storing generated mockups
CREATE TABLE IF NOT EXISTS public.generated_mockups (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL,
  technique_name TEXT NOT NULL,
  logo_url TEXT NOT NULL,
  mockup_url TEXT NOT NULL,
  position_x INTEGER DEFAULT 50,
  position_y INTEGER DEFAULT 50,
  logo_width_cm NUMERIC DEFAULT 5,
  logo_height_cm NUMERIC DEFAULT 3,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to generated_mockups if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='seller_id') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN seller_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='client_id') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='product_id') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN product_id UUID REFERENCES public.products(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='product_name') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN product_name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='product_sku') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN product_sku TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='technique_id') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN technique_id UUID REFERENCES public.personalization_techniques(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='technique_name') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN technique_name TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='logo_url') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN logo_url TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='mockup_url') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN mockup_url TEXT NOT NULL DEFAULT '';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='position_x') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN position_x INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='position_y') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN position_y INTEGER DEFAULT 50;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='logo_width_cm') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN logo_width_cm NUMERIC DEFAULT 5;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='generated_mockups' AND column_name='logo_height_cm') THEN
    ALTER TABLE public.generated_mockups ADD COLUMN logo_height_cm NUMERIC DEFAULT 3;
  END IF;
END $$;

-- Create index for faster queries
CREATE INDEX IF NOT EXISTS idx_generated_mockups_seller_id ON public.generated_mockups(seller_id);
CREATE INDEX IF NOT EXISTS idx_generated_mockups_client_id ON public.generated_mockups(client_id);
CREATE INDEX IF NOT EXISTS idx_generated_mockups_created_at ON public.generated_mockups(created_at DESC);

-- Enable RLS
ALTER TABLE public.generated_mockups ENABLE ROW LEVEL SECURITY;

-- Sellers can view their own mockups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_mockups' AND policyname = 'Sellers can view their own mockups') THEN
    CREATE POLICY "Sellers can view their own mockups"
    ON public.generated_mockups
    FOR SELECT
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Sellers can create their own mockups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_mockups' AND policyname = 'Sellers can create their own mockups') THEN
    CREATE POLICY "Sellers can create their own mockups"
    ON public.generated_mockups
    FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

-- Sellers can delete their own mockups
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_mockups' AND policyname = 'Sellers can delete their own mockups') THEN
    CREATE POLICY "Sellers can delete their own mockups"
    ON public.generated_mockups
    FOR DELETE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
