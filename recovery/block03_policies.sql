-- Generated from pg_dump --schema-only --schema=public

-- Name: quote_items Acesso a itens via orcamento; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Acesso a itens via orcamento" ON public.quote_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.quotes
  WHERE (quotes.id = quote_items.quote_id))));


--
-- Name: order_items Acesso a itens via pedido; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Acesso a itens via pedido" ON public.order_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.orders
  WHERE (orders.id = order_items.order_id))));


--
-- Name: conversation_event_history Acesso ao histórico de eventos segue o log de auditoria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Acesso ao histórico de eventos segue o log de auditoria" ON public.conversation_event_history FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.conversation_audit_logs
  WHERE (conversation_audit_logs.id = conversation_event_history.conversation_id))));


--
-- Name: category_icons Admins can delete category icons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete category icons" ON public.category_icons FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: product_price_freshness_overrides Admins can delete freshness overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete freshness overrides" ON public.product_price_freshness_overrides FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: integration_credentials Admins can delete integration credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete integration credentials" ON public.integration_credentials FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: rls_denial_log Admins can delete old logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete old logs" ON public.rls_denial_log FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));


--
-- Name: kit_templates Admins can delete templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can delete templates" ON public.kit_templates FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: admin_settings Admins can insert admin_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert admin_settings" ON public.admin_settings FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: category_icons Admins can insert category icons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert category icons" ON public.category_icons FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: product_price_freshness_overrides Admins can insert freshness overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert freshness overrides" ON public.product_price_freshness_overrides FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: integration_credentials Admins can insert integration credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert integration credentials" ON public.integration_credentials FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: kit_templates Admins can insert templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can insert templates" ON public.kit_templates FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: component_media Admins can manage component media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage component media" ON public.component_media TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: product_components Admins can manage components; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage components" ON public.product_components TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: product_groups Admins can manage groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage groups" ON public.product_groups TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: product_group_members Admins can manage members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage members" ON public.product_group_members TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: permissions Admins can manage permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage permissions" ON public.permissions TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: ai_usage_quotas Admins can manage quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage quotas" ON public.ai_usage_quotas TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: role_permissions Admins can manage role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage role_permissions" ON public.role_permissions TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: video_variant_links Admins can manage video variant links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can manage video variant links" ON public.video_variant_links TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: custom_kits Admins can read all kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all kits" ON public.custom_kits FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: login_attempts Admins can read all login attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all login attempts" ON public.login_attempts FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: product_views Admins can read all views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can read all views" ON public.product_views FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: admin_settings Admins can update admin_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update admin_settings" ON public.admin_settings FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: category_icons Admins can update category icons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update category icons" ON public.category_icons FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: product_price_freshness_overrides Admins can update freshness overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update freshness overrides" ON public.product_price_freshness_overrides FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: integration_credentials Admins can update integration credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update integration credentials" ON public.integration_credentials FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: kit_templates Admins can update templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can update templates" ON public.kit_templates FOR UPDATE TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: admin_settings Admins can view admin_settings; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view admin_settings" ON public.admin_settings FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: ai_usage_logs Admins can view all AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all AI usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: admin_audit_log Admins can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all audit logs" ON public.admin_audit_log FOR SELECT USING ((auth.uid() IN ( SELECT user_roles.user_id
   FROM public.user_roles
  WHERE (user_roles.role = 'admin'::public.app_role))));


--
-- Name: profiles Admins can view all profiles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: voice_command_logs Admins can view all voice logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view all voice logs" ON public.voice_command_logs FOR SELECT TO authenticated USING (public.is_manager_or_admin());


--
-- Name: integration_credentials Admins can view integration credentials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins can view integration credentials" ON public.integration_credentials FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: inbound_webhook_events Admins delete inbound_webhook_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete inbound_webhook_events" ON public.inbound_webhook_events FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins delete roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete roles" ON public.user_roles FOR DELETE TO authenticated USING (public.is_admin_strict(auth.uid()));


--
-- Name: webhook_deliveries Admins delete webhook_deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins delete webhook_deliveries" ON public.webhook_deliveries FOR DELETE USING (public.is_admin(auth.uid()));


--
-- Name: access_security_settings Admins e Devs podem atualizar configurações de segurança; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins e Devs podem atualizar configurações de segurança" ON public.access_security_settings FOR UPDATE TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role))) WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: access_security_settings Admins e Devs podem visualizar configurações de segurança; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins e Devs podem visualizar configurações de segurança" ON public.access_security_settings FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: audit_logs Admins e Devs podem visualizar logs de auditoria; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins e Devs podem visualizar logs de auditoria" ON public.audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: conversation_audit_logs Admins e Managers podem ver todos os logs de conversa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins e Managers podem ver todos os logs de conversa" ON public.conversation_audit_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'manager'::public.app_role)));


--
-- Name: product_sync_logs Admins insert product sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert product sync logs" ON public.product_sync_logs FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: mockup_prompt_history Admins insert prompt history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert prompt history" ON public.mockup_prompt_history FOR INSERT WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins insert roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert roles" ON public.user_roles FOR INSERT TO authenticated WITH CHECK (public.is_admin_strict(auth.uid()));


--
-- Name: secret_rotation_log Admins insert secret_rotation_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins insert secret_rotation_log" ON public.secret_rotation_log FOR INSERT WITH CHECK ((public.is_admin(auth.uid()) AND (rotated_by = auth.uid())));


