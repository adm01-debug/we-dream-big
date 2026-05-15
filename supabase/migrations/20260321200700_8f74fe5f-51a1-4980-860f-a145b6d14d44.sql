
-- Fix #1: Allow sellers to see their own order_items (via future orders table linkage)
-- For now, allow all authenticated users to read order_items
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'Sellers can read order items') THEN
    CREATE POLICY "Sellers can read order items"
    ON public.order_items
    FOR SELECT
    TO authenticated
    USING (true);
  END IF;
END $$;

-- Fix #2: Allow sellers to read comments on their own quotes
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Sellers can read comments on own quotes') THEN
    CREATE POLICY "Sellers can read comments on own quotes"
    ON public.quote_comments
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM public.quotes q
        WHERE q.id::text = quote_comments.quote_id::text
        AND q.seller_id::text = auth.uid()::text
      )
    );
  END IF;
END $$;
