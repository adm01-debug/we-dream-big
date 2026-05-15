-- Bootstrap: create organizations and user_organizations stubs so that
-- subsequent 2025 migrations can add organization_id FK columns and
-- create org-scoped RLS policies. The 2026 migration that creates
-- organizations properly uses CREATE TABLE IF NOT EXISTS and
-- CREATE OR REPLACE FUNCTION, so these stubs are silently superseded.

CREATE TABLE IF NOT EXISTS public.organizations (
  id   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL DEFAULT '',
  slug text NOT NULL DEFAULT ''
);

CREATE TABLE IF NOT EXISTS public.user_organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  user_id         uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role            text NOT NULL DEFAULT 'member',
  created_at      timestamptz NOT NULL DEFAULT now(),
  UNIQUE (organization_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_user_organizations_org  ON public.user_organizations(organization_id);
CREATE INDEX IF NOT EXISTS idx_user_organizations_user ON public.user_organizations(user_id);

-- Helper functions used by RLS policies throughout the 2025 migration set.
-- The 2026 org migration may CREATE OR REPLACE with richer implementations.

CREATE OR REPLACE FUNCTION public.user_is_org_member(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('admin', 'owner')
  );
$$;

CREATE OR REPLACE FUNCTION public.is_org_owner_or_admin(org_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_organizations
    WHERE organization_id = org_id
      AND user_id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;
