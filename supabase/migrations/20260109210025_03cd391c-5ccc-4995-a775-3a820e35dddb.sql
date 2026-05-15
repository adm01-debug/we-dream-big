-- Fix infinite recursion involving roles RLS policy referencing profiles

-- Ensure RLS is enabled (idempotent)
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

-- Remove policy that queries profiles inside roles policy (causes recursion)
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.roles;

-- Admins can manage roles (no self-referencing subqueries)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'roles' AND policyname = 'Admins can manage roles') THEN
    CREATE POLICY "Admins can manage roles"
    ON public.roles
    FOR ALL
    USING (public.has_role(auth.uid(), 'admin'::app_role))
    WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));
  END IF;
END $$;
