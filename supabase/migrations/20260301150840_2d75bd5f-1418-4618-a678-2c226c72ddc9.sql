
-- Add UPDATE policy for generated_mockups so layout capture can update layout_url
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'generated_mockups' AND policyname = 'Sellers can update their own mockups') THEN
    CREATE POLICY "Sellers can update their own mockups"
    ON public.generated_mockups
    FOR UPDATE
    USING (seller_id = auth.uid())
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;
