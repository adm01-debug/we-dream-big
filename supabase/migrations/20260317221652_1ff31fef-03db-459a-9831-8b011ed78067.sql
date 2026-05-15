-- Fix 1: Restrict anonymous SELECT on quote_approval_tokens
-- Remove the overly permissive "Anyone can read by token" policy
DROP POLICY IF EXISTS "Anyone can read by token" ON public.quote_approval_tokens;

-- Create a security definer function to look up a token safely
CREATE OR REPLACE FUNCTION public.get_quote_token_by_value(_token text)
RETURNS SETOF public.quote_approval_tokens
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT * FROM public.quote_approval_tokens WHERE token = _token LIMIT 1;
$$;

-- Fix 2: Fix organization_members INSERT policy (privilege escalation)
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
      OR (NOT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.organization_id = organization_members.organization_id
      ))
    );
  END IF;
END $$;

-- Fix 3: Restrict quote_comments SELECT to own quotes or admin
DROP POLICY IF EXISTS "Authenticated users can read comments" ON public.quote_comments;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'quote_comments' AND policyname = 'Users can read own or admin comments') THEN
    CREATE POLICY "Users can read own or admin comments"
    ON public.quote_comments
    FOR SELECT
    TO authenticated
    USING (
      user_id = auth.uid()
      OR has_role(auth.uid(), 'admin'::app_role)
    );
  END IF;
END $$;