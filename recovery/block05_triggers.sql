-- Generated from pg_dump --schema-only --schema=public

-- Name: collections collections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: favorites favorites_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER favorites_updated_at BEFORE UPDATE ON public.favorites FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


--
-- Name: user_search_history limit_user_search_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER limit_user_search_history AFTER INSERT ON public.user_search_history FOR EACH ROW EXECUTE FUNCTION public.cleanup_user_search_history();


--
-- Name: discount_approval_requests notify_discount_approval_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER notify_discount_approval_trigger AFTER INSERT OR UPDATE ON public.discount_approval_requests FOR EACH ROW EXECUTE FUNCTION public.notify_discount_approval_request();


--
-- Name: profiles prevent_profile_role_change_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER prevent_profile_role_change_trigger BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_profile_role_change();


--
-- Name: favorite_items set_favorite_items_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_favorite_items_updated_at BEFORE UPDATE ON public.favorite_items FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: favorite_lists set_favorite_lists_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_favorite_lists_updated_at BEFORE UPDATE ON public.favorite_lists FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: magic_up_brand_kits set_magic_up_brand_kits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_magic_up_brand_kits_updated_at BEFORE UPDATE ON public.magic_up_brand_kits FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
-- Name: magic_up_campaigns set_magic_up_campaigns_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_magic_up_campaigns_updated_at BEFORE UPDATE ON public.magic_up_campaigns FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
-- Name: magic_up_public_shares set_magic_up_public_shares_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_magic_up_public_shares_updated_at BEFORE UPDATE ON public.magic_up_public_shares FOR EACH ROW EXECUTE FUNCTION public.set_magic_up_updated_at();


--
-- Name: orders set_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER set_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number();


--
-- Name: integration_credentials sync_external_connections_on_credential_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER sync_external_connections_on_credential_change AFTER INSERT OR DELETE OR UPDATE ON public.integration_credentials FOR EACH ROW EXECUTE FUNCTION public.trg_sync_external_connections();


--
-- Name: orders tr_generate_order_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER tr_generate_order_number BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.generate_order_number_v5();


--
-- Name: mcp_api_keys trg_audit_mcp_api_keys; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_mcp_api_keys AFTER INSERT OR DELETE OR UPDATE ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.audit_mcp_api_keys_changes();


--
-- Name: mcp_api_keys trg_audit_mcp_key_insert; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_mcp_key_insert AFTER INSERT ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.audit_mcp_key_insert();


--
-- Name: mcp_api_keys trg_audit_mcp_key_revoke; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_audit_mcp_key_revoke AFTER UPDATE OF revoked_at ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.audit_mcp_key_revoke();


--
-- Name: discount_approval_requests trg_dispatch_webhook_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dispatch_webhook_discount AFTER INSERT OR UPDATE ON public.discount_approval_requests FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();


--
-- Name: kit_share_tokens trg_dispatch_webhook_kit_share; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dispatch_webhook_kit_share AFTER INSERT ON public.kit_share_tokens FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();


--
-- Name: orders trg_dispatch_webhook_orders; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dispatch_webhook_orders AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();


--
-- Name: quotes trg_dispatch_webhook_quotes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_dispatch_webhook_quotes AFTER INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.dispatch_quote_webhook_event();


--
-- Name: external_connections trg_external_connections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_external_connections_updated_at BEFORE UPDATE ON public.external_connections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: favorite_items trg_favorite_items_to_trash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_favorite_items_to_trash BEFORE DELETE ON public.favorite_items FOR EACH ROW EXECUTE FUNCTION public.move_favorite_to_trash();


--
-- Name: integration_credentials trg_fill_integration_credential_metadata; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_fill_integration_credential_metadata BEFORE INSERT OR UPDATE ON public.integration_credentials FOR EACH ROW EXECUTE FUNCTION public.fill_integration_credential_metadata();


--
-- Name: quote_approval_tokens trg_generate_secure_approval_token; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_generate_secure_approval_token BEFORE INSERT ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.generate_secure_token();


--
-- Name: mcp_api_keys trg_guard_mcp_api_keys; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_guard_mcp_api_keys BEFORE INSERT OR DELETE OR UPDATE ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.guard_mcp_api_keys_writes();


