-- T25: Fix auth_rls_initplan — replace bare auth.uid() with (SELECT auth.uid())
-- Forcing the planner to evaluate auth.uid() once per query (not per row).
-- Gain: 10–100x on large tables with many policies calling auth.uid() per row.
-- Reference: https://supabase.com/docs/guides/database/postgres/row-level-security#call-functions-with-select
-- Generated: 2026-05-12 | Policies fixed: 270



DO $$
BEGIN
  ALTER POLICY "_unif_pending_log_dev_only" ON public."_unif_pending_log" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "_unif_settings_arquivo_dev_only" ON public."_unif_settings_arquivo" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins e Devs podem atualizar configurações de segurança" ON public."access_security_settings" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role))) WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins e Devs podem visualizar configurações de segurança" ON public."access_security_settings" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins or above can insert audit entries" ON public."admin_audit_log" WITH CHECK ((is_admin_or_above((SELECT auth.uid())) AND (user_id = (SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs can read audit logs" ON public."admin_audit_log" USING (can_view_audit_logs((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_routing_decisions_dev_read" ON public."ai_routing_decisions" USING ((is_dev() OR has_role((SELECT auth.uid()), 'supervisor'::app_role) OR has_role((SELECT auth.uid()), 'admin'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_usage_logs_admin_all" ON public."ai_usage_logs" USING ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'supervisor'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_usage_logs_user_own" ON public."ai_usage_logs" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_usage_quotas_admin_write" ON public."ai_usage_quotas" USING ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role))) WITH CHECK ((is_dev() OR has_role((SELECT auth.uid()), 'admin'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ai_usage_quotas_read_authenticated" ON public."ai_usage_quotas" USING (((SELECT auth.uid()) IS NOT NULL));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ae_delete_dev" ON public."analytics_events" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ae_insert_self_or_anon" ON public."analytics_events" WITH CHECK (((user_id IS NULL) OR (user_id = (SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ae_select_own_or_coord" ON public."analytics_events" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "app_vitals_insert_any" ON public."app_vitals" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "app_vitals_select_admin" ON public."app_vitals" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "audit_log_admin_only" ON public."audit_log" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins e Devs podem visualizar logs de auditoria" ON public."audit_logs" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can view auth login attempts" ON public."auth_login_attempts" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "atr_admin_insert" ON public."auto_tag_rules" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "atr_admin_update" ON public."auto_tag_rules" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "atr_dev_delete" ON public."auto_tag_rules" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can read bot log" ON public."bot_detection_log" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own templates" ON public."cart_templates" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_accessory_categories" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_accessory_categories" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_accessory_categories" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_colors" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_colors" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_colors" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_commemorative_dates" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_commemorative_dates" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_commemorative_dates" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_copywriting_config" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_copywriting_config" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_copywriting_config" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_target_audiences" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_target_audiences" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_target_audiences" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_insert" ON public."category_variation_types" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_admin_update" ON public."category_variation_types" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cat_dev_delete" ON public."category_variation_types" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Public can view reactions for public collections" ON public."collection_item_reactions" USING (((EXISTS ( SELECT 1
   FROM collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))) OR (EXISTS ( SELECT 1
   FROM collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own collection items" ON public."collection_items" USING ((EXISTS ( SELECT 1
   FROM collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = (SELECT auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users delete own collection trash" ON public."collection_items_trash" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users insert own collection trash" ON public."collection_items_trash" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users view own collection trash" ON public."collection_items_trash" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own collections" ON public."collections" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs delete connection_test_history" ON public."connection_test_history" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs read connection_test_history" ON public."connection_test_history" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins e Managers podem ver todos os logs de conversa" ON public."conversation_audit_logs" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'manager'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Usuários podem criar seus próprios logs de conversa" ON public."conversation_audit_logs" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Usuários podem ver seus próprios logs de conversa" ON public."conversation_audit_logs" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read all delivery status" ON public."conversation_delivery_status" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own delivery status" ON public."conversation_delivery_status" USING ((EXISTS ( SELECT 1
   FROM (conversation_event_history e
     JOIN conversation_audit_logs a ON ((a.id = e.conversation_id)))
  WHERE ((e.id = conversation_delivery_status.event_id) AND (a.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Inserção de eventos permitida para o dono da conversa" ON public."conversation_event_history" WITH CHECK ((EXISTS ( SELECT 1
   FROM conversation_audit_logs
  WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "eventos_insert_authenticated" ON public."cotacao_eventos" WITH CHECK (((SELECT auth.uid()) IS NOT NULL));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cotacoes_insert_self" ON public."cotacoes" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "cotacoes_update_owner_or_admin" ON public."cotacoes" USING (((user_id = (SELECT auth.uid())) OR (current_user_role() = 'admin'::text))) WITH CHECK (((user_id = (SELECT auth.uid())) OR (current_user_role() = 'admin'::text)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ck_delete_own_or_coord" ON public."custom_kits" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  -- Coluna criada em prod fora do git (Lovable Dashboard). Adiciona se faltar para alinhar Preview/Prod.
  ALTER TABLE public.custom_kits ADD COLUMN IF NOT EXISTS created_by uuid;
  ALTER POLICY "ck_insert_self" ON public."custom_kits" WITH CHECK (((user_id = (SELECT auth.uid())) OR (created_by = (SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ck_select_own_or_coord" ON public."custom_kits" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ck_update_own_or_coord" ON public."custom_kits" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid())))) WITH CHECK (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "dar_delete_dev_only" ON public."discount_approval_requests" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "dar_insert_scope" ON public."discount_approval_requests" WITH CHECK ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "dar_select_scope" ON public."discount_approval_requests" USING (((seller_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "dar_update_scope" ON public."discount_approval_requests" USING (is_coord_or_above((SELECT auth.uid()))) WITH CHECK (is_coord_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "emc_admin_insert" ON public."eco_material_config" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "emc_admin_update" ON public."eco_material_config" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "emc_dev_delete" ON public."eco_material_config" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "efi_delete_dev_only" ON public."edge_function_invocations" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "efi_insert_any_authenticated" ON public."edge_function_invocations" WITH CHECK (((invoked_by = (SELECT auth.uid())) OR (invoked_by IS NULL)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "efi_select_coord_or_above" ON public."edge_function_invocations" USING (is_coord_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own conversations" ON public."expert_conversations" USING ((seller_id = (SELECT auth.uid()))) WITH CHECK ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own messages" ON public."expert_messages" USING ((EXISTS ( SELECT 1
   FROM expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = (SELECT auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs manage external_connections" ON public."external_connections" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read external_connections_sync_log" ON public."external_connections_sync_log" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fi_delete_own" ON public."favorite_items" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fi_insert_own" ON public."favorite_items" WITH CHECK (((user_id = (SELECT auth.uid())) AND (EXISTS ( SELECT 1
   FROM favorite_lists l
  WHERE ((l.id = favorite_items.list_id) AND (l.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fi_select_own_list_or_coord" ON public."favorite_items" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM favorite_lists l
  WHERE ((l.id = favorite_items.list_id) AND (l.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fi_update_own" ON public."favorite_items" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fit_delete_own" ON public."favorite_items_trash" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fit_insert_own" ON public."favorite_items_trash" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fit_select_own" ON public."favorite_items_trash" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fl_delete_own_or_coord" ON public."favorite_lists" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fl_insert_self" ON public."favorite_lists" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fl_select_own_or_coord" ON public."favorite_lists" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "fl_update_own" ON public."favorite_lists" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can read file_scan_logs" ON public."file_scan_logs" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own file_scan_logs" ON public."file_scan_logs" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own reminders" ON public."follow_up_reminders" USING ((seller_id = (SELECT auth.uid()))) WITH CHECK ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "gm_delete_own_or_admin" ON public."generated_mockups" USING ((((SELECT auth.uid()) = user_id) OR is_admin_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "gm_insert_self" ON public."generated_mockups" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "gm_select_own_or_admin" ON public."generated_mockups" USING ((((SELECT auth.uid()) = user_id) OR is_admin_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "gm_update_own_or_admin" ON public."generated_mockups" USING ((((SELECT auth.uid()) = user_id) OR is_admin_or_above((SELECT auth.uid())))) WITH CHECK ((((SELECT auth.uid()) = user_id) OR is_admin_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs read hardening snapshots" ON public."hardening_health_snapshots" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage inbound_webhook_endpoints" ON public."inbound_webhook_endpoints" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins delete inbound_webhook_events" ON public."inbound_webhook_events" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read inbound_webhook_events" ON public."inbound_webhook_events" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can delete integration credentials" ON public."integration_credentials" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can insert integration credentials" ON public."integration_credentials" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can update integration credentials" ON public."integration_credentials" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can view integration credentials" ON public."integration_credentials" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can manage ip_access_control" ON public."ip_access_control" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can invite collaborators" ON public."kit_collaborators" WITH CHECK (is_kit_owner(kit_id, (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can remove collaborators" ON public."kit_collaborators" USING (is_kit_owner(kit_id, (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can update collaborators" ON public."kit_collaborators" USING (is_kit_owner(kit_id, (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "View collaborators if owner or self" ON public."kit_collaborators" USING ((is_kit_owner(kit_id, (SELECT auth.uid())) OR (user_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Author can delete own comment" ON public."kit_comments" USING (((author_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Author can edit own comment" ON public."kit_comments" USING (((author_id = (SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner or collab can comment" ON public."kit_comments" WITH CHECK (((author_id = (SELECT auth.uid())) AND (is_kit_owner(kit_id, (SELECT auth.uid())) OR is_kit_collaborator(kit_id, (SELECT auth.uid())))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "View comments if owner/collab/admin" ON public."kit_comments" USING ((is_kit_owner(kit_id, (SELECT auth.uid())) OR is_kit_collaborator(kit_id, (SELECT auth.uid())) OR is_admin((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kcpa_admin_insert" ON public."kit_component_print_areas" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kcpa_admin_update" ON public."kit_component_print_areas" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kcpa_dev_delete" ON public."kit_component_print_areas" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kct_admin_insert" ON public."kit_component_types" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kct_admin_update" ON public."kit_component_types" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kct_dev_delete" ON public."kit_component_types" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kt_delete_dev" ON public."kit_templates" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kt_insert_coord" ON public."kit_templates" WITH CHECK (is_coord_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kt_select_authenticated" ON public."kit_templates" USING (((is_active = true) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "kt_update_coord" ON public."kit_templates" USING (is_coord_or_above((SELECT auth.uid()))) WITH CHECK (is_coord_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can delete variants" ON public."kit_variants" USING ((EXISTS ( SELECT 1
   FROM custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can insert variants" ON public."kit_variants" WITH CHECK ((EXISTS ( SELECT 1
   FROM custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can update variants" ON public."kit_variants" USING ((EXISTS ( SELECT 1
   FROM custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Owner can view variants" ON public."kit_variants" USING (((EXISTS ( SELECT 1
   FROM custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = (SELECT auth.uid()))))) OR is_admin((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs can view login attempts" ON public."login_attempts" USING (can_view_audit_logs((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create own Magic Up brand kits" ON public."magic_up_brand_kits" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own Magic Up brand kits" ON public."magic_up_brand_kits" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own Magic Up brand kits" ON public."magic_up_brand_kits" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own Magic Up brand kits" ON public."magic_up_brand_kits" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create own Magic Up campaigns" ON public."magic_up_campaigns" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own Magic Up campaigns" ON public."magic_up_campaigns" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own Magic Up campaigns" ON public."magic_up_campaigns" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own Magic Up campaigns" ON public."magic_up_campaigns" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create comments on own Magic Up generations" ON public."magic_up_comments" WITH CHECK ((((SELECT auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM magic_up_generations g
  WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete comments on own Magic Up generations" ON public."magic_up_comments" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update comments on own Magic Up generations" ON public."magic_up_comments" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view comments on own Magic Up generations" ON public."magic_up_comments" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own generations" ON public."magic_up_generations" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create own Magic Up public shares" ON public."magic_up_public_shares" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own Magic Up public shares" ON public."magic_up_public_shares" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own Magic Up public shares" ON public."magic_up_public_shares" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own Magic Up public shares" ON public."magic_up_public_shares" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create reactions on own Magic Up generations" ON public."magic_up_reactions" WITH CHECK ((((SELECT auth.uid()) = user_id) AND (EXISTS ( SELECT 1
   FROM magic_up_generations g
  WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete reactions on own Magic Up generations" ON public."magic_up_reactions" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update reactions on own Magic Up generations" ON public."magic_up_reactions" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view reactions on own Magic Up generations" ON public."magic_up_reactions" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read mcp violations" ON public."mcp_access_violations" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs read mcp_api_keys" ON public."mcp_api_keys" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage mcp_full_grantors" ON public."mcp_full_grantors" USING (is_admin_strict((SELECT auth.uid()))) WITH CHECK (is_admin_strict((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs read mcp_full_grantors" ON public."mcp_full_grantors" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs can view auto-revocations" ON public."mcp_key_auto_revocations" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mal_authenticated_select" ON public."mockup_approval_links" USING (((is_active = true) OR is_admin_or_above((SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM mockup_generation_jobs j
  WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mal_delete_admin" ON public."mockup_approval_links" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mal_insert_own_jobs" ON public."mockup_approval_links" WITH CHECK ((EXISTS ( SELECT 1
   FROM mockup_generation_jobs j
  WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mal_update_own_or_admin" ON public."mockup_approval_links" USING ((is_admin_or_above((SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM mockup_generation_jobs j
  WHERE ((j.id = mockup_approval_links.job_id) AND (j.user_id = (SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mct_select_own_or_coord" ON public."mockup_credit_transactions" USING ((((SELECT auth.uid()) = user_id) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mc_admin_manage" ON public."mockup_credits" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mc_select_own_or_coord" ON public."mockup_credits" USING ((((SELECT auth.uid()) = user_id) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own drafts" ON public."mockup_drafts" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mgj_delete_dev" ON public."mockup_generation_jobs" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mgj_insert_self" ON public."mockup_generation_jobs" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mgj_select_own_or_coord" ON public."mockup_generation_jobs" USING ((((SELECT auth.uid()) = user_id) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mgj_update_own_or_coord" ON public."mockup_generation_jobs" USING ((((SELECT auth.uid()) = user_id) OR is_coord_or_above((SELECT auth.uid())))) WITH CHECK ((((SELECT auth.uid()) = user_id) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage prompt configs" ON public."mockup_prompt_configs" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins insert prompt history" ON public."mockup_prompt_history" WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins view prompt history" ON public."mockup_prompt_history" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mt_admin_manage" ON public."mockup_templates" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "mt_select_active_or_admin" ON public."mockup_templates" USING (((is_active = true) OR is_admin_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs manage optimization queue" ON public."optimization_queue" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage optimization runs" ON public."optimization_queue_runs" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "order_item_p_select_scope" ON public."order_item_personalizations" USING ((EXISTS ( SELECT 1
   FROM (order_items oi
     JOIN orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_personalizations.order_item_id) AND ((o.seller_id = (SELECT auth.uid())) OR can_view_all_sales())))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage org members" ON public."organization_members" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Members view own org memberships" ON public."organization_members" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage outbound_webhooks" ON public."outbound_webhooks" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ownership_audit_reports_admin_delete" ON public."ownership_audit_reports" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ownership_audit_reports_admin_insert" ON public."ownership_audit_reports" WITH CHECK ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ownership_audit_reports_admin_select" ON public."ownership_audit_reports" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins/devs read repair logs" ON public."ownership_repair_logs" USING ((has_role((SELECT auth.uid()), 'admin'::app_role) OR has_role((SELECT auth.uid()), 'dev'::app_role)));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs manage permissions" ON public."permissions" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "pt_admin_manage" ON public."personalization_techniques" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "pt_select_active_or_admin" ON public."personalization_techniques" USING (((is_active = true) OR is_admin_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "search_logs_write" ON public."product_search_logs" WITH CHECK (((SELECT auth.uid()) IS NOT NULL));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can read all views" ON public."product_views" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can insert own views" ON public."product_views" WITH CHECK ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own views" ON public."product_views" USING ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "pra_delete_admin" ON public."produto_ramo_atividade" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "pra_update_admin" ON public."produto_ramo_atividade" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read token failures" ON public."public_token_failures" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "query_telemetry_insert_any" ON public."query_telemetry" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "query_telemetry_select_admin" ON public."query_telemetry" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own drafts" ON public."quote_drafts" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Sellers and coord create quote_history" ON public."quote_history" WITH CHECK (((user_id = (SELECT auth.uid())) AND (is_coord_or_above((SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.created_by = (SELECT auth.uid())) OR (q.assigned_to = (SELECT auth.uid())))))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Sellers and coord view quote_history" ON public."quote_history" USING ((is_coord_or_above((SELECT auth.uid())) OR (EXISTS ( SELECT 1
   FROM quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.created_by = (SELECT auth.uid())) OR (q.assigned_to = (SELECT auth.uid()))))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "qip_delete_own_quote" ON public."quote_item_personalizations" USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "qip_insert_own_quote" ON public."quote_item_personalizations" WITH CHECK ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "qip_select_own_quote" ON public."quote_item_personalizations" USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid())))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "qip_update_own_quote" ON public."quote_item_personalizations" USING ((EXISTS ( SELECT 1
   FROM (quote_items qi
     JOIN quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "ra_admin_manage" ON public."ramo_atividade" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "raf_admin_manage" ON public."ramo_atividade_filho" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete their own recently viewed products" ON public."recently_viewed_products" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can insert their own recently viewed products" ON public."recently_viewed_products" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update their own recently viewed products" ON public."recently_viewed_products" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view their own recently viewed products" ON public."recently_viewed_products" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs can read rate limits" ON public."request_rate_limits" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can delete old logs" ON public."rls_denial_log" USING (is_admin_strict((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read rls denials" ON public."rls_denial_log" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "rls_denial_log_select_policy" ON public."rls_denial_log" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Supervisors+ can read role_migration_batches" ON public."role_migration_batches" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Supervisors+ can read role_migration_items" ON public."role_migration_items" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs manage role_permissions" ON public."role_permissions" USING (is_dev((SELECT auth.uid()))) WITH CHECK (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users manage own saved trends views" ON public."saved_trends_views" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can create own scheduled reports" ON public."scheduled_reports" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own scheduled reports" ON public."scheduled_reports" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own scheduled reports" ON public."scheduled_reports" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own scheduled reports" ON public."scheduled_reports" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Authenticated users can log searches" ON public."search_analytics" WITH CHECK (((SELECT auth.uid()) IS NOT NULL));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "search_queries_insert_self" ON public."search_queries" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "search_queries_self_or_coord" ON public."search_queries" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins manage security settings" ON public."security_settings" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own cart items" ON public."seller_cart_items" USING ((EXISTS ( SELECT 1
   FROM seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = (SELECT auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = (SELECT auth.uid()))))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage own carts" ON public."seller_carts" USING ((seller_id = (SELECT auth.uid()))) WITH CHECK ((seller_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "sdl_admin_delete" ON public."seller_discount_limits" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "sdl_admin_insert" ON public."seller_discount_limits" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "sdl_admin_update" ON public."seller_discount_limits" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "sdl_select_own_or_coord" ON public."seller_discount_limits" USING (((user_id = (SELECT auth.uid())) OR is_coord_or_above((SELECT auth.uid()))));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own drafts" ON public."simulator_wizard_drafts" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can insert own drafts" ON public."simulator_wizard_drafts" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own drafts" ON public."simulator_wizard_drafts" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own drafts" ON public."simulator_wizard_drafts" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Devs can view all audit logs" ON public."step_up_audit_log" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own audit logs" ON public."step_up_audit_log" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own challenges" ON public."step_up_challenges" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own tokens" ON public."step_up_tokens" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "system_settings_admin_all" ON public."system_settings" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgo_admin_insert" ON public."tabela_preco_gravacao_oficial" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgo_admin_update" ON public."tabela_preco_gravacao_oficial" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgo_dev_delete" ON public."tabela_preco_gravacao_oficial" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgof_admin_insert" ON public."tabela_preco_gravacao_oficial_faixa" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgof_admin_update" ON public."tabela_preco_gravacao_oficial_faixa" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tpgof_dev_delete" ON public."tabela_preco_gravacao_oficial_faixa" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tg_admin_insert" ON public."tecnicas_gravacao" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tg_admin_update" ON public."tecnicas_gravacao" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "tg_dev_delete" ON public."tecnicas_gravacao" USING (is_dev((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "users_delete_own_comparisons" ON public."user_comparisons" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "users_insert_own_comparisons" ON public."user_comparisons" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "users_select_own_comparisons" ON public."user_comparisons" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "users_update_own_comparisons" ON public."user_comparisons" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users insert own preferences" ON public."user_preferences" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users update own preferences" ON public."user_preferences" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users view own preferences" ON public."user_preferences" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins delete roles" ON public."user_roles" USING (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins insert roles" ON public."user_roles" WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins update roles" ON public."user_roles" USING (is_admin_or_above((SELECT auth.uid()))) WITH CHECK (is_admin_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Coord and above read all roles" ON public."user_roles" USING (is_coord_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users read own roles" ON public."user_roles" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can manage their own search history" ON public."user_search_history" USING (((SELECT auth.uid()) = user_id)) WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Supervisors can manage revocations" ON public."user_token_revocations" USING (is_supervisor_or_above((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own revocation" ON public."user_token_revocations" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins can manage video variant links" ON public."video_variant_links" USING (is_admin((SELECT auth.uid()))) WITH CHECK (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can insert own voice logs" ON public."voice_command_logs" WITH CHECK (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can view own voice logs" ON public."voice_command_logs" USING (((SELECT auth.uid()) = user_id));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins delete webhook_deliveries" ON public."webhook_deliveries" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Admins read webhook_deliveries" ON public."webhook_deliveries" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "wdm_select_admin" ON public."webhook_delivery_metrics" USING (is_admin((SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Authenticated can insert notifications" ON public."workspace_notifications" WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can delete own notifications" ON public."workspace_notifications" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can read own notifications" ON public."workspace_notifications" USING ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;
DO $$
BEGIN
  ALTER POLICY "Users can update own notifications" ON public."workspace_notifications" USING ((user_id = (SELECT auth.uid()))) WITH CHECK ((user_id = (SELECT auth.uid())));
EXCEPTION WHEN undefined_table OR undefined_object OR undefined_function THEN NULL;
END $$;