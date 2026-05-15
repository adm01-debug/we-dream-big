
DROP POLICY IF EXISTS "Users can insert own login attempts" ON public.login_attempts;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'login_attempts' AND policyname = 'Users can insert own login attempts') THEN
    CREATE POLICY "Users can insert own login attempts"
    ON public.login_attempts
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (email = (SELECT users.email FROM auth.users WHERE users.id = auth.uid())::text)
      OR (user_id = auth.uid())
    );
  END IF;
END $$;