--
-- Name: inbound_webhook_endpoints trg_inbound_endpoints_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_inbound_endpoints_updated_at BEFORE UPDATE ON public.inbound_webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: quote_approval_tokens trg_invalidate_used_approval_token; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_invalidate_used_approval_token BEFORE UPDATE ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.invalidate_used_approval_token();


--
-- Name: ip_access_control trg_ip_access_control_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_ip_access_control_updated_at BEFORE UPDATE ON public.ip_access_control FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kit_templates trg_kit_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_kit_templates_updated_at BEFORE UPDATE ON public.kit_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mcp_api_keys trg_log_mcp_key_changes; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_mcp_key_changes AFTER UPDATE ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.log_mcp_key_changes();


--
-- Name: mockup_prompt_configs trg_log_mockup_prompt_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_log_mockup_prompt_change BEFORE UPDATE ON public.mockup_prompt_configs FOR EACH ROW EXECUTE FUNCTION public.log_mockup_prompt_change();


--
-- Name: mcp_api_keys trg_mcp_api_keys_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_mcp_api_keys_updated_at BEFORE UPDATE ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collection_items trg_move_collection_item_to_trash; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_move_collection_item_to_trash BEFORE DELETE ON public.collection_items FOR EACH ROW EXECUTE FUNCTION public.move_collection_item_to_trash();


--
-- Name: orders trg_notify_new_order; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_new_order AFTER INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.notify_new_order();


--
-- Name: quote_approval_tokens trg_notify_quote_client_response; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_quote_client_response AFTER UPDATE ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.notify_quote_client_response();


--
-- Name: quotes trg_notify_quote_status_change; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_notify_quote_status_change AFTER UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.notify_quote_status_change();


--
-- Name: optimization_queue trg_optimization_queue_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_optimization_queue_updated_at BEFORE UPDATE ON public.optimization_queue FOR EACH ROW EXECUTE FUNCTION public.set_optimization_queue_updated_at();


--
-- Name: orders trg_orders_increment_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_orders_increment_version BEFORE UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.increment_row_version();


--
-- Name: outbound_webhooks trg_outbound_webhooks_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_outbound_webhooks_updated_at BEFORE UPDATE ON public.outbound_webhooks FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: ai_insights_cache trg_owner__ai_insights_cache__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__ai_insights_cache__user_id BEFORE INSERT ON public.ai_insights_cache FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: art_file_attachments trg_owner__art_file_attachments__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__art_file_attachments__user_id BEFORE INSERT ON public.art_file_attachments FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: cart_templates trg_owner__cart_templates__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__cart_templates__user_id BEFORE INSERT ON public.cart_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: collections trg_owner__collections__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__collections__user_id BEFORE INSERT ON public.collections FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: custom_kits trg_owner__custom_kits__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__custom_kits__user_id BEFORE INSERT ON public.custom_kits FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: discount_approval_requests trg_owner__discount_approval_requests__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__discount_approval_requests__seller_id BEFORE INSERT ON public.discount_approval_requests FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: expert_conversations trg_owner__expert_conversations__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__expert_conversations__seller_id BEFORE INSERT ON public.expert_conversations FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: external_connections trg_owner__external_connections__created_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__external_connections__created_by BEFORE INSERT ON public.external_connections FOR EACH ROW EXECUTE FUNCTION public.enforce_created_by_owner();


--
-- Name: favorite_items trg_owner__favorite_items__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__favorite_items__user_id BEFORE INSERT ON public.favorite_items FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: favorite_lists trg_owner__favorite_lists__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__favorite_lists__user_id BEFORE INSERT ON public.favorite_lists FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: follow_up_reminders trg_owner__follow_up_reminders__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__follow_up_reminders__seller_id BEFORE INSERT ON public.follow_up_reminders FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: generated_mockups trg_owner__generated_mockups__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__generated_mockups__seller_id BEFORE INSERT ON public.generated_mockups FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: inbound_webhook_endpoints trg_owner__inbound_webhook_endpoints__created_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__inbound_webhook_endpoints__created_by BEFORE INSERT ON public.inbound_webhook_endpoints FOR EACH ROW EXECUTE FUNCTION public.enforce_created_by_owner();


