
CREATE TABLE IF NOT EXISTS public.product_price_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id text NOT NULL,
  product_sku text,
  product_name text,
  old_price numeric,
  new_price numeric NOT NULL,
  price_change_percent numeric GENERATED ALWAYS AS (
    CASE WHEN old_price IS NOT NULL AND old_price > 0 
      THEN ROUND(((new_price - old_price) / old_price) * 100, 2)
      ELSE NULL 
    END
  ) STORED,
  recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source text NOT NULL DEFAULT 'sync',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_price_history_product ON public.product_price_history(product_id);
CREATE INDEX IF NOT EXISTS idx_price_history_created ON public.product_price_history(created_at DESC);

ALTER TABLE public.product_price_history ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Authenticated users can read price history') THEN
    CREATE POLICY "Authenticated users can read price history"
      ON public.product_price_history FOR SELECT
      TO authenticated
      USING (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Authenticated users can insert price history') THEN
    CREATE POLICY "Authenticated users can insert price history"
      ON public.product_price_history FOR INSERT
      TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Admins can delete price history') THEN
    CREATE POLICY "Admins can delete price history"
      ON public.product_price_history FOR DELETE
      TO authenticated
      USING (has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
