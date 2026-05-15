-- T25b: Fix remaining auth_rls_initplan violations in material_groups
-- Policies used (SELECT auth.uid() AS uid) — advisor requires canonical (SELECT auth.uid())
-- Replacing alias form with canonical subquery to satisfy advisor.

DO $$
BEGIN
  ALTER POLICY "mg_select" ON public.material_groups
    USING (
      organization_id IN (
        SELECT material_groups.organization_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      )
    );
EXCEPTION WHEN undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_insert" ON public.material_groups
    WITH CHECK (
      organization_id IN (
        SELECT material_groups.organization_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      )
    );
EXCEPTION WHEN undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_update" ON public.material_groups
    USING (
      organization_id IN (
        SELECT material_groups.organization_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      )
    );
EXCEPTION WHEN undefined_table OR undefined_object THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_delete" ON public.material_groups
    USING (
      organization_id IN (
        SELECT material_groups.organization_id
        FROM profiles
        WHERE profiles.id = (SELECT auth.uid())
      )
    );
EXCEPTION WHEN undefined_table OR undefined_object THEN NULL;
END $$;