--
-- Name: product_component_locations Admins manage component locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage component locations" ON public.product_component_locations USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: inbound_webhook_endpoints Admins manage inbound_webhook_endpoints; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage inbound_webhook_endpoints" ON public.inbound_webhook_endpoints USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: mcp_full_grantors Admins manage mcp_full_grantors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage mcp_full_grantors" ON public.mcp_full_grantors TO authenticated USING (public.is_admin_strict(auth.uid())) WITH CHECK (public.is_admin_strict(auth.uid()));


--
-- Name: optimization_queue_runs Admins manage optimization runs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage optimization runs" ON public.optimization_queue_runs TO authenticated USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: outbound_webhooks Admins manage outbound_webhooks; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage outbound_webhooks" ON public.outbound_webhooks USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: mockup_prompt_configs Admins manage prompt configs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins manage prompt configs" ON public.mockup_prompt_configs USING (public.is_admin(auth.uid())) WITH CHECK (public.is_admin(auth.uid()));


--
-- Name: favorite_items Admins read all favorite items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all favorite items" ON public.favorite_items FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: favorite_lists Admins read all favorite lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all favorite lists" ON public.favorite_lists FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: favorite_item_reactions Admins read all reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read all reactions" ON public.favorite_item_reactions FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: external_connections_sync_log Admins read external_connections_sync_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read external_connections_sync_log" ON public.external_connections_sync_log FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: inbound_webhook_events Admins read inbound_webhook_events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read inbound_webhook_events" ON public.inbound_webhook_events FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: mcp_access_violations Admins read mcp violations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read mcp violations" ON public.mcp_access_violations FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: rls_denial_log Admins read rls denials; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read rls denials" ON public.rls_denial_log FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: public_token_failures Admins read token failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read token failures" ON public.public_token_failures FOR SELECT TO authenticated USING (public.is_admin(auth.uid()));


--
-- Name: webhook_deliveries Admins read webhook_deliveries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins read webhook_deliveries" ON public.webhook_deliveries FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: user_roles Admins update roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins update roles" ON public.user_roles FOR UPDATE TO authenticated USING (public.is_admin_strict(auth.uid())) WITH CHECK (public.is_admin_strict(auth.uid()));


--
-- Name: product_sync_logs Admins view product sync logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view product sync logs" ON public.product_sync_logs FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: mockup_prompt_history Admins view prompt history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins view prompt history" ON public.mockup_prompt_history FOR SELECT USING (public.is_admin(auth.uid()));


--
-- Name: ownership_repair_logs Admins/devs read repair logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Admins/devs read repair logs" ON public.ownership_repair_logs FOR SELECT TO authenticated USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: category_icons Anyone can read category icons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Anyone can read category icons" ON public.category_icons FOR SELECT USING (true);


--
-- Name: file_scan_logs Apenas administradores podem visualizar logs de scan; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Apenas administradores podem visualizar logs de scan" ON public.file_scan_logs FOR SELECT TO authenticated USING (((auth.jwt() ->> 'email'::text) ~~ '%admin%'::text));


--
-- Name: product_price_freshness_overrides Authenticated can read freshness overrides; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated can read freshness overrides" ON public.product_price_freshness_overrides FOR SELECT TO authenticated USING (true);


--
-- Name: organizations Authenticated users can create organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can create organizations" ON public.organizations FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: query_telemetry Authenticated users can insert own telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert own telemetry" ON public.query_telemetry FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: search_analytics Authenticated users can log searches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can log searches" ON public.search_analytics FOR INSERT TO authenticated WITH CHECK ((auth.uid() IS NOT NULL));


--
-- Name: component_media Authenticated users can read component media; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read component media" ON public.component_media FOR SELECT TO authenticated USING (true);


--
-- Name: product_components Authenticated users can read components; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read components" ON public.product_components FOR SELECT TO authenticated USING (true);


--
-- Name: product_groups Authenticated users can read groups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read groups" ON public.product_groups FOR SELECT TO authenticated USING (true);


--
-- Name: product_group_members Authenticated users can read members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read members" ON public.product_group_members FOR SELECT TO authenticated USING (true);


--
-- Name: permissions Authenticated users can read permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read permissions" ON public.permissions FOR SELECT TO authenticated USING (true);


--
-- Name: ai_usage_quotas Authenticated users can read quotas; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read quotas" ON public.ai_usage_quotas FOR SELECT TO authenticated USING (true);


--
-- Name: role_permissions Authenticated users can read role_permissions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read role_permissions" ON public.role_permissions FOR SELECT TO authenticated USING (true);


--
-- Name: video_variant_links Authenticated users can read video variant links; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read video variant links" ON public.video_variant_links FOR SELECT TO authenticated USING (true);


--
-- Name: kit_templates Authenticated users can view active templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can view active templates" ON public.kit_templates FOR SELECT TO authenticated USING (((is_active = true) OR public.is_admin(auth.uid())));


--
-- Name: product_component_locations Authenticated view component locations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated view component locations" ON public.product_component_locations FOR SELECT TO authenticated USING (true);


