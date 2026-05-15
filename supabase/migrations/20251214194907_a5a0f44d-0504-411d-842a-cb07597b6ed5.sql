-- Create enum for quote status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'quote_status' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.quote_status AS ENUM ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired');
  END IF;
END $$;

-- Create personalization techniques table
CREATE TABLE IF NOT EXISTS public.personalization_techniques (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  code TEXT UNIQUE,
  min_quantity INTEGER DEFAULT 1,
  setup_cost NUMERIC(10,2) DEFAULT 0,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  estimated_days INTEGER DEFAULT 1,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quotes table
CREATE TABLE IF NOT EXISTS public.quotes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_number TEXT NOT NULL UNIQUE,
  client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL,
  seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  status quote_status NOT NULL DEFAULT 'draft',
  subtotal NUMERIC(12,2) DEFAULT 0,
  discount_percent NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  total NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  internal_notes TEXT,
  valid_until DATE,
  bitrix_deal_id TEXT,
  bitrix_quote_id TEXT,
  synced_to_bitrix BOOLEAN DEFAULT false,
  synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote items table
CREATE TABLE IF NOT EXISTS public.quote_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_id UUID NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id TEXT,
  product_name TEXT NOT NULL,
  product_sku TEXT,
  product_image_url TEXT,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL DEFAULT 0,
  subtotal NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  color_name TEXT,
  color_hex TEXT,
  notes TEXT,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create quote item personalizations (link items to techniques)
CREATE TABLE IF NOT EXISTS public.quote_item_personalizations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  quote_item_id UUID NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id UUID NOT NULL REFERENCES public.personalization_techniques(id) ON DELETE RESTRICT,
  colors_count INTEGER DEFAULT 1,
  positions_count INTEGER DEFAULT 1,
  area_cm2 NUMERIC(8,2),
  setup_cost NUMERIC(10,2) DEFAULT 0,
  unit_cost NUMERIC(10,2) DEFAULT 0,
  total_cost NUMERIC(12,2) DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add missing columns to quotes if created by legacy migration without them
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='quote_number') THEN
    ALTER TABLE public.quotes ADD COLUMN quote_number TEXT;
    ALTER TABLE public.quotes ADD CONSTRAINT quotes_quote_number_key UNIQUE (quote_number);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='client_id') THEN
    ALTER TABLE public.quotes ADD COLUMN client_id UUID REFERENCES public.bitrix_clients(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='seller_id') THEN
    ALTER TABLE public.quotes ADD COLUMN seller_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='updated_at') THEN
    ALTER TABLE public.quotes ADD COLUMN updated_at TIMESTAMPTZ DEFAULT NOW();
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='bitrix_deal_id') THEN
    ALTER TABLE public.quotes ADD COLUMN bitrix_deal_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='bitrix_quote_id') THEN
    ALTER TABLE public.quotes ADD COLUMN bitrix_quote_id TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='internal_notes') THEN
    ALTER TABLE public.quotes ADD COLUMN internal_notes TEXT;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='discount_percent') THEN
    ALTER TABLE public.quotes ADD COLUMN discount_percent NUMERIC(5,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='discount_amount') THEN
    ALTER TABLE public.quotes ADD COLUMN discount_amount NUMERIC(12,2) DEFAULT 0;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='synced_to_bitrix') THEN
    ALTER TABLE public.quotes ADD COLUMN synced_to_bitrix BOOLEAN DEFAULT false;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='quotes' AND column_name='synced_at') THEN
    ALTER TABLE public.quotes ADD COLUMN synced_at TIMESTAMPTZ;
  END IF;
END $$;

