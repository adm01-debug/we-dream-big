-- T30: Fix remaining auth_rls_initplan violations
-- Wraps bare current_setting() and auth.role() calls in (SELECT ...) init-plans
-- so Postgres evaluates them once per query instead of once per row.
-- Advisor target: auth_rls_initplan = 0

DO $$
BEGIN
  ALTER POLICY "color_nuances_isolation" ON public.color_nuances
    USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "color_variations_isolation" ON public.color_variations
    USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "material_groups_isolation" ON public.material_groups
    USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "product_materials_isolation" ON public.product_materials
    USING ((organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_column THEN NULL;
END $$;

DO $$
BEGIN
  ALTER POLICY "notification_templates_select" ON public.notification_templates
    USING (((SELECT auth.role()) = 'authenticated'::text));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_column THEN NULL;
END $$;

-- Remove debug probe index left over from testing
DROP INDEX IF EXISTS public.idx_test_t30c_probe;
