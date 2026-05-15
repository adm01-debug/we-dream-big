-- T37a: Convert 63 SAFE_TO_CONVERT functions from SECURITY DEFINER to SECURITY INVOKER
-- Criteria: no direct table access (no FROM/INSERT/UPDATE/DELETE in body)
--           no privilege-bypass patterns (no service_role/bypass/set session)
-- auth.uid() references are safe — that function works identically in both modes.
-- Reduces authenticated_security_definer_function_executable: 322 → 259

ALTER FUNCTION public._can_act_on_behalf_of_others()                                              SECURITY INVOKER;
ALTER FUNCTION public.apply_transform(text, character varying, jsonb)                             SECURITY INVOKER;
ALTER FUNCTION public.build_full_scope_grants_v()                                                 SECURITY INVOKER;
ALTER FUNCTION public.can_approve_discount(uuid)                                                  SECURITY INVOKER;
ALTER FUNCTION public.can_grant_mcp_full(uuid)                                                    SECURITY INVOKER;
ALTER FUNCTION public.can_grant_mcp_full_to_user(uuid)                                            SECURITY INVOKER;
ALTER FUNCTION public.can_manage_connections(uuid)                                                 SECURITY INVOKER;
ALTER FUNCTION public.can_view_all_sales()                                                         SECURITY INVOKER;
ALTER FUNCTION public.can_view_audit_logs(uuid)                                                    SECURITY INVOKER;
ALTER FUNCTION public.can_view_connections(uuid)                                                   SECURITY INVOKER;
ALTER FUNCTION public.can_view_telemetry(uuid)                                                     SECURITY INVOKER;
ALTER FUNCTION public.compare_quote_versions(uuid, integer, integer)                              SECURITY INVOKER;
ALTER FUNCTION public.enable_step_up_for_user(uuid)                                               SECURITY INVOKER;
ALTER FUNCTION public.enforce_created_by_owner()                                                   SECURITY INVOKER;
ALTER FUNCTION public.enforce_seller_id_owner()                                                    SECURITY INVOKER;
ALTER FUNCTION public.enforce_user_id_owner()                                                      SECURITY INVOKER;
ALTER FUNCTION public.extract_json_value(jsonb, character varying)                                SECURITY INVOKER;
ALTER FUNCTION public.fill_integration_credential_metadata()                                       SECURITY INVOKER;
ALTER FUNCTION public.fn_audit_role_changes()                                                      SECURITY INVOKER;
ALTER FUNCTION public.fn_dar_set_snapshot_hash()                                                   SECURITY INVOKER;
ALTER FUNCTION public.fn_force_user_logout()                                                       SECURITY INVOKER;
ALTER FUNCTION public.fn_is_admin_user(uuid)                                                       SECURITY INVOKER;
ALTER FUNCTION public.fn_log_login_attempt()                                                       SECURITY INVOKER;
ALTER FUNCTION public.fn_log_step_up_event()                                                       SECURITY INVOKER;
ALTER FUNCTION public.fn_validate_role_change()                                                    SECURITY INVOKER;
ALTER FUNCTION public.generate_secure_token()                                                      SECURITY INVOKER;
ALTER FUNCTION public.get_step_up_user_settings(uuid)                                             SECURITY INVOKER;
ALTER FUNCTION public.invalidate_used_approval_token()                                             SECURITY INVOKER;
ALTER FUNCTION public.is_admin()                                                                   SECURITY INVOKER;
ALTER FUNCTION public.is_admin(uuid)                                                               SECURITY INVOKER;
ALTER FUNCTION public.is_admin_or_above(uuid)                                                      SECURITY INVOKER;
ALTER FUNCTION public.is_admin_strict(uuid)                                                        SECURITY INVOKER;
ALTER FUNCTION public.is_coord_or_above(uuid)                                                      SECURITY INVOKER;
ALTER FUNCTION public.is_dev(uuid)                                                                 SECURITY INVOKER;
ALTER FUNCTION public.is_manager_or_admin()                                                        SECURITY INVOKER;
ALTER FUNCTION public.is_seller_only(uuid)                                                         SECURITY INVOKER;
ALTER FUNCTION public.limit_recently_viewed_products()                                             SECURITY INVOKER;
ALTER FUNCTION public.magic_up_audit_changes()                                                     SECURITY INVOKER;
ALTER FUNCTION public.mcp_audit_actor(uuid)                                                        SECURITY INVOKER;
ALTER FUNCTION public.mcp_record_access_violation(uuid, text, jsonb)                              SECURITY INVOKER;
ALTER FUNCTION public.next_in_step_up_queue()                                                      SECURITY INVOKER;
ALTER FUNCTION public.normalize_unit(numeric, character varying, character varying)               SECURITY INVOKER;
ALTER FUNCTION public.ownership_audit(text)                                                        SECURITY INVOKER;
ALTER FUNCTION public.process_step_up_queue()                                                      SECURITY INVOKER;
ALTER FUNCTION public.purge_expired_step_up_artifacts()                                            SECURITY INVOKER;
ALTER FUNCTION public.purge_old_login_attempts()                                                   SECURITY INVOKER;
ALTER FUNCTION public.purge_old_rate_limits()                                                      SECURITY INVOKER;
ALTER FUNCTION public.refresh_full_scope_grants_view()                                             SECURITY INVOKER;
ALTER FUNCTION public.rls_matrix_export()                                                          SECURITY INVOKER;
ALTER FUNCTION public.save_step_up_audit(text, step_up_action, jsonb)                            SECURITY INVOKER;
ALTER FUNCTION public.set_magic_up_updated_at()                                                    SECURITY INVOKER;
ALTER FUNCTION public.step_up_challenge_create(step_up_action, text)                              SECURITY INVOKER;
ALTER FUNCTION public.toggle_user_step_up(uuid, boolean)                                           SECURITY INVOKER;
ALTER FUNCTION public.track_voice_command(text)                                                    SECURITY INVOKER;
ALTER FUNCTION public.trg_sync_external_connections()                                              SECURITY INVOKER;
ALTER FUNCTION public.update_step_up_user_settings(jsonb, uuid)                                   SECURITY INVOKER;
ALTER FUNCTION public.validate_discount_approval_status()                                          SECURITY INVOKER;
ALTER FUNCTION public.validate_ip_access_control()                                                 SECURITY INVOKER;
ALTER FUNCTION public.validate_scheduled_report_email()                                            SECURITY INVOKER;
ALTER FUNCTION public.validate_secret_rotation_action_type()                                       SECURITY INVOKER;
ALTER FUNCTION public.validate_status_fields()                                                     SECURITY INVOKER;
ALTER FUNCTION public.verify_user_step_up_required(step_up_action, uuid)                          SECURITY INVOKER;
ALTER FUNCTION public.voice_command_audit()                                                        SECURITY INVOKER;
