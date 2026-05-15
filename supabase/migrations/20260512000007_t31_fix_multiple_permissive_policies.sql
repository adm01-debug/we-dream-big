-- T31: Fix multiple_permissive_policies violations (56 issues)
-- Strategy:
--   • Drop redundant service_role policies (service_role bypasses RLS)
--   • Split FOR ALL policies into INSERT + UPDATE + DELETE to eliminate
--     duplicate SELECT-command permissive policies
--   • Merge conflicting SELECT-only pairs into a single policy

-- ── Drop service_role policies (redundant — service_role has bypassrls) ─────

DO $$ BEGIN
  DROP POLICY IF EXISTS "color_groups_service_role" ON public.color_groups;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "material_groups_service_role" ON public.material_groups;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "pi_all_service" ON public.product_images;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "pv_all_service" ON public.product_videos;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── ai_usage_quotas: split admin_write ALL → INSERT + UPDATE + DELETE ───────

DO $$ BEGIN
  DROP POLICY IF EXISTS "ai_usage_quotas_admin_write" ON public.ai_usage_quotas;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_quotas' AND policyname = 'ai_usage_quotas_admin_insert') THEN
    CREATE POLICY "ai_usage_quotas_admin_insert" ON public.ai_usage_quotas
      FOR INSERT WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_quotas' AND policyname = 'ai_usage_quotas_admin_update') THEN
    CREATE POLICY "ai_usage_quotas_admin_update" ON public.ai_usage_quotas
      FOR UPDATE
      USING  (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role))
      WITH CHECK (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ai_usage_quotas' AND policyname = 'ai_usage_quotas_admin_delete') THEN
    CREATE POLICY "ai_usage_quotas_admin_delete" ON public.ai_usage_quotas
      FOR DELETE USING (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── collection_items: split manage ALL → INSERT + UPDATE + DELETE ────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own collection items" ON public.collection_items;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'collection_items_own_insert') THEN
    CREATE POLICY "collection_items_own_insert" ON public.collection_items
      FOR INSERT TO authenticated WITH CHECK (
        EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id
                AND collections.user_id = (SELECT auth.uid()))
      );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'collection_items_own_update') THEN
    CREATE POLICY "collection_items_own_update" ON public.collection_items
      FOR UPDATE TO authenticated
      USING (EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id
                     AND collections.user_id = (SELECT auth.uid())))
      WITH CHECK (EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id
                          AND collections.user_id = (SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collection_items' AND policyname = 'collection_items_own_delete') THEN
    CREATE POLICY "collection_items_own_delete" ON public.collection_items
      FOR DELETE TO authenticated USING (
        EXISTS (SELECT 1 FROM collections WHERE collections.id = collection_items.collection_id
                AND collections.user_id = (SELECT auth.uid()))
      );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── collections: split manage ALL → INSERT + UPDATE + DELETE ────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can manage own collections" ON public.collections;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'collections_own_insert') THEN
    CREATE POLICY "collections_own_insert" ON public.collections
      FOR INSERT TO authenticated WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'collections_own_update') THEN
    CREATE POLICY "collections_own_update" ON public.collections
      FOR UPDATE TO authenticated
      USING  (user_id = (SELECT auth.uid()))
      WITH CHECK (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'collections' AND policyname = 'collections_own_delete') THEN
    CREATE POLICY "collections_own_delete" ON public.collections
      FOR DELETE TO authenticated USING (user_id = (SELECT auth.uid()));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── color_groups: split isolation ALL → INSERT + UPDATE + DELETE ─────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "color_groups_isolation" ON public.color_groups;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'color_groups' AND policyname = 'color_groups_isolation_insert') THEN
    CREATE POLICY "color_groups_isolation_insert" ON public.color_groups
      FOR INSERT WITH CHECK (
        organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
      );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'color_groups' AND policyname = 'color_groups_isolation_update') THEN
    CREATE POLICY "color_groups_isolation_update" ON public.color_groups
      FOR UPDATE
      USING  (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid)
      WITH CHECK (organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid);
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'color_groups' AND policyname = 'color_groups_isolation_delete') THEN
    CREATE POLICY "color_groups_isolation_delete" ON public.color_groups
      FOR DELETE USING (
        organization_id = (SELECT current_setting('app.current_org_id'::text, true))::uuid
      );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── commemorative_date_colors: split admin ALL → INSERT + UPDATE + DELETE ────

