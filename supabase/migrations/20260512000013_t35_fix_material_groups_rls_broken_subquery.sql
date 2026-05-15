-- T35: Fix broken RLS subquery in material_groups policies
-- Bug found in T25b: policies used a correlated subquery referencing the outer
-- table's column (material_groups.organization_id) inside FROM profiles, which
-- caused the condition to always evaluate as true → cross-tenant data exposure.
-- Fix: replace the broken subquery with the standard current_setting pattern.
--
-- Wrapped in DO ... EXCEPTION to be idempotent across Preview/Prod (some
-- environments may not have the table yet — Preview builds fresh DB from
-- git migrations, but material_groups was created in PROD outside of git
-- and has no CREATE TABLE migration committed). Catches undefined_table,
-- undefined_object, undefined_function, undefined_column. Aligns with the
-- T25/T26/T30 hardening migrations.

DO $$
BEGIN
  ALTER POLICY "mg_select" ON public.material_groups
    USING (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_insert" ON public.material_groups
    WITH CHECK (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_update" ON public.material_groups
    USING (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid)
    WITH CHECK (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "mg_delete" ON public.material_groups
    USING (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function OR undefined_column THEN NULL;
END $$;
