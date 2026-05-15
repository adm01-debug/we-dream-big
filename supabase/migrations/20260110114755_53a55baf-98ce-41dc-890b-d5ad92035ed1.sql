-- Fix infinite recursion: password_reset_requests policies query profiles which triggers profiles RLS
-- Solution: Use has_role() function instead of direct profiles query
-- Note: app_role enum only has 'admin' and 'vendedor' - managers check via profiles.role text field

-- Drop the problematic policies (if they still exist after partial run)
DROP POLICY IF EXISTS "Managers and admins can view all requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Managers and admins can update requests" ON public.password_reset_requests;

-- Recreate policies using has_role() for admin check only
-- Since 'manager' is not in app_role enum, we just check for admin
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'password_reset_requests' AND policyname = 'Managers and admins can view all requests') THEN
    CREATE POLICY "Managers and admins can view all requests"
    ON public.password_reset_requests
    FOR SELECT
    USING (
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'password_reset_requests' AND policyname = 'Managers and admins can update requests') THEN
    CREATE POLICY "Managers and admins can update requests"
    ON public.password_reset_requests
    FOR UPDATE
    USING (
      has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;