DO $$ BEGIN
  DROP POLICY IF EXISTS "cdc_admin_or_above" ON public.commemorative_date_colors;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_colors' AND policyname = 'cdc_admin_insert') THEN
    CREATE POLICY "cdc_admin_insert" ON public.commemorative_date_colors
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_colors' AND policyname = 'cdc_admin_update') THEN
    CREATE POLICY "cdc_admin_update" ON public.commemorative_date_colors
      FOR UPDATE
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_colors' AND policyname = 'cdc_admin_delete') THEN
    CREATE POLICY "cdc_admin_delete" ON public.commemorative_date_colors
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── commemorative_date_exclusions: split admin ALL → INSERT + UPDATE + DELETE ─

DO $$ BEGIN
  DROP POLICY IF EXISTS "cde_admin_or_above" ON public.commemorative_date_exclusions;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_exclusions' AND policyname = 'cde_admin_insert') THEN
    CREATE POLICY "cde_admin_insert" ON public.commemorative_date_exclusions
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_exclusions' AND policyname = 'cde_admin_update') THEN
    CREATE POLICY "cde_admin_update" ON public.commemorative_date_exclusions
      FOR UPDATE
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_date_exclusions' AND policyname = 'cde_admin_delete') THEN
    CREATE POLICY "cde_admin_delete" ON public.commemorative_date_exclusions
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── commemorative_dates: split admin ALL → INSERT + UPDATE + DELETE ──────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage commemorative dates" ON public.commemorative_dates;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_dates' AND policyname = 'commemorative_dates_admin_insert') THEN
    CREATE POLICY "commemorative_dates_admin_insert" ON public.commemorative_dates
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_dates' AND policyname = 'commemorative_dates_admin_update') THEN
    CREATE POLICY "commemorative_dates_admin_update" ON public.commemorative_dates
      FOR UPDATE
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'commemorative_dates' AND policyname = 'commemorative_dates_admin_delete') THEN
    CREATE POLICY "commemorative_dates_admin_delete" ON public.commemorative_dates
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── material_groups: drop overlapping ALL policy (mg_* policies already cover) ─

DO $$ BEGIN
  DROP POLICY IF EXISTS "material_groups_isolation" ON public.material_groups;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;

-- ── variant_commemorative_dates: split admin ALL → INSERT + UPDATE + DELETE ──

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins or above manage variant commemorative dates" ON public.variant_commemorative_dates;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variant_commemorative_dates' AND policyname = 'vcd_admin_insert') THEN
    CREATE POLICY "vcd_admin_insert" ON public.variant_commemorative_dates
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variant_commemorative_dates' AND policyname = 'vcd_admin_update') THEN
    CREATE POLICY "vcd_admin_update" ON public.variant_commemorative_dates
      FOR UPDATE
      USING (is_admin_or_above((SELECT auth.uid())))
      WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'variant_commemorative_dates' AND policyname = 'vcd_admin_delete') THEN
    CREATE POLICY "vcd_admin_delete" ON public.variant_commemorative_dates
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── product_images: merge two SELECT policies into one ───────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "pi_select_auth" ON public.product_images;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_images_select_public" ON public.product_images;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_images' AND policyname = 'product_images_select') THEN
    CREATE POLICY "product_images_select" ON public.product_images
      FOR SELECT USING ((is_active = true) OR ((SELECT auth.uid()) IS NOT NULL));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── product_videos: merge two SELECT policies into one ───────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "pv_select_auth" ON public.product_videos;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_videos_select_public" ON public.product_videos;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'product_videos' AND policyname = 'product_videos_select') THEN
    CREATE POLICY "product_videos_select" ON public.product_videos
      FOR SELECT USING ((is_active = true) OR ((SELECT auth.uid()) IS NOT NULL));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;

-- ── profiles: merge two SELECT policies into one ─────────────────────────────

DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$ BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON public.profiles;
EXCEPTION WHEN undefined_table THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'profiles' AND policyname = 'profiles_select') THEN
    CREATE POLICY "profiles_select" ON public.profiles
      FOR SELECT USING (
        ((SELECT auth.uid()) = id) OR is_admin_or_above((SELECT auth.uid()))
      );
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function OR undefined_column THEN NULL;
END $$;
