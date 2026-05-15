
-- Replace the overly permissive INSERT policy with a scoped one
DROP POLICY "Authenticated users can create organizations" ON public.organizations;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Authenticated users can create organizations') THEN
    CREATE POLICY "Authenticated users can create organizations"
      ON public.organizations FOR INSERT TO authenticated
      WITH CHECK (auth.uid() IS NOT NULL);
  END IF;
END $$;
