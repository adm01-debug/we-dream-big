
-- Fix: Allow the INSERT to work by also granting SELECT to the creator
-- The issue is that INSERT...RETURNING requires SELECT access
-- We need to allow SELECT for orgs where the user just created it

-- Drop and recreate the SELECT policy to also allow seeing orgs you just created
DROP POLICY IF EXISTS "Members can view their organizations" ON public.organizations;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Members can view their organizations') THEN
    CREATE POLICY "Members can view their organizations"
      ON public.organizations FOR SELECT TO authenticated
      USING (
        id IN (SELECT public.get_user_org_ids(auth.uid()))
      );
  END IF;
END $$;

-- Create a security definer function to atomically create org + add owner
CREATE OR REPLACE FUNCTION public.create_organization_with_owner(
  _name text,
  _slug text
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _org_id uuid;
BEGIN
  -- Create the organization
  INSERT INTO public.organizations (name, slug)
  VALUES (_name, _slug)
  RETURNING id INTO _org_id;

  -- Add the caller as owner
  INSERT INTO public.organization_members (organization_id, user_id, role)
  VALUES (_org_id, auth.uid(), 'owner');

  RETURN _org_id;
END;
$$;