-- Create function to generate quote number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.quote_number := 'ORC-' || TO_CHAR(NOW(), 'YYYYMMDD') || '-' || LPAD(NEXTVAL('quote_number_seq')::TEXT, 4, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- CREATE SEQUENCE IF NOT EXISTS for quote numbers
CREATE SEQUENCE IF NOT EXISTS quote_number_seq START 1;

-- Create trigger for auto quote number
DROP TRIGGER IF EXISTS set_quote_number ON public.quotes;
CREATE TRIGGER set_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  WHEN (NEW.quote_number IS NULL OR NEW.quote_number = '')
  EXECUTE FUNCTION public.generate_quote_number();

-- Create trigger for updated_at on quotes
DROP TRIGGER IF EXISTS update_quotes_updated_at ON public.quotes;
CREATE TRIGGER update_quotes_updated_at
  BEFORE UPDATE ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on quote_items
DROP TRIGGER IF EXISTS update_quote_items_updated_at ON public.quote_items;
CREATE TRIGGER update_quote_items_updated_at
  BEFORE UPDATE ON public.quote_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create trigger for updated_at on personalization_techniques
DROP TRIGGER IF EXISTS update_personalization_techniques_updated_at ON public.personalization_techniques;
CREATE TRIGGER update_personalization_techniques_updated_at
  BEFORE UPDATE ON public.personalization_techniques
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.personalization_techniques ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for personalization_techniques (read by all authenticated, managed by admins)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_techniques' AND policyname = 'Authenticated users can view techniques') THEN
    CREATE POLICY "Authenticated users can view techniques"
      ON public.personalization_techniques FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_techniques' AND policyname = 'Admins can manage techniques') THEN
    CREATE POLICY "Admins can manage techniques"
      ON public.personalization_techniques FOR ALL
      TO authenticated
      USING (public.has_role(auth.uid(), 'admin'))
      WITH CHECK (public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS Policies for quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can view their own quotes') THEN
    CREATE POLICY "Sellers can view their own quotes"
      ON public.quotes FOR SELECT
      TO authenticated
      USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can create quotes') THEN
    CREATE POLICY "Sellers can create quotes"
      ON public.quotes FOR INSERT
      TO authenticated
      WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can update their own quotes') THEN
    CREATE POLICY "Sellers can update their own quotes"
      ON public.quotes FOR UPDATE
      TO authenticated
      USING (seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can delete their draft quotes') THEN
    CREATE POLICY "Sellers can delete their draft quotes"
      ON public.quotes FOR DELETE
      TO authenticated
      USING ((seller_id = auth.uid() AND status = 'draft') OR public.has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- RLS Policies for quote_items (inherit from quote access)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'Users can view items of accessible quotes') THEN
    CREATE POLICY "Users can view items of accessible quotes"
      ON public.quote_items FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.id = quote_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'Users can manage items of their quotes') THEN
    CREATE POLICY "Users can manage items of their quotes"
      ON public.quote_items FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.id = quote_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quotes q
          WHERE q.id = quote_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      );
  END IF;
END $$;

-- RLS Policies for quote_item_personalizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'Users can view personalizations of accessible items') THEN
    CREATE POLICY "Users can view personalizations of accessible items"
      ON public.quote_item_personalizations FOR SELECT
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quote_items qi
          JOIN public.quotes q ON q.id = qi.quote_id
          WHERE qi.id = quote_item_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'Users can manage personalizations of their items') THEN
    CREATE POLICY "Users can manage personalizations of their items"
      ON public.quote_item_personalizations FOR ALL
      TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.quote_items qi
          JOIN public.quotes q ON q.id = qi.quote_id
          WHERE qi.id = quote_item_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.quote_items qi
          JOIN public.quotes q ON q.id = qi.quote_id
          WHERE qi.id = quote_item_id
          AND (q.seller_id = auth.uid() OR public.has_role(auth.uid(), 'admin'))
        )
      );
  END IF;
END $$;

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_quotes_client_id ON public.quotes(client_id);
CREATE INDEX IF NOT EXISTS idx_quotes_seller_id ON public.quotes(seller_id);
CREATE INDEX IF NOT EXISTS idx_quotes_status ON public.quotes(status);
CREATE INDEX IF NOT EXISTS idx_quotes_bitrix_deal_id ON public.quotes(bitrix_deal_id);
CREATE INDEX IF NOT EXISTS idx_quote_items_quote_id ON public.quote_items(quote_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_personalizations_item_id ON public.quote_item_personalizations(quote_item_id);
CREATE INDEX IF NOT EXISTS idx_quote_item_personalizations_technique_id ON public.quote_item_personalizations(technique_id);