
-- Block non-admin INSERT on user_roles to prevent privilege escalation
-- The existing ALL policy only covers admins; we need an explicit restrictive INSERT
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_roles' AND policyname = 'Only admins can insert roles') THEN
    CREATE POLICY "Only admins can insert roles"
    ON public.user_roles FOR INSERT TO authenticated
    WITH CHECK (
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;
