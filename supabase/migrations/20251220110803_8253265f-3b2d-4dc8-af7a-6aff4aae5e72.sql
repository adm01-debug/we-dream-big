-- Create table for quote templates
CREATE TABLE IF NOT EXISTS public.quote_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  seller_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_default BOOLEAN DEFAULT false,
  template_data JSONB NOT NULL DEFAULT '{}',
  items_data JSONB NOT NULL DEFAULT '[]',
  discount_percent NUMERIC DEFAULT 0,
  discount_amount NUMERIC DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  payment_terms TEXT,
  delivery_time TEXT,
  validity_days INTEGER DEFAULT 30,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to quote_templates if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='seller_id') THEN
    ALTER TABLE public.quote_templates ADD COLUMN seller_id UUID NOT NULL DEFAULT gen_random_uuid();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='is_default') THEN
    ALTER TABLE public.quote_templates ADD COLUMN is_default BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='template_data') THEN
    ALTER TABLE public.quote_templates ADD COLUMN template_data JSONB NOT NULL DEFAULT '{}';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='items_data') THEN
    ALTER TABLE public.quote_templates ADD COLUMN items_data JSONB NOT NULL DEFAULT '[]';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='discount_percent') THEN
    ALTER TABLE public.quote_templates ADD COLUMN discount_percent NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='discount_amount') THEN
    ALTER TABLE public.quote_templates ADD COLUMN discount_amount NUMERIC DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='internal_notes') THEN
    ALTER TABLE public.quote_templates ADD COLUMN internal_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='payment_terms') THEN
    ALTER TABLE public.quote_templates ADD COLUMN payment_terms TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='delivery_time') THEN
    ALTER TABLE public.quote_templates ADD COLUMN delivery_time TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quote_templates' AND column_name='validity_days') THEN
    ALTER TABLE public.quote_templates ADD COLUMN validity_days INTEGER DEFAULT 30;
  END IF;
END $$;

-- Enable RLS
ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can view their own templates') THEN
    CREATE POLICY "Sellers can view their own templates"
    ON public.quote_templates
    FOR SELECT
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can create their own templates') THEN
    CREATE POLICY "Sellers can create their own templates"
    ON public.quote_templates
    FOR INSERT
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can update their own templates') THEN
    CREATE POLICY "Sellers can update their own templates"
    ON public.quote_templates
    FOR UPDATE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can delete their own templates') THEN
    CREATE POLICY "Sellers can delete their own templates"
    ON public.quote_templates
    FOR DELETE
    USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_quote_templates_updated_at ON public.quote_templates;
CREATE TRIGGER update_quote_templates_updated_at
BEFORE UPDATE ON public.quote_templates
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();