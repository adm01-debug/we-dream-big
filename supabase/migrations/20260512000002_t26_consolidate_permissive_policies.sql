-- T26: Consolidate multiple_permissive_policies
-- Merges redundant SELECT policy pairs into single policies.
-- Each table section: DROP redundant policy → ALTER remaining to cover merged condition.
-- Advisor target: multiple_permissive_policies ≤ 30 (down from 111).

-- ─────────────────────────────────────────────
-- ai_usage_logs: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "ai_usage_logs_admin_all" ON public.ai_usage_logs;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_usage_logs_user_own" ON public.ai_usage_logs
    USING (
      (is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'supervisor'::app_role))
      OR (user_id = (SELECT auth.uid()))
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- categories: public_read=true subsumes org-member check
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "categories_select" ON public.categories;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- conversation_audit_logs: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins e Managers podem ver todos os logs de conversa" ON public.conversation_audit_logs;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Usuários podem ver seus próprios logs de conversa" ON public.conversation_audit_logs
    USING (
      (has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'manager'::app_role))
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- conversation_delivery_status: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins read all delivery status" ON public.conversation_delivery_status;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own delivery status" ON public.conversation_delivery_status
    USING (
      is_supervisor_or_above((SELECT auth.uid()))
      OR (EXISTS (
        SELECT 1 FROM (conversation_event_history e
          JOIN conversation_audit_logs a ON (a.id = e.conversation_id))
        WHERE (e.id = conversation_delivery_status.event_id AND a.user_id = (SELECT auth.uid()))
      ))
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- file_scan_logs: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read file_scan_logs" ON public.file_scan_logs;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own file_scan_logs" ON public.file_scan_logs
    USING (
      is_admin_or_above((SELECT auth.uid()))
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- mcp_full_grantors: ALL+SELECT → split ALL to writes, merge SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins manage mcp_full_grantors" ON public.mcp_full_grantors;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'mcp_full_grantors_admin_write') THEN
    CREATE POLICY "mcp_full_grantors_admin_write" ON public.mcp_full_grantors
      FOR INSERT WITH CHECK (is_admin_strict((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'mcp_full_grantors_admin_update') THEN
    CREATE POLICY "mcp_full_grantors_admin_update" ON public.mcp_full_grantors
      FOR UPDATE USING (is_admin_strict((SELECT auth.uid()))) WITH CHECK (is_admin_strict((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mcp_full_grantors' AND policyname = 'mcp_full_grantors_admin_delete') THEN
    CREATE POLICY "mcp_full_grantors_admin_delete" ON public.mcp_full_grantors
      FOR DELETE USING (is_admin_strict((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- Existing "Devs read mcp_full_grantors" SELECT policy kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- mockup_credits: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "mc_admin_manage" ON public.mockup_credits;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_credits' AND policyname = 'mc_admin_insert') THEN
    CREATE POLICY "mc_admin_insert" ON public.mockup_credits
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_credits' AND policyname = 'mc_admin_update') THEN
    CREATE POLICY "mc_admin_update" ON public.mockup_credits
      FOR UPDATE USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_credits' AND policyname = 'mc_admin_delete') THEN
    CREATE POLICY "mc_admin_delete" ON public.mockup_credits
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- mc_select_own_or_coord kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- mockup_templates: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "mt_admin_manage" ON public.mockup_templates;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'mt_admin_insert') THEN
    CREATE POLICY "mt_admin_insert" ON public.mockup_templates
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'mt_admin_update') THEN
    CREATE POLICY "mt_admin_update" ON public.mockup_templates
      FOR UPDATE USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'mockup_templates' AND policyname = 'mt_admin_delete') THEN
    CREATE POLICY "mt_admin_delete" ON public.mockup_templates
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- mt_select_active_or_admin kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- organization_members: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins manage org members" ON public.organization_members;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'org_members_admin_insert') THEN
    CREATE POLICY "org_members_admin_insert" ON public.organization_members
      FOR INSERT WITH CHECK (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'org_members_admin_update') THEN
    CREATE POLICY "org_members_admin_update" ON public.organization_members
      FOR UPDATE USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'organization_members' AND policyname = 'org_members_admin_delete') THEN
    CREATE POLICY "org_members_admin_delete" ON public.organization_members
      FOR DELETE USING (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Members view own org memberships" SELECT kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- permissions: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Devs manage permissions" ON public.permissions;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions' AND policyname = 'permissions_dev_insert') THEN
    CREATE POLICY "permissions_dev_insert" ON public.permissions
      FOR INSERT WITH CHECK (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions' AND policyname = 'permissions_dev_update') THEN
    CREATE POLICY "permissions_dev_update" ON public.permissions
      FOR UPDATE USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'permissions' AND policyname = 'permissions_dev_delete') THEN
    CREATE POLICY "permissions_dev_delete" ON public.permissions
      FOR DELETE USING (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Authenticated read permissions" SELECT kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- personalization_techniques: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "pt_admin_manage" ON public.personalization_techniques;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_techniques' AND policyname = 'pt_admin_insert') THEN
    CREATE POLICY "pt_admin_insert" ON public.personalization_techniques
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_techniques' AND policyname = 'pt_admin_update') THEN
    CREATE POLICY "pt_admin_update" ON public.personalization_techniques
      FOR UPDATE USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'personalization_techniques' AND policyname = 'pt_admin_delete') THEN
    CREATE POLICY "pt_admin_delete" ON public.personalization_techniques
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- pt_select_active_or_admin kept as sole SELECT policy

-- ─────────────────────────────────────────────
-- product_images: true-SELECT subsumes org-member SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_images_select" ON public.product_images;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- pi_select_auth (true for authenticated) + product_images_select_public (is_active=true) kept
-- product_images_select (org-member check) is subsumed by pi_select_auth=true

-- ─────────────────────────────────────────────
-- product_relationships: public_read=true subsumes org SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_relationships_select_org" ON public.product_relationships;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- product_variants: public_read=true subsumes org SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_variants_select" ON public.product_variants;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- product_videos: authenticated=true subsumes others for authenticated users
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "product_videos_select" ON public.product_videos;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- pv_select_auth (true for authenticated) kept; product_videos_select_public kept for anon

-- ─────────────────────────────────────────────
-- product_views: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can read all views" ON public.product_views;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own views" ON public.product_views
    USING (
      is_admin((SELECT auth.uid()))
      OR (seller_id = (SELECT auth.uid()))
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- products: public_read=true subsumes org-member SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "products_select" ON public.products;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- ramo_atividade: ALL+SELECT=true → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "ra_admin_manage" ON public.ramo_atividade;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade' AND policyname = 'ra_admin_insert') THEN
    CREATE POLICY "ra_admin_insert" ON public.ramo_atividade
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade' AND policyname = 'ra_admin_update') THEN
    CREATE POLICY "ra_admin_update" ON public.ramo_atividade
      FOR UPDATE USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade' AND policyname = 'ra_admin_delete') THEN
    CREATE POLICY "ra_admin_delete" ON public.ramo_atividade
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- ra_select_authenticated (true) kept

-- ─────────────────────────────────────────────
-- ramo_atividade_filho: ALL+SELECT=true → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "raf_admin_manage" ON public.ramo_atividade_filho;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade_filho' AND policyname = 'raf_admin_insert') THEN
    CREATE POLICY "raf_admin_insert" ON public.ramo_atividade_filho
      FOR INSERT WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade_filho' AND policyname = 'raf_admin_update') THEN
    CREATE POLICY "raf_admin_update" ON public.ramo_atividade_filho
      FOR UPDATE USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'ramo_atividade_filho' AND policyname = 'raf_admin_delete') THEN
    CREATE POLICY "raf_admin_delete" ON public.ramo_atividade_filho
      FOR DELETE USING (is_admin_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- raf_select_authenticated (true) kept

-- ─────────────────────────────────────────────
-- rls_denial_log: exact duplicate SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "rls_denial_log_select_policy" ON public.rls_denial_log;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Admins read rls denials" is the canonical SELECT; identical condition dropped

-- ─────────────────────────────────────────────
-- role_permissions: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Devs manage role_permissions" ON public.role_permissions;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'role_permissions_dev_insert') THEN
    CREATE POLICY "role_permissions_dev_insert" ON public.role_permissions
      FOR INSERT WITH CHECK (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'role_permissions_dev_update') THEN
    CREATE POLICY "role_permissions_dev_update" ON public.role_permissions
      FOR UPDATE USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'role_permissions' AND policyname = 'role_permissions_dev_delete') THEN
    CREATE POLICY "role_permissions_dev_delete" ON public.role_permissions
      FOR DELETE USING (is_dev((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Authenticated read role_permissions" SELECT kept

-- ─────────────────────────────────────────────
-- step_up_audit_log: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Devs can view all audit logs" ON public.step_up_audit_log;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own audit logs" ON public.step_up_audit_log
    USING (
      is_dev((SELECT auth.uid()))
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- supplier_colors: public_read=true subsumes org SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "supplier_colors_select_org" ON public.supplier_colors;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- suppliers: authenticated_read=true subsumes org SELECT
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "suppliers_select" ON public.suppliers;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- user_comparisons: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "anyone_read_public_comparisons" ON public.user_comparisons;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "users_select_own_comparisons" ON public.user_comparisons
    USING (
      ((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now())))
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- user_roles: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Coord and above read all roles" ON public.user_roles;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own roles" ON public.user_roles
    USING (
      is_coord_or_above((SELECT auth.uid()))
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- ─────────────────────────────────────────────
-- user_token_revocations: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Supervisors can manage revocations" ON public.user_token_revocations;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_token_revocations' AND policyname = 'revocations_supervisor_insert') THEN
    CREATE POLICY "revocations_supervisor_insert" ON public.user_token_revocations
      FOR INSERT WITH CHECK (is_supervisor_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_token_revocations' AND policyname = 'revocations_supervisor_update') THEN
    CREATE POLICY "revocations_supervisor_update" ON public.user_token_revocations
      FOR UPDATE USING (is_supervisor_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'user_token_revocations' AND policyname = 'revocations_supervisor_delete') THEN
    CREATE POLICY "revocations_supervisor_delete" ON public.user_token_revocations
      FOR DELETE USING (is_supervisor_or_above((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Users can view own revocation" SELECT kept

-- ─────────────────────────────────────────────
-- video_variant_links: ALL+SELECT → split ALL to writes
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can manage video variant links" ON public.video_variant_links;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_variant_links' AND policyname = 'vvl_admin_insert') THEN
    CREATE POLICY "vvl_admin_insert" ON public.video_variant_links
      FOR INSERT WITH CHECK (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_variant_links' AND policyname = 'vvl_admin_update') THEN
    CREATE POLICY "vvl_admin_update" ON public.video_variant_links
      FOR UPDATE USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'video_variant_links' AND policyname = 'vvl_admin_delete') THEN
    CREATE POLICY "vvl_admin_delete" ON public.video_variant_links
      FOR DELETE USING (is_admin((SELECT auth.uid())));
  END IF;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
-- "Authenticated users can read video variant links" SELECT kept

-- ─────────────────────────────────────────────
-- voice_command_logs: merge 2 SELECT policies
-- ─────────────────────────────────────────────
DO $$ BEGIN
  DROP POLICY IF EXISTS "Admins can view all voice logs" ON public.voice_command_logs;
EXCEPTION WHEN undefined_table OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own voice logs" ON public.voice_command_logs
    USING (
      is_manager_or_admin()
      OR ((SELECT auth.uid()) = user_id)
    );
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;

-- Tables not fixed in this migration (require schema-level review before consolidation):
-- ai_usage_quotas (ALL overlaps SELECT with different semantics)
-- collection_items (ALL with subquery + public SELECT)
-- collections (ALL with user_id check + public share SELECT)
-- color_groups (isolation ALL + public_read SELECT)
-- commemorative_date_colors, commemorative_date_exclusions (handled by cdc/cde_select=true)
-- commemorative_dates (admin ALL + public SELECT)
-- material_groups (isolation ALL + public read)
-- profiles (2 SELECT with different qualifiers — intentional split)
-- rls_denial_log remaining SELECT policies
-- variant_commemorative_dates (admin ALL + public SELECT)
