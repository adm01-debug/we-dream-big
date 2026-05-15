
-- Tabela de fontes de fornecimento (multi-supplier por produto)
CREATE TABLE IF NOT EXISTS public.product_supplier_sources (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  supplier_id text NOT NULL,
  supplier_name text NOT NULL,
  supplier_sku text,
  cost_price numeric DEFAULT 0,
  sale_price numeric DEFAULT 0,
  lead_time_days integer,
  stock_quantity integer DEFAULT 0,
  min_order_quantity integer DEFAULT 1,
  is_preferred boolean DEFAULT false,
  is_active boolean DEFAULT true,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (product_id, supplier_id)
);

-- RLS
ALTER TABLE public.product_supplier_sources ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_supplier_sources' AND policyname = 'Authenticated users can read supplier sources') THEN
    CREATE POLICY "Authenticated users can read supplier sources"
      ON public.product_supplier_sources FOR SELECT
      TO authenticated USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_supplier_sources' AND policyname = 'Admins can manage supplier sources') THEN
    CREATE POLICY "Admins can manage supplier sources"
      ON public.product_supplier_sources FOR ALL
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role))
      WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;

-- Index para busca por produto
CREATE INDEX IF NOT EXISTS idx_product_supplier_sources_product_id ON public.product_supplier_sources (product_id);