--
-- Name: kit_comments Author can delete own comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can delete own comment" ON public.kit_comments FOR DELETE USING (((author_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: kit_comments Author can edit own comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Author can edit own comment" ON public.kit_comments FOR UPDATE USING (((author_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: rls_denial_log Block direct insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct insert" ON public.rls_denial_log FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: rls_denial_log Block direct update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Block direct update" ON public.rls_denial_log FOR UPDATE TO authenticated USING (false);


--
-- Name: query_telemetry Devs can delete telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can delete telemetry" ON public.query_telemetry FOR DELETE TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: ip_access_control Devs can manage ip_access_control; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can manage ip_access_control" ON public.ip_access_control TO authenticated USING (public.is_dev(auth.uid())) WITH CHECK (public.is_dev(auth.uid()));


--
-- Name: admin_audit_log_old Devs can read audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can read audit logs" ON public.admin_audit_log_old FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: bot_detection_log Devs can read bot log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can read bot log" ON public.bot_detection_log FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: request_rate_limits Devs can read rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can read rate limits" ON public.request_rate_limits FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: query_telemetry Devs can read telemetry; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can read telemetry" ON public.query_telemetry FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: step_up_audit_log Devs can view all audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can view all audit logs" ON public.step_up_audit_log FOR SELECT USING (public.is_dev(auth.uid()));


--
-- Name: mcp_key_auto_revocations Devs can view auto-revocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs can view auto-revocations" ON public.mcp_key_auto_revocations FOR SELECT USING (public.is_dev(auth.uid()));


--
-- Name: connection_test_history Devs delete connection_test_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs delete connection_test_history" ON public.connection_test_history FOR DELETE TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: external_connections Devs manage external_connections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs manage external_connections" ON public.external_connections TO authenticated USING (public.is_dev(auth.uid())) WITH CHECK (public.is_dev(auth.uid()));


--
-- Name: optimization_queue Devs manage optimization queue; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs manage optimization queue" ON public.optimization_queue TO authenticated USING (public.is_dev(auth.uid())) WITH CHECK (public.is_dev(auth.uid()));


--
-- Name: connection_test_history Devs read connection_test_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs read connection_test_history" ON public.connection_test_history FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: hardening_health_snapshots Devs read hardening snapshots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs read hardening snapshots" ON public.hardening_health_snapshots FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: mcp_api_keys Devs read mcp_api_keys; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs read mcp_api_keys" ON public.mcp_api_keys FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: mcp_full_grantors Devs read mcp_full_grantors; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs read mcp_full_grantors" ON public.mcp_full_grantors FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: secret_rotation_log Devs read secret_rotation_log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Devs read secret_rotation_log" ON public.secret_rotation_log FOR SELECT TO authenticated USING (public.is_dev(auth.uid()));


--
-- Name: conversation_event_history Inserção de eventos permitida para o dono da conversa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Inserção de eventos permitida para o dono da conversa" ON public.conversation_event_history FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.conversation_audit_logs
  WHERE ((conversation_audit_logs.id = conversation_event_history.conversation_id) AND (conversation_audit_logs.user_id = auth.uid())))));


--
-- Name: search_analytics Managers and admins can read search analytics; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers and admins can read search analytics" ON public.search_analytics FOR SELECT TO authenticated USING (public.is_manager_or_admin());


--
-- Name: quote_comments Managers can read all comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Managers can read all comments" ON public.quote_comments FOR SELECT TO authenticated USING (public.is_manager_or_admin());


--
-- Name: organization_members Members can view org members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view org members" ON public.organization_members FOR SELECT TO authenticated USING ((organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)));


--
-- Name: organizations Members can view their organizations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Members can view their organizations" ON public.organizations FOR SELECT TO authenticated USING ((id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)));


--
-- Name: role_migration_batches No direct delete role_migration_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete role_migration_batches" ON public.role_migration_batches FOR DELETE TO authenticated USING (false);


--
-- Name: role_migration_items No direct delete role_migration_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete role_migration_items" ON public.role_migration_items FOR DELETE TO authenticated USING (false);


--
-- Name: mcp_api_keys No direct delete via JWT; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct delete via JWT" ON public.mcp_api_keys FOR DELETE TO authenticated USING (false);


--
-- Name: role_migration_batches No direct insert role_migration_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert role_migration_batches" ON public.role_migration_batches FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: role_migration_items No direct insert role_migration_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert role_migration_items" ON public.role_migration_items FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: mcp_api_keys No direct insert via JWT; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct insert via JWT" ON public.mcp_api_keys FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: role_migration_batches No direct update role_migration_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update role_migration_batches" ON public.role_migration_batches FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
-- Name: role_migration_items No direct update role_migration_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update role_migration_items" ON public.role_migration_items FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
-- Name: mcp_api_keys No direct update via JWT; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "No direct update via JWT" ON public.mcp_api_keys FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
-- Name: organization_members Org owners can delete members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org owners can delete members" ON public.organization_members FOR DELETE TO authenticated USING ((public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role) OR (user_id = auth.uid())));


--
-- Name: organization_members Org owners can insert members any role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org owners can insert members any role" ON public.organization_members FOR INSERT TO authenticated WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role));


--
-- Name: organization_members Org owners can update members; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Org owners can update members" ON public.organization_members FOR UPDATE TO authenticated USING (public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role)) WITH CHECK (public.has_org_role(auth.uid(), organization_id, 'owner'::public.org_role));


--
-- Name: kit_variants Owner can delete variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can delete variants" ON public.kit_variants FOR DELETE USING ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));


--
-- Name: kit_variants Owner can insert variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can insert variants" ON public.kit_variants FOR INSERT WITH CHECK ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));


--
-- Name: kit_collaborators Owner can invite collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can invite collaborators" ON public.kit_collaborators FOR INSERT WITH CHECK (public.is_kit_owner(kit_id, auth.uid()));


--
-- Name: kit_collaborators Owner can remove collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can remove collaborators" ON public.kit_collaborators FOR DELETE USING (public.is_kit_owner(kit_id, auth.uid()));


--
-- Name: kit_collaborators Owner can update collaborators; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can update collaborators" ON public.kit_collaborators FOR UPDATE USING (public.is_kit_owner(kit_id, auth.uid()));


--
-- Name: kit_variants Owner can update variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can update variants" ON public.kit_variants FOR UPDATE USING ((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))));


