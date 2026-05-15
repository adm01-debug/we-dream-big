
-- Ensure recorded_by column exists if table was created by legacy migration without it
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema='public' AND table_name='product_price_history' AND column_name='recorded_by') THEN
    ALTER TABLE public.product_price_history ADD COLUMN recorded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL;
  END IF;
END $$;

DROP POLICY IF EXISTS "Authenticated users can insert price history" ON public.product_price_history;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Users can insert own price records') THEN
    CREATE POLICY "Users can insert own price records"
      ON public.product_price_history FOR INSERT
      TO authenticated
      WITH CHECK (recorded_by = auth.uid());
  END IF;
END $$;
