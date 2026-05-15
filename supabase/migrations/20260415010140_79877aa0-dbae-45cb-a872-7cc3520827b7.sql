
-- FIX 1: has_role function - block unauthenticated callers from querying other users' roles
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role app_role)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Block unauthenticated callers from checking other users' roles
  IF auth.uid() IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Non-admin users can only check their own role
  IF _user_id != auth.uid() THEN
    IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'admin') THEN
      RETURN FALSE;
    END IF;
  END IF;

  RETURN EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  );
END;
$$;

-- FIX 2: Realtime authorization - restrict discount_approval_requests channel
-- Sellers can only see their own requests, admins can see all
ALTER TABLE public.discount_approval_requests ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if any to avoid conflicts
DROP POLICY IF EXISTS "Sellers can view own approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Admins can view all approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Sellers can create approval requests" ON public.discount_approval_requests;
DROP POLICY IF EXISTS "Admins can update approval requests" ON public.discount_approval_requests;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Sellers can view own approval requests') THEN
    CREATE POLICY "Sellers can view own approval requests"
    ON public.discount_approval_requests
    FOR SELECT
    TO authenticated
    USING (seller_id = auth.uid() OR public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Sellers can create approval requests') THEN
    CREATE POLICY "Sellers can create approval requests"
    ON public.discount_approval_requests
    FOR INSERT
    TO authenticated
    WITH CHECK (seller_id = auth.uid());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'discount_approval_requests' AND policyname = 'Admins can update approval requests') THEN
    CREATE POLICY "Admins can update approval requests"
    ON public.discount_approval_requests
    FOR UPDATE
    TO authenticated
    USING (public.is_admin());
  END IF;
END $$;