--
-- Name: kit_variants Owner can view variants; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner can view variants" ON public.kit_variants FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.custom_kits k
  WHERE ((k.id = kit_variants.kit_master_id) AND (k.user_id = auth.uid())))) OR public.is_admin(auth.uid())));


--
-- Name: kit_comments Owner or collab can comment; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owner or collab can comment" ON public.kit_comments FOR INSERT WITH CHECK (((author_id = auth.uid()) AND (public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()))));


--
-- Name: organizations Owners can update their organization; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners can update their organization" ON public.organizations FOR UPDATE TO authenticated USING (public.has_org_role(auth.uid(), id, 'owner'::public.org_role)) WITH CHECK (public.has_org_role(auth.uid(), id, 'owner'::public.org_role));


--
-- Name: favorite_item_reactions Owners delete own list reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners delete own list reactions" ON public.favorite_item_reactions FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = auth.uid())))));


--
-- Name: favorite_item_reactions Owners read own list reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Owners read own list reactions" ON public.favorite_item_reactions FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.user_id = auth.uid())))));


--
-- Name: favorite_item_reactions Public can insert reactions on shared lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can insert reactions on shared lists" ON public.favorite_item_reactions FOR INSERT TO authenticated, anon WITH CHECK ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))));


--
-- Name: favorite_items Public can read items of shared lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read items of shared lists" ON public.favorite_items FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_items.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))));


--
-- Name: favorite_item_reactions Public can read reactions of shared lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read reactions of shared lists" ON public.favorite_item_reactions FOR SELECT TO authenticated, anon USING ((EXISTS ( SELECT 1
   FROM public.favorite_lists l
  WHERE ((l.id = favorite_item_reactions.list_id) AND (l.shared_token IS NOT NULL) AND ((l.shared_expires_at IS NULL) OR (l.shared_expires_at > now()))))));


--
-- Name: favorite_lists Public can read shared lists by token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can read shared lists by token" ON public.favorite_lists FOR SELECT TO authenticated, anon USING (((shared_token IS NOT NULL) AND ((shared_expires_at IS NULL) OR (shared_expires_at > now()))));


--
-- Name: collections Public can view collection by valid share token; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view collection by valid share token" ON public.collections FOR SELECT USING (((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))));


--
-- Name: collection_items Public can view items of public collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view items of public collections" ON public.collection_items FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_items.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))));


--
-- Name: collection_item_reactions Public can view reactions for public collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Public can view reactions for public collections" ON public.collection_item_reactions FOR SELECT USING (((EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.is_public = true) AND (c.share_token IS NOT NULL) AND ((c.share_expires_at IS NULL) OR (c.share_expires_at > now()))))) OR (EXISTS ( SELECT 1
   FROM public.collections c
  WHERE ((c.id = collection_item_reactions.collection_id) AND (c.user_id = auth.uid()))))));


--
-- Name: kit_share_tokens Sellers can manage own kit share tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can manage own kit share tokens" ON public.kit_share_tokens TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: quote_comments Sellers can read comments on own quotes; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can read comments on own quotes" ON public.quote_comments FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE (((q.id)::text = quote_comments.quote_id) AND (q.seller_id = auth.uid())))));


--
-- Name: seller_discount_limits Sellers can read own discount limit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Sellers can read own discount limit" ON public.seller_discount_limits FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: ai_usage_logs Service role can insert AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert AI usage logs" ON public.ai_usage_logs FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: bot_detection_log Service role can insert bot log; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert bot log" ON public.bot_detection_log FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: login_attempts Service role can insert login attempts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can insert login attempts" ON public.login_attempts FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: request_rate_limits Service role can manage rate limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can manage rate limits" ON public.request_rate_limits TO service_role USING (true) WITH CHECK (true);


--
-- Name: ai_usage_logs Service role can update AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role can update AI usage logs" ON public.ai_usage_logs FOR UPDATE TO service_role USING (true) WITH CHECK (true);


--
-- Name: ip_access_control Service role full access ip_access_control; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role full access ip_access_control" ON public.ip_access_control TO service_role USING (true) WITH CHECK (true);


--
-- Name: connection_test_history Service role inserts connection_test_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role inserts connection_test_history" ON public.connection_test_history FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: collection_item_reactions Service role inserts reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role inserts reactions" ON public.collection_item_reactions FOR INSERT WITH CHECK (false);


--
-- Name: public_token_failures Service role inserts token failures; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Service role inserts token failures" ON public.public_token_failures FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: admin_audit_log_old Supervisors can insert audit entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors can insert audit entries" ON public.admin_audit_log_old FOR INSERT TO authenticated WITH CHECK (public.is_supervisor_or_above(auth.uid()));


--
-- Name: seller_discount_limits Supervisors can manage all discount limits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors can manage all discount limits" ON public.seller_discount_limits TO authenticated USING (public.can_approve_discount(auth.uid())) WITH CHECK (public.can_approve_discount(auth.uid()));


--
-- Name: user_token_revocations Supervisors can manage revocations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors can manage revocations" ON public.user_token_revocations TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: user_roles Supervisors read all roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors read all roles" ON public.user_roles FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: role_migration_batches Supervisors+ can read role_migration_batches; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors+ can read role_migration_batches" ON public.role_migration_batches FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: role_migration_items Supervisors+ can read role_migration_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Supervisors+ can read role_migration_items" ON public.role_migration_items FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: workspace_notifications System can insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "System can insert notifications" ON public.workspace_notifications FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: magic_up_comments Users can create comments on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create comments on own Magic Up generations" ON public.magic_up_comments FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.magic_up_generations g
  WHERE ((g.id = magic_up_comments.generation_id) AND (g.user_id = auth.uid()))))));