--
-- Name: kit_share_tokens trg_owner__kit_share_tokens__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__kit_share_tokens__seller_id BEFORE INSERT ON public.kit_share_tokens FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: magic_up_brand_kits trg_owner__magic_up_brand_kits__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_brand_kits__user_id BEFORE INSERT ON public.magic_up_brand_kits FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: magic_up_campaigns trg_owner__magic_up_campaigns__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_campaigns__user_id BEFORE INSERT ON public.magic_up_campaigns FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: magic_up_comments trg_owner__magic_up_comments__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_comments__user_id BEFORE INSERT ON public.magic_up_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: magic_up_generations trg_owner__magic_up_generations__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_generations__user_id BEFORE INSERT ON public.magic_up_generations FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: magic_up_public_shares trg_owner__magic_up_public_shares__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_public_shares__user_id BEFORE INSERT ON public.magic_up_public_shares FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: magic_up_reactions trg_owner__magic_up_reactions__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__magic_up_reactions__user_id BEFORE INSERT ON public.magic_up_reactions FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: mcp_api_keys trg_owner__mcp_api_keys__created_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__mcp_api_keys__created_by BEFORE INSERT ON public.mcp_api_keys FOR EACH ROW EXECUTE FUNCTION public.enforce_created_by_owner();


--
-- Name: mockup_drafts trg_owner__mockup_drafts__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__mockup_drafts__user_id BEFORE INSERT ON public.mockup_drafts FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: mockup_templates trg_owner__mockup_templates__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__mockup_templates__user_id BEFORE INSERT ON public.mockup_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: orders trg_owner__orders__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__orders__seller_id BEFORE INSERT ON public.orders FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: outbound_webhooks trg_owner__outbound_webhooks__created_by; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__outbound_webhooks__created_by BEFORE INSERT ON public.outbound_webhooks FOR EACH ROW EXECUTE FUNCTION public.enforce_created_by_owner();


--
-- Name: quote_approval_tokens trg_owner__quote_approval_tokens__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__quote_approval_tokens__seller_id BEFORE INSERT ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: quote_comments trg_owner__quote_comments__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__quote_comments__user_id BEFORE INSERT ON public.quote_comments FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: quote_templates trg_owner__quote_templates__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__quote_templates__seller_id BEFORE INSERT ON public.quote_templates FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: quotes trg_owner__quotes__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__quotes__seller_id BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: saved_filters trg_owner__saved_filters__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__saved_filters__user_id BEFORE INSERT ON public.saved_filters FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: saved_trends_views trg_owner__saved_trends_views__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__saved_trends_views__user_id BEFORE INSERT ON public.saved_trends_views FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: scheduled_reports trg_owner__scheduled_reports__user_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__scheduled_reports__user_id BEFORE INSERT ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.enforce_user_id_owner();


--
-- Name: seller_carts trg_owner__seller_carts__seller_id; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_owner__seller_carts__seller_id BEFORE INSERT ON public.seller_carts FOR EACH ROW EXECUTE FUNCTION public.enforce_seller_id_owner();


--
-- Name: product_price_freshness_overrides trg_pfo_set_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_pfo_set_updated_at BEFORE UPDATE ON public.product_price_freshness_overrides FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: profiles trg_prevent_role_self_update; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_prevent_role_self_update BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.prevent_role_self_update();


--
-- Name: quotes trg_quotes_increment_version; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_quotes_increment_version BEFORE UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.increment_row_version();


--
-- Name: connection_test_history trg_trim_connection_test_history; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_trim_connection_test_history AFTER INSERT ON public.connection_test_history FOR EACH ROW EXECUTE FUNCTION public.trim_connection_test_history();


--
-- Name: user_comparisons trg_user_comparisons_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_comparisons_updated_at BEFORE UPDATE ON public.user_comparisons FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_roles trg_user_roles_audit_del; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_audit_del AFTER DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();


--
-- Name: user_roles trg_user_roles_audit_ins; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_audit_ins AFTER INSERT ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();


--
-- Name: user_roles trg_user_roles_audit_upd; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_audit_upd AFTER UPDATE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.audit_user_role_changes();


--
-- Name: user_roles trg_user_roles_auto_revoke_mcp; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_user_roles_auto_revoke_mcp AFTER DELETE ON public.user_roles FOR EACH ROW EXECUTE FUNCTION public.trg_auto_revoke_mcp_on_role_loss();


--
-- Name: quote_approval_tokens trg_validate_approval_token_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_approval_token_status BEFORE INSERT OR UPDATE ON public.quote_approval_tokens FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();


