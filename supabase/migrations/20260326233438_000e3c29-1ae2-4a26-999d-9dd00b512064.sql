DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'web_vitals' AND policyname = 'Users can read own web vitals') THEN
    CREATE POLICY "Users can read own web vitals"
    ON public.web_vitals
    FOR SELECT
    TO authenticated
    USING (user_id = auth.uid());
  END IF;
END $$;