--
-- Name: magic_up_brand_kits Users can create own Magic Up brand kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own Magic Up brand kits" ON public.magic_up_brand_kits FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_campaigns Users can create own Magic Up campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own Magic Up campaigns" ON public.magic_up_campaigns FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_public_shares Users can create own Magic Up public shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own Magic Up public shares" ON public.magic_up_public_shares FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: scheduled_reports Users can create own scheduled reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create own scheduled reports" ON public.scheduled_reports FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_reactions Users can create reactions on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can create reactions on own Magic Up generations" ON public.magic_up_reactions FOR INSERT TO authenticated WITH CHECK (((auth.uid() = user_id) AND (EXISTS ( SELECT 1
   FROM public.magic_up_generations g
  WHERE ((g.id = magic_up_reactions.generation_id) AND (g.user_id = auth.uid()))))));


--
-- Name: magic_up_comments Users can delete comments on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete comments on own Magic Up generations" ON public.magic_up_comments FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_brand_kits Users can delete own Magic Up brand kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own Magic Up brand kits" ON public.magic_up_brand_kits FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_campaigns Users can delete own Magic Up campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own Magic Up campaigns" ON public.magic_up_campaigns FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_public_shares Users can delete own Magic Up public shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own Magic Up public shares" ON public.magic_up_public_shares FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: quote_comments Users can delete own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own comments" ON public.quote_comments FOR DELETE TO authenticated USING (((user_id = auth.uid()) OR public.can_manage_quotes(auth.uid())));


--
-- Name: simulator_wizard_drafts Users can delete own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own drafts" ON public.simulator_wizard_drafts FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: saved_filters Users can delete own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own filters" ON public.saved_filters FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: workspace_notifications Users can delete own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own notifications" ON public.workspace_notifications FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_onboarding Users can delete own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own onboarding" ON public.user_onboarding FOR DELETE TO authenticated USING ((user_id = auth.uid()));


--
-- Name: scheduled_reports Users can delete own scheduled reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete own scheduled reports" ON public.scheduled_reports FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_reactions Users can delete reactions on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete reactions on own Magic Up generations" ON public.magic_up_reactions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ai_insights_cache Users can delete their own cached insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own cached insights" ON public.ai_insights_cache FOR DELETE TO authenticated USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: recently_viewed_products Users can delete their own recently viewed products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can delete their own recently viewed products" ON public.recently_viewed_products FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: simulator_wizard_drafts Users can insert own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own drafts" ON public.simulator_wizard_drafts FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: saved_filters Users can insert own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own filters" ON public.saved_filters FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_onboarding Users can insert own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own onboarding" ON public.user_onboarding FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can insert own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK ((user_id = auth.uid()));


--
-- Name: product_views Users can insert own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own views" ON public.product_views FOR INSERT TO authenticated WITH CHECK ((seller_id = auth.uid()));


--
-- Name: voice_command_logs Users can insert own voice logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert own voice logs" ON public.voice_command_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_insights_cache Users can insert their own cached insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own cached insights" ON public.ai_insights_cache FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: recently_viewed_products Users can insert their own recently viewed products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own recently viewed products" ON public.recently_viewed_products FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_usage_events Users can insert their own usage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can insert their own usage events" ON public.ai_usage_events FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: quote_history Users can manage history via quote ownership; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage history via quote ownership" ON public.quote_history TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = auth.uid()) OR public.can_manage_quotes(auth.uid())))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_history.quote_id) AND ((q.seller_id = auth.uid()) OR public.can_manage_quotes(auth.uid()))))));


--
-- Name: seller_cart_items Users can manage own cart items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own cart items" ON public.seller_cart_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.seller_carts c
  WHERE ((c.id = seller_cart_items.cart_id) AND (c.seller_id = auth.uid())))));


--
-- Name: seller_carts Users can manage own carts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own carts" ON public.seller_carts TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: collection_items Users can manage own collection items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own collection items" ON public.collection_items TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.collections
  WHERE ((collections.id = collection_items.collection_id) AND (collections.user_id = auth.uid())))));


--
-- Name: collections Users can manage own collections; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own collections" ON public.collections TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: expert_conversations Users can manage own conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own conversations" ON public.expert_conversations TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: mockup_drafts Users can manage own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own drafts" ON public.mockup_drafts TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: quote_drafts Users can manage own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own drafts" ON public.quote_drafts USING ((auth.uid() = user_id));


--
-- Name: magic_up_generations Users can manage own generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own generations" ON public.magic_up_generations TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: custom_kits Users can manage own kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own kits" ON public.custom_kits TO authenticated USING (((user_id = auth.uid()) OR public.is_admin(auth.uid()))) WITH CHECK (((user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: expert_messages Users can manage own messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own messages" ON public.expert_messages TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = auth.uid()))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.expert_conversations
  WHERE ((expert_conversations.id = expert_messages.conversation_id) AND (expert_conversations.seller_id = auth.uid())))));


