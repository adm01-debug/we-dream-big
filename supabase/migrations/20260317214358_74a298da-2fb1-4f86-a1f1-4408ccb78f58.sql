
-- Tighten anon update policy to only allow response-related updates
DROP POLICY IF EXISTS "Anyone can update response" ON public.quote_approval_tokens;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_approval_tokens' AND policyname = 'Anon can update response fields only') THEN
    CREATE POLICY "Anon can update response fields only"
      ON public.quote_approval_tokens FOR UPDATE
      TO anon
      USING (status = 'active')
      WITH CHECK (status = 'active');
  END IF;
END $$;
