-- Drop the existing INSERT policy
DROP POLICY IF EXISTS "Authenticated users can insert web vitals" ON public.web_vitals;

-- Recreate with explicit NOT NULL check on auth.uid()
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_vitals' AND policyname = 'Authenticated users can insert web vitals') THEN
    CREATE POLICY "Authenticated users can insert web vitals"
    ON public.web_vitals
    FOR INSERT
    TO authenticated
    WITH CHECK (
      auth.uid() IS NOT NULL
      AND user_id = auth.uid()
    );
  END IF;
END $$;