--
-- Name: generated_mockups Users can manage own mockups; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own mockups" ON public.generated_mockups TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: follow_up_reminders Users can manage own reminders; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own reminders" ON public.follow_up_reminders TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: cart_templates Users can manage own templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage own templates" ON public.cart_templates TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: favorites Users can manage their own favorites; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own favorites" ON public.favorites USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_search_history Users can manage their own search history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can manage their own search history" ON public.user_search_history USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: workspace_notifications Users can read own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own notifications" ON public.workspace_notifications FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: quote_comments Users can read own or admin comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can read own or admin comments" ON public.quote_comments FOR SELECT TO authenticated USING (((user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: magic_up_comments Users can update comments on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update comments on own Magic Up generations" ON public.magic_up_comments FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_brand_kits Users can update own Magic Up brand kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own Magic Up brand kits" ON public.magic_up_brand_kits FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_campaigns Users can update own Magic Up campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own Magic Up campaigns" ON public.magic_up_campaigns FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: magic_up_public_shares Users can update own Magic Up public shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own Magic Up public shares" ON public.magic_up_public_shares FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: quote_comments Users can update own comments; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own comments" ON public.quote_comments FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: simulator_wizard_drafts Users can update own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own drafts" ON public.simulator_wizard_drafts FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: saved_filters Users can update own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own filters" ON public.saved_filters FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: workspace_notifications Users can update own notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own notifications" ON public.workspace_notifications FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_onboarding Users can update own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own onboarding" ON public.user_onboarding FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: profiles Users can update own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: scheduled_reports Users can update own scheduled reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update own scheduled reports" ON public.scheduled_reports FOR UPDATE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_reactions Users can update reactions on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update reactions on own Magic Up generations" ON public.magic_up_reactions FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: ai_insights_cache Users can update their own cached insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own cached insights" ON public.ai_insights_cache FOR UPDATE TO authenticated USING ((auth.uid() = user_id)) WITH CHECK ((auth.uid() = user_id));


--
-- Name: recently_viewed_products Users can update their own recently viewed products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can update their own recently viewed products" ON public.recently_viewed_products FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: geo_allowed_countries Users can view allowed countries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view allowed countries" ON public.geo_allowed_countries FOR SELECT USING (true);


--
-- Name: magic_up_comments Users can view comments on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view comments on own Magic Up generations" ON public.magic_up_comments FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ai_usage_logs Users can view own AI usage logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own AI usage logs" ON public.ai_usage_logs FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: magic_up_brand_kits Users can view own Magic Up brand kits; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own Magic Up brand kits" ON public.magic_up_brand_kits FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_campaigns Users can view own Magic Up campaigns; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own Magic Up campaigns" ON public.magic_up_campaigns FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_public_shares Users can view own Magic Up public shares; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own Magic Up public shares" ON public.magic_up_public_shares FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: step_up_audit_log Users can view own audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own audit logs" ON public.step_up_audit_log FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: step_up_challenges Users can view own challenges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own challenges" ON public.step_up_challenges FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: simulator_wizard_drafts Users can view own drafts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own drafts" ON public.simulator_wizard_drafts FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: saved_filters Users can view own filters; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own filters" ON public.saved_filters FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_onboarding Users can view own onboarding; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own onboarding" ON public.user_onboarding FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: profiles Users can view own profile; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: user_token_revocations Users can view own revocation; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own revocation" ON public.user_token_revocations FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: user_roles Users can view own role; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own role" ON public.user_roles FOR SELECT TO authenticated USING ((user_id = auth.uid()));


--
-- Name: scheduled_reports Users can view own scheduled reports; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own scheduled reports" ON public.scheduled_reports FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: step_up_tokens Users can view own tokens; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own tokens" ON public.step_up_tokens FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: product_views Users can view own views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own views" ON public.product_views FOR SELECT TO authenticated USING ((seller_id = auth.uid()));


--
-- Name: voice_command_logs Users can view own voice logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view own voice logs" ON public.voice_command_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: magic_up_reactions Users can view reactions on own Magic Up generations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view reactions on own Magic Up generations" ON public.magic_up_reactions FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ai_insights_cache Users can view their own cached insights; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own cached insights" ON public.ai_insights_cache FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: recently_viewed_products Users can view their own recently viewed products; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own recently viewed products" ON public.recently_viewed_products FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: ai_usage_events Users can view their own usage events; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users can view their own usage events" ON public.ai_usage_events FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_admin(auth.uid())));


--
-- Name: art_file_attachments Users delete own art files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own art files" ON public.art_file_attachments FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: collection_items_trash Users delete own collection trash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own collection trash" ON public.collection_items_trash FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: mockup_templates Users delete own mockup templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users delete own mockup templates" ON public.mockup_templates FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: art_file_attachments Users insert own art files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own art files" ON public.art_file_attachments FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: collection_items_trash Users insert own collection trash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own collection trash" ON public.collection_items_trash FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: mockup_templates Users insert own mockup templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own mockup templates" ON public.mockup_templates FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_preferences Users insert own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users insert own preferences" ON public.user_preferences FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: favorite_items Users manage own favorite items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own favorite items" ON public.favorite_items TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: favorite_lists Users manage own favorite lists; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own favorite lists" ON public.favorite_lists TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: saved_trends_views Users manage own saved trends views; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own saved trends views" ON public.saved_trends_views TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: favorite_items_trash Users manage own trash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users manage own trash" ON public.favorite_items_trash TO authenticated USING ((user_id = auth.uid())) WITH CHECK ((user_id = auth.uid()));


--
-- Name: user_roles Users read own roles; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users read own roles" ON public.user_roles FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: art_file_attachments Users update own art files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own art files" ON public.art_file_attachments FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: mockup_templates Users update own mockup templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own mockup templates" ON public.mockup_templates FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users update own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users update own preferences" ON public.user_preferences FOR UPDATE USING ((auth.uid() = user_id));


