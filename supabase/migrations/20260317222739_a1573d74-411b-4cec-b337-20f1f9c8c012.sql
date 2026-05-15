-- Fix: Split org_members INSERT policy so admins can only assign 'member' role
DROP POLICY IF EXISTS "Org admins/owners can insert members" ON public.organization_members;

-- Owners can insert members with any role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org owners can insert members any role') THEN
    CREATE POLICY "Org owners can insert members any role"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_org_role(auth.uid(), organization_id, 'owner'::org_role)
    );
  END IF;
END $$;

-- Admins can only insert members with 'member' role (no escalation)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org admins can insert members only') THEN
    CREATE POLICY "Org admins can insert members only"
    ON public.organization_members
    FOR INSERT
    TO authenticated
    WITH CHECK (
      has_org_role(auth.uid(), organization_id, 'admin'::org_role)
      AND role = 'member'::org_role
    );
  END IF;
END $$;
