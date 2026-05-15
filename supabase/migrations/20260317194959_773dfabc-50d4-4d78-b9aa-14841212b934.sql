
-- Create org_role enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'org_role' AND typnamespace = 'public'::regnamespace) THEN
    CREATE TYPE public.org_role AS ENUM ('owner', 'admin', 'member');
  END IF;
END $$;

-- Organizations table
CREATE TABLE IF NOT EXISTS public.organizations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text NOT NULL UNIQUE,
  logo_url text,
  description text,
  is_active boolean NOT NULL DEFAULT true,
  settings jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Organization members table
CREATE TABLE IF NOT EXISTS public.organization_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role org_role NOT NULL DEFAULT 'member',
  invited_by uuid,
  joined_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(organization_id, user_id)
);

-- Enable RLS
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;

-- Security definer function to check org membership
CREATE OR REPLACE FUNCTION public.is_org_member(_user_id uuid, _org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id
  )
$$;

-- Security definer function to check org role
CREATE OR REPLACE FUNCTION public.has_org_role(_user_id uuid, _org_id uuid, _role org_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.organization_members
    WHERE user_id = _user_id AND organization_id = _org_id AND role = _role
  )
$$;

-- Security definer to get user's org ids (avoids recursion)
CREATE OR REPLACE FUNCTION public.get_user_org_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT organization_id FROM public.organization_members WHERE user_id = _user_id
$$;

-- RLS Policies for organizations
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Members can view their organizations') THEN
    CREATE POLICY "Members can view their organizations"
      ON public.organizations FOR SELECT TO authenticated
      USING (id IN (SELECT public.get_user_org_ids(auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Owners can update their organization') THEN
    CREATE POLICY "Owners can update their organization"
      ON public.organizations FOR UPDATE TO authenticated
      USING (public.has_org_role(auth.uid(), id, 'owner'))
      WITH CHECK (public.has_org_role(auth.uid(), id, 'owner'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organizations' AND policyname = 'Authenticated users can create organizations') THEN
    CREATE POLICY "Authenticated users can create organizations"
      ON public.organizations FOR INSERT TO authenticated
      WITH CHECK (true);
  END IF;
END $$;

-- RLS Policies for organization_members
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Members can view org members') THEN
    CREATE POLICY "Members can view org members"
      ON public.organization_members FOR SELECT TO authenticated
      USING (organization_id IN (SELECT public.get_user_org_ids(auth.uid())));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org admins/owners can insert members') THEN
    CREATE POLICY "Org admins/owners can insert members"
      ON public.organization_members FOR INSERT TO authenticated
      WITH CHECK (
        public.has_org_role(auth.uid(), organization_id, 'owner')
        OR public.has_org_role(auth.uid(), organization_id, 'admin')
        OR NOT EXISTS (SELECT 1 FROM public.organization_members WHERE organization_id = organization_members.organization_id)
      );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org owners can update members') THEN
    CREATE POLICY "Org owners can update members"
      ON public.organization_members FOR UPDATE TO authenticated
      USING (public.has_org_role(auth.uid(), organization_id, 'owner'))
      WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'owner'));
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'Org owners can delete members') THEN
    CREATE POLICY "Org owners can delete members"
      ON public.organization_members FOR DELETE TO authenticated
      USING (
        public.has_org_role(auth.uid(), organization_id, 'owner')
        OR user_id = auth.uid()
      );
  END IF;
END $$;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON public.organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON public.organization_members(organization_id);
CREATE INDEX IF NOT EXISTS idx_organizations_slug ON public.organizations(slug);