--
-- Name: art_file_attachments Users view own art files; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own art files" ON public.art_file_attachments FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: collection_items_trash Users view own collection trash; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own collection trash" ON public.collection_items_trash FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: mockup_templates Users view own mockup templates; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own mockup templates" ON public.mockup_templates FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_preferences Users view own preferences; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Users view own preferences" ON public.user_preferences FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: conversation_audit_logs Usuários podem criar seus próprios logs de conversa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem criar seus próprios logs de conversa" ON public.conversation_audit_logs FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: conversation_audit_logs Usuários podem ver seus próprios logs de conversa; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Usuários podem ver seus próprios logs de conversa" ON public.conversation_audit_logs FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: kit_collaborators View collaborators if owner or self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View collaborators if owner or self" ON public.kit_collaborators FOR SELECT USING ((public.is_kit_owner(kit_id, auth.uid()) OR (user_id = auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: kit_comments View comments if owner/collab/admin; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "View comments if owner/collab/admin" ON public.kit_comments FOR SELECT USING ((public.is_kit_owner(kit_id, auth.uid()) OR public.is_kit_collaborator(kit_id, auth.uid()) OR public.is_admin(auth.uid())));


--
-- Name: admin_audit_log_old admin_audit_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admin_audit_log_select_policy ON public.admin_audit_log_old FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: e2e_cleanup_audit admins_select_e2e_cleanup_audit; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY admins_select_e2e_cleanup_audit ON public.e2e_cleanup_audit FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::public.app_role));


--
-- Name: ai_usage_logs ai_usage_logs_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ai_usage_logs_select_policy ON public.ai_usage_logs FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR public.is_supervisor_or_above(auth.uid())));


--
-- Name: comparison_reactions anyone_read_comparison_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_read_comparison_reactions ON public.comparison_reactions FOR SELECT USING ((EXISTS ( SELECT 1
   FROM public.user_comparisons uc
  WHERE ((uc.id = comparison_reactions.comparison_id) AND (uc.is_public = true) AND ((uc.share_expires_at IS NULL) OR (uc.share_expires_at > now()))))));


--
-- Name: price_history anyone_read_price_history; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_read_price_history ON public.price_history FOR SELECT USING (true);


--
-- Name: user_comparisons anyone_read_public_comparisons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anyone_read_public_comparisons ON public.user_comparisons FOR SELECT USING (((is_public = true) AND (share_token IS NOT NULL) AND ((share_expires_at IS NULL) OR (share_expires_at > now()))));


--
-- Name: discount_approval_requests dar_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dar_delete_scope ON public.discount_approval_requests FOR DELETE TO authenticated USING (public.can_view_all_sales());


--
-- Name: discount_approval_requests dar_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dar_insert_scope ON public.discount_approval_requests FOR INSERT TO authenticated WITH CHECK (((seller_id = auth.uid()) OR public.can_view_all_sales()));


--
-- Name: discount_approval_requests dar_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dar_select_scope ON public.discount_approval_requests FOR SELECT TO authenticated USING ((public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role) OR (seller_id = auth.uid())));


--
-- Name: discount_approval_requests dar_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dar_update_scope ON public.discount_approval_requests FOR UPDATE TO authenticated USING ((public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role))) WITH CHECK ((public.can_view_all_sales() OR public.has_role(auth.uid(), 'supervisor'::public.app_role)));


--
-- Name: e2e_cleanup_rate_limit deny_all_delete_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_delete_anon ON public.e2e_cleanup_rate_limit FOR DELETE TO anon USING (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_delete_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_delete_authenticated ON public.e2e_cleanup_rate_limit FOR DELETE TO authenticated USING (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_insert_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_insert_anon ON public.e2e_cleanup_rate_limit FOR INSERT TO anon WITH CHECK (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_insert_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_insert_authenticated ON public.e2e_cleanup_rate_limit FOR INSERT TO authenticated WITH CHECK (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_select_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_select_anon ON public.e2e_cleanup_rate_limit FOR SELECT TO anon USING (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_select_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_select_authenticated ON public.e2e_cleanup_rate_limit FOR SELECT TO authenticated USING (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_update_anon; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_update_anon ON public.e2e_cleanup_rate_limit FOR UPDATE TO anon USING (false) WITH CHECK (false);


--
-- Name: e2e_cleanup_rate_limit deny_all_update_authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY deny_all_update_authenticated ON public.e2e_cleanup_rate_limit FOR UPDATE TO authenticated USING (false) WITH CHECK (false);


--
-- Name: login_attempts login_attempts_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY login_attempts_select_policy ON public.login_attempts FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: comparison_reactions no_direct_insert_reactions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY no_direct_insert_reactions ON public.comparison_reactions FOR INSERT WITH CHECK (false);


--
-- Name: order_item_personalizations order_item_p_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_item_p_select_scope ON public.order_item_personalizations FOR SELECT USING ((EXISTS ( SELECT 1
   FROM (public.order_items oi
     JOIN public.orders o ON ((o.id = oi.order_id)))
  WHERE ((oi.id = order_item_personalizations.order_item_id) AND ((o.seller_id = auth.uid()) OR public.can_view_all_sales())))));


--
-- Name: order_items order_items_manage_v10; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY order_items_manage_v10 ON public.order_items TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.seller_id = auth.uid())))));


--
-- Name: orders orders_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_delete_scope ON public.orders FOR DELETE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: orders orders_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_insert_scope ON public.orders FOR INSERT TO authenticated WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: orders orders_manage_v10; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_manage_v10 ON public.orders TO authenticated USING ((seller_id = auth.uid())) WITH CHECK ((seller_id = auth.uid()));


--
-- Name: orders orders_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_select_scope ON public.orders FOR SELECT TO authenticated USING ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid())));


--
-- Name: orders orders_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY orders_update_scope ON public.orders FOR UPDATE TO authenticated USING ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))) WITH CHECK ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid())));