--
-- Name: ip_access_control trg_validate_ip_access_control; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_ip_access_control BEFORE INSERT OR UPDATE ON public.ip_access_control FOR EACH ROW EXECUTE FUNCTION public.validate_ip_access_control();


--
-- Name: kit_share_tokens trg_validate_kit_share_token_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_kit_share_token_status BEFORE INSERT OR UPDATE ON public.kit_share_tokens FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();


--
-- Name: custom_kits trg_validate_kit_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_kit_status BEFORE INSERT OR UPDATE ON public.custom_kits FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();


--
-- Name: orders trg_validate_order_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_order_status BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();


--
-- Name: quotes trg_validate_quote_real_discount; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_quote_real_discount BEFORE INSERT OR UPDATE OF subtotal, discount_percent, negotiation_markup_percent, status ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.validate_quote_real_discount();


--
-- Name: quotes trg_validate_quote_status; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_quote_status BEFORE INSERT OR UPDATE ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.validate_status_fields();


--
-- Name: scheduled_reports trg_validate_report_email; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_report_email BEFORE INSERT OR UPDATE ON public.scheduled_reports FOR EACH ROW EXECUTE FUNCTION public.validate_scheduled_report_email();


--
-- Name: secret_rotation_log trg_validate_secret_rotation_action_type; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_validate_secret_rotation_action_type BEFORE INSERT OR UPDATE ON public.secret_rotation_log FOR EACH ROW EXECUTE FUNCTION public.validate_secret_rotation_action_type();


--
-- Name: quotes trigger_generate_quote_number; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_generate_quote_number BEFORE INSERT ON public.quotes FOR EACH ROW EXECUTE FUNCTION public.generate_quote_number();


--
-- Name: recently_viewed_products trigger_limit_recently_viewed; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_limit_recently_viewed AFTER INSERT OR UPDATE ON public.recently_viewed_products FOR EACH ROW EXECUTE FUNCTION public.limit_recently_viewed_items();


--
-- Name: recently_viewed_products trigger_limit_recently_viewed_products; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trigger_limit_recently_viewed_products AFTER INSERT ON public.recently_viewed_products FOR EACH ROW EXECUTE FUNCTION public.limit_recently_viewed_products();


--
-- Name: admin_settings update_admin_settings_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_admin_settings_updated_at BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: art_file_attachments update_art_files_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_art_files_updated_at BEFORE UPDATE ON public.art_file_attachments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: collections update_collections_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_collections_updated_at BEFORE UPDATE ON public.collections FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: conversation_delivery_status update_delivery_status_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_delivery_status_updated_at BEFORE UPDATE ON public.conversation_delivery_status FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_approval_requests update_discount_approval_requests_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_discount_approval_requests_updated_at BEFORE UPDATE ON public.discount_approval_requests FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kit_collaborators update_kit_collab_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kit_collab_updated_at BEFORE UPDATE ON public.kit_collaborators FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kit_comments update_kit_comments_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kit_comments_updated_at BEFORE UPDATE ON public.kit_comments FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: kit_variants update_kit_variants_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_kit_variants_updated_at BEFORE UPDATE ON public.kit_variants FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mockup_prompt_configs update_mockup_prompt_configs_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mockup_prompt_configs_updated_at BEFORE UPDATE ON public.mockup_prompt_configs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: mockup_templates update_mockup_templates_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_mockup_templates_updated_at BEFORE UPDATE ON public.mockup_templates FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: product_component_locations update_product_comp_loc_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_product_comp_loc_updated_at BEFORE UPDATE ON public.product_component_locations FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: saved_trends_views update_saved_trends_views_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_saved_trends_views_updated_at BEFORE UPDATE ON public.saved_trends_views FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: seller_discount_limits update_seller_discount_limits_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_seller_discount_limits_updated_at BEFORE UPDATE ON public.seller_discount_limits FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_preferences update_user_preferences_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_preferences_updated_at BEFORE UPDATE ON public.user_preferences FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: user_search_history update_user_search_history_updated_at; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER update_user_search_history_updated_at BEFORE UPDATE ON public.user_search_history FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();


--
-- Name: discount_approval_requests validate_discount_approval_status_trigger; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER validate_discount_approval_status_trigger BEFORE INSERT OR UPDATE ON public.discount_approval_requests FOR EACH ROW EXECUTE FUNCTION public.validate_discount_approval_status();


--
