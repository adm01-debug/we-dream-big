
-- =====================================================
-- Quotes module — migrated from external CRM to local DB
-- =====================================================

-- 1) QUOTES
CREATE TABLE IF NOT EXISTS public.quotes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_number text NOT NULL DEFAULT '',
  client_id text,
  client_name text,
  client_email text,
  client_phone text,
  client_company text,
  client_cnpj text,
  seller_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'draft',
  subtotal numeric NOT NULL DEFAULT 0,
  discount_percent numeric NOT NULL DEFAULT 0,
  discount_amount numeric NOT NULL DEFAULT 0,
  total numeric NOT NULL DEFAULT 0,
  notes text,
  payment_terms text,
  delivery_time text,
  shipping_type text,
  shipping_cost numeric DEFAULT 0,
  internal_notes text,
  valid_until timestamp with time zone,
  bitrix_deal_id text,
  bitrix_quote_id text,
  synced_to_bitrix boolean DEFAULT false,
  synced_at timestamp with time zone,
  client_response text,
  client_response_at timestamp with time zone,
  client_response_notes text,
  sent_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quotes ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Sellers can manage own quotes') THEN
    CREATE POLICY "Sellers can manage own quotes" ON public.quotes
      FOR ALL TO authenticated
      USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))
      WITH CHECK (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quotes' AND policyname = 'Managers can read all quotes') THEN
    CREATE POLICY "Managers can read all quotes" ON public.quotes
      FOR SELECT TO authenticated
      USING (is_manager_or_admin());
  END IF;
END $$;

-- 2) QUOTE_ITEMS
CREATE TABLE IF NOT EXISTS public.quote_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  product_id text,
  product_name text NOT NULL,
  product_sku text,
  product_image_url text,
  quantity integer NOT NULL DEFAULT 1,
  unit_price numeric NOT NULL DEFAULT 0,
  subtotal numeric,
  color_name text,
  color_hex text,
  notes text,
  sort_order integer DEFAULT 0,
  display_order integer,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_items' AND policyname = 'Users can manage quote items via quote ownership') THEN
    CREATE POLICY "Users can manage quote items via quote ownership" ON public.quote_items
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))))
      WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_items.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))));
  END IF;
END $$;

-- 3) QUOTE_ITEM_PERSONALIZATIONS
CREATE TABLE IF NOT EXISTS public.quote_item_personalizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_item_id uuid NOT NULL REFERENCES public.quote_items(id) ON DELETE CASCADE,
  technique_id text,
  technique_name text,
  colors_count integer DEFAULT 1,
  positions_count integer DEFAULT 1,
  area_cm2 numeric,
  width_cm numeric,
  height_cm numeric,
  personalized_quantity integer,
  setup_cost numeric DEFAULT 0,
  unit_cost numeric DEFAULT 0,
  total_cost numeric DEFAULT 0,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_item_personalizations ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_item_personalizations' AND policyname = 'Users can manage personalizations via quote ownership') THEN
    CREATE POLICY "Users can manage personalizations via quote ownership" ON public.quote_item_personalizations
      FOR ALL TO authenticated
      USING (EXISTS (
        SELECT 1 FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))
      ))
      WITH CHECK (EXISTS (
        SELECT 1 FROM public.quote_items qi
        JOIN public.quotes q ON q.id = qi.quote_id
        WHERE qi.id = quote_item_personalizations.quote_item_id
        AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))
      ));
  END IF;
END $$;

-- 4) QUOTE_HISTORY
CREATE TABLE IF NOT EXISTS public.quote_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  quote_id uuid NOT NULL REFERENCES public.quotes(id) ON DELETE CASCADE,
  user_id uuid,
  action text NOT NULL,
  description text,
  field_changed text,
  old_value text,
  new_value text,
  metadata jsonb DEFAULT '{}',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_history' AND policyname = 'Users can manage history via quote ownership') THEN
    CREATE POLICY "Users can manage history via quote ownership" ON public.quote_history
      FOR ALL TO authenticated
      USING (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))))
      WITH CHECK (EXISTS (SELECT 1 FROM public.quotes q WHERE q.id = quote_history.quote_id AND (q.seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))));
  END IF;
END $$;

-- 5) QUOTE_TEMPLATES
CREATE TABLE IF NOT EXISTS public.quote_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  seller_id uuid NOT NULL,
  name text NOT NULL,
  description text,
  is_default boolean DEFAULT false,
  template_data jsonb DEFAULT '{}',
  items_data jsonb DEFAULT '[]',
  discount_percent numeric DEFAULT 0,
  discount_amount numeric DEFAULT 0,
  notes text,
  internal_notes text,
  payment_terms text,
  delivery_time text,
  validity_days integer DEFAULT 30,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.quote_templates ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_templates' AND policyname = 'Sellers can manage own templates') THEN
    CREATE POLICY "Sellers can manage own templates" ON public.quote_templates
      FOR ALL TO authenticated
      USING (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'))
      WITH CHECK (seller_id = auth.uid() OR has_role(auth.uid(), 'admin'));
  END IF;
END $$;

-- Auto-generate quote_number
CREATE OR REPLACE FUNCTION public.generate_quote_number()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  year_short text;
  max_num integer;
  new_number text;
BEGIN
  year_short := to_char(now(), 'YY');
  
  SELECT COALESCE(MAX(
    CASE WHEN split_part(quote_number, '/', 1) ~ '^\d+$'
         THEN split_part(quote_number, '/', 1)::integer
         ELSE 0 END
  ), 10000)
  INTO max_num
  FROM public.quotes
  WHERE quote_number LIKE '%/' || year_short;
  
  new_number := (max_num + 1)::text || '/' || year_short;
  
  IF NEW.quote_number IS NULL OR NEW.quote_number = '' THEN
    NEW.quote_number := new_number;
  END IF;
  
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_generate_quote_number ON public.quotes;
CREATE TRIGGER trigger_generate_quote_number
  BEFORE INSERT ON public.quotes
  FOR EACH ROW
  EXECUTE FUNCTION public.generate_quote_number();