--
-- Name: ownership_audit_reports ownership_audit_reports_admin_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ownership_audit_reports_admin_delete ON public.ownership_audit_reports FOR DELETE USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: ownership_audit_reports ownership_audit_reports_admin_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ownership_audit_reports_admin_insert ON public.ownership_audit_reports FOR INSERT WITH CHECK ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: ownership_audit_reports ownership_audit_reports_admin_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ownership_audit_reports_admin_select ON public.ownership_audit_reports FOR SELECT USING ((public.has_role(auth.uid(), 'admin'::public.app_role) OR public.has_role(auth.uid(), 'dev'::public.app_role)));


--
-- Name: quote_approval_tokens qatokens_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qatokens_delete_scope ON public.quote_approval_tokens FOR DELETE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_approval_tokens qatokens_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qatokens_insert_scope ON public.quote_approval_tokens FOR INSERT TO authenticated WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_approval_tokens qatokens_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qatokens_select_scope ON public.quote_approval_tokens FOR SELECT TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_approval_tokens qatokens_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qatokens_update_scope ON public.quote_approval_tokens FOR UPDATE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid()))) WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_comments qcomments_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qcomments_insert_scope ON public.quote_comments FOR INSERT TO authenticated WITH CHECK (((user_id = auth.uid()) AND (public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE (((q.id)::text = quote_comments.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))));


--
-- Name: quote_templates qtemplates_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qtemplates_delete_scope ON public.quote_templates FOR DELETE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_templates qtemplates_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qtemplates_insert_scope ON public.quote_templates FOR INSERT TO authenticated WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_templates qtemplates_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qtemplates_select_scope ON public.quote_templates FOR SELECT TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_templates qtemplates_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY qtemplates_update_scope ON public.quote_templates FOR UPDATE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid()))) WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quote_item_personalizations quote_item_personalizations_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_item_personalizations_delete_scope ON public.quote_item_personalizations FOR DELETE USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM (public.quote_items qi
     JOIN public.quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = auth.uid()))))));


--
-- Name: quote_item_personalizations quote_item_personalizations_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_item_personalizations_insert_scope ON public.quote_item_personalizations FOR INSERT WITH CHECK ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM (public.quote_items qi
     JOIN public.quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND (q.seller_id = auth.uid()))))));


--
-- Name: quote_item_personalizations quote_item_personalizations_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_item_personalizations_select_scope ON public.quote_item_personalizations FOR SELECT USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM (public.quote_items qi
     JOIN public.quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids))))))))));


--
-- Name: quote_item_personalizations quote_item_personalizations_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_item_personalizations_update_scope ON public.quote_item_personalizations FOR UPDATE USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM (public.quote_items qi
     JOIN public.quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))) WITH CHECK ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM (public.quote_items qi
     JOIN public.quotes q ON ((q.id = qi.quote_id)))
  WHERE ((qi.id = quote_item_personalizations.quote_item_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids))))))))));


--
-- Name: quote_items quote_items_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_items_delete_scope ON public.quote_items FOR DELETE USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = auth.uid()))))));


--
-- Name: quote_items quote_items_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_items_insert_scope ON public.quote_items FOR INSERT WITH CHECK ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_items.quote_id) AND (q.seller_id = auth.uid()))))));


--
-- Name: quote_items quote_items_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_items_select_scope ON public.quote_items FOR SELECT USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids))))))))));


--
-- Name: quote_items quote_items_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quote_items_update_scope ON public.quote_items FOR UPDATE USING ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))))))))) WITH CHECK ((public.can_view_all_sales() OR (EXISTS ( SELECT 1
   FROM public.quotes q
  WHERE ((q.id = quote_items.quote_id) AND ((q.seller_id = auth.uid()) OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((q.organization_id IS NULL) OR (q.organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids))))))))));


--
-- Name: quotes quotes_delete_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quotes_delete_scope ON public.quotes FOR DELETE TO authenticated USING ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quotes quotes_insert_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quotes_insert_scope ON public.quotes FOR INSERT TO authenticated WITH CHECK ((public.can_view_all_sales() OR (seller_id = auth.uid())));


--
-- Name: quotes quotes_select_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quotes_select_scope ON public.quotes FOR SELECT TO authenticated USING ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid())));


--
-- Name: quotes quotes_update_scope; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY quotes_update_scope ON public.quotes FOR UPDATE TO authenticated USING ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid()))) WITH CHECK ((public.can_view_all_sales() OR (public.has_role(auth.uid(), 'supervisor'::public.app_role) AND ((organization_id IS NULL) OR (organization_id IN ( SELECT public.get_user_org_ids(auth.uid()) AS get_user_org_ids)))) OR (seller_id = auth.uid())));


--
-- Name: rls_denial_log rls_denial_log_select_policy; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rls_denial_log_select_policy ON public.rls_denial_log FOR SELECT TO authenticated USING (public.is_supervisor_or_above(auth.uid()));


--
-- Name: system_settings system_settings readable by authenticated; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "system_settings readable by authenticated" ON public.system_settings FOR SELECT TO authenticated USING (true);


--
-- Name: user_comparisons users_delete_own_comparisons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_delete_own_comparisons ON public.user_comparisons FOR DELETE USING ((auth.uid() = user_id));


--
-- Name: user_comparisons users_insert_own_comparisons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_insert_own_comparisons ON public.user_comparisons FOR INSERT WITH CHECK ((auth.uid() = user_id));


--
-- Name: user_comparisons users_select_own_comparisons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_select_own_comparisons ON public.user_comparisons FOR SELECT USING ((auth.uid() = user_id));


--
-- Name: user_comparisons users_update_own_comparisons; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY users_update_own_comparisons ON public.user_comparisons FOR UPDATE USING ((auth.uid() = user_id));


--
