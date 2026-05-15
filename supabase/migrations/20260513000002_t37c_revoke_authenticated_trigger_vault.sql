-- T37c: Revoke EXECUTE from authenticated on all trigger functions + vault functions.
-- Trigger functions are called by the trigger mechanism, never via RPC/PostgREST.
-- Vault functions are backend-only, called via service_role from edge functions.
-- Neither category should be callable by the authenticated role.
-- Impact: 259 → 210 authenticated_security_definer_function_executable violations.

-- TRIGGER FUNCTIONS (45)
REVOKE EXECUTE ON FUNCTION public.audit_mcp_api_keys_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_mcp_key_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_mcp_key_revoke() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.audit_user_role_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.charge_mockup_credits_for_job() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.cleanup_user_search_history() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.dispatch_quote_webhook_event() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_audit_gravacao_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_capture_stock_snapshot() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_check_preco_minimo_faixa() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_derive_similarity_pairs_on_insert() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_ensure_seller_discount_limit() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_grant_default_role_on_profile() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_qip_propagate_to_quote_items() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_quote_children_enforce_parent_immutability() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_quotes_enforce_immutability() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_quotes_recalc_subtotal_from_items() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_quotes_validate_discount() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_remove_similarity_pairs_on_delete() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_novelty_to_product() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_product_deactivation_to_similarity() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_sync_product_stock_cache() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_toggle_group_similarity_pairs() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_update_supplier_last_sync() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.fn_validate_member_supplier() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_order_number() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.generate_quote_number() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.guard_mcp_api_keys_writes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.limit_recently_viewed_items() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mcp_key_changes() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mcp_key_revocation() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.log_mockup_prompt_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.move_collection_item_to_trash() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.move_favorite_to_trash() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_discount_approval_request() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_new_order() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_client_response() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_quote_status_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_profile_role_change() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.prevent_role_self_update() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_auto_revoke_mcp_on_role_loss() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.trim_connection_test_history() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.validate_quote_real_discount() FROM authenticated;

-- VAULT FUNCTIONS (4) — require vault schema access, backend-only via service_role
REVOKE EXECUTE ON FUNCTION public.vault_delete_secret(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_get_secret(text) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_list_secret_names() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.vault_set_secret(text, text, text) FROM authenticated;
