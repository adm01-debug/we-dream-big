-- Step 2: Update policies to include manager role
DROP POLICY IF EXISTS "Managers and admins can view all requests" ON public.password_reset_requests;
DROP POLICY IF EXISTS "Managers and admins can update requests" ON public.password_reset_requests;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'password_reset_requests' AND policyname = 'Managers and admins can view all requests') THEN
    CREATE POLICY "Managers and admins can view all requests"
    ON public.password_reset_requests
    FOR SELECT
    USING (
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
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
      has_role(auth.uid(), 'admin'::app_role) OR has_role(auth.uid(), 'manager'::app_role)
    );
  END IF;
END $$;
