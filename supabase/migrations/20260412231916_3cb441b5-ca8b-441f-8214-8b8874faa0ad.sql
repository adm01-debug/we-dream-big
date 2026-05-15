
-- Fix collections: change from public to authenticated
DROP POLICY IF EXISTS "Users can manage own collections" ON public.collections;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'Users can manage own collections') THEN
    CREATE POLICY "Users can manage own collections"
    ON public.collections
    FOR ALL
    TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());
  END IF;
END $$;

-- Fix collection_items: change from public to authenticated
DROP POLICY IF EXISTS "Users can manage own collection items" ON public.collection_items;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'Users can manage own collection items') THEN
    CREATE POLICY "Users can manage own collection items"
    ON public.collection_items
    FOR ALL
    TO authenticated
    USING (EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    ))
    WITH CHECK (EXISTS (
      SELECT 1 FROM collections
      WHERE collections.id = collection_items.collection_id
      AND collections.user_id = auth.uid()
    ));
  END IF;
END $$;
