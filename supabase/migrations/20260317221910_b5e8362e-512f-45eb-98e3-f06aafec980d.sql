-- Fix 1: Remove overly permissive anon UPDATE on quote_approval_tokens
-- and restrict to specific columns via security definer function
DROP POLICY IF EXISTS "Anon can update response fields only" ON public.quote_approval_tokens;

-- Create a security definer function for safe anonymous response submission
CREATE OR REPLACE FUNCTION public.submit_quote_response(
  _token text,
  _response text,
  _response_notes text DEFAULT NULL
)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Validate response value
  IF _response NOT IN ('approved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid response value';
  END IF;

  -- Only update allowed fields on active, unexpired tokens
  UPDATE public.quote_approval_tokens
  SET 
    response = _response,
    response_notes = _response_notes,
    responded_at = now(),
    status = 'responded',
    updated_at = now()
  WHERE token = _token
    AND status = 'active'
    AND (expires_at IS NULL OR expires_at > now())
    AND responded_at IS NULL;

  RETURN FOUND;
END;
$$;

-- Fix 2: Remove the bootstrap condition from org_members INSERT policy
-- The RPC create_organization_with_owner already handles first member creation
DROP POLICY IF EXISTS "Org admins/owners can insert members" ON public.organization_members;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org admins/owners can insert members') THEN
    CREATE POLICY "Org admins/owners can insert members"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_org_role(auth.uid(), organization_id, 'owner'::org_role)
      OR has_org_role(auth.uid(), organization_id, 'admin'::org_role)
    );
  END IF;
END $$;

-- Fix 3: Restrict price history to own records or admin
DROP POLICY IF EXISTS "Authenticated users can read price history" ON public.product_price_history;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_price_history' AND policyname = 'Users can read own or admin price history') THEN
    CREATE POLICY "Users can read own or admin price history"
    ON public.product_price_history
    FOR SELECT
    TO authenticated
    USING (
      recorded_by = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;