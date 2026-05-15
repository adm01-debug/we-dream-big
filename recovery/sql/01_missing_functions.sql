-- ============================================================
-- RECOVERY — FASE A (Functions necessárias)
-- 19 functions chamadas por triggers das 55 tabelas faltantes
-- Origem: block04_functions.sql do dump Lovable
-- ============================================================
-- ORDEM: helpers gerais → específicas → de auditoria MCP
-- IDEMPOTENTE: usa CREATE OR REPLACE FUNCTION
-- DEPENDÊNCIAS: pgcrypto (gen_random_bytes), auth schema, public.app_role enum
-- ============================================================


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.generate_secure_token() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- Generate a cryptographically secure 32-byte hex token
  NEW.token := encode(gen_random_bytes(32), 'hex');
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_created_by_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.created_by IS NULL THEN
    NEW.created_by := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.created_by <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: created_by (%) difere do usuário autenticado (%).',
      NEW.created_by, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_created_by_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_seller_id_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.seller_id IS NULL THEN
    NEW.seller_id := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.seller_id <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: seller_id (%) difere do usuário autenticado (%).',
      NEW.seller_id, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_seller_id_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.enforce_user_id_owner() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_uid uuid := auth.uid();
BEGIN
  IF v_uid IS NULL THEN RETURN NEW; END IF;

  IF NEW.user_id IS NULL THEN
    NEW.user_id := v_uid;
    RETURN NEW;
  END IF;

  IF NEW.user_id <> v_uid AND NOT public._can_act_on_behalf_of_others() THEN
    RAISE EXCEPTION 'Não autorizado: user_id (%) difere do usuário autenticado (%).',
      NEW.user_id, v_uid USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
EXCEPTION
  WHEN insufficient_privilege THEN RAISE;
  WHEN OTHERS THEN
    RAISE WARNING 'enforce_user_id_owner failed: %', SQLERRM;
    RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_magic_up_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.set_optimization_queue_updated_at() RETURNS trigger
    LANGUAGE plpgsql
    SET search_path TO 'public'
    AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_mockup_prompt_change() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_OP = 'UPDATE' AND (OLD.prompt_text IS DISTINCT FROM NEW.prompt_text OR OLD.ai_model IS DISTINCT FROM NEW.ai_model) THEN
    NEW.version := OLD.version + 1;
    INSERT INTO public.mockup_prompt_history (
      config_id, config_key, old_prompt, new_prompt, ai_model, version, changed_by
    ) VALUES (
      NEW.id, NEW.config_key, OLD.prompt_text, NEW.prompt_text, NEW.ai_model, NEW.version, auth.uid()
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.trim_connection_test_history() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  DELETE FROM public.connection_test_history
  WHERE connection_id = NEW.connection_id
    AND id NOT IN (
      SELECT id FROM public.connection_test_history
      WHERE connection_id = NEW.connection_id
      ORDER BY tested_at DESC
      LIMIT 200
    );
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_scheduled_report_email() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  user_email TEXT;
BEGIN
  SELECT email INTO user_email
  FROM public.profiles
  WHERE user_id = NEW.user_id;

  IF user_email IS NULL OR NEW.email_to != user_email THEN
    RAISE EXCEPTION 'email_to must match your registered email address';
  END IF;

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.validate_status_fields() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF NEW.status NOT IN ('draft', 'pending', 'sent', 'approved', 'rejected', 'expired', 'revision', 'pending_approval', 'converted', 'viewed') THEN
      RAISE EXCEPTION 'Invalid quote status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'orders' THEN
    IF NEW.status NOT IN ('pending', 'confirmed', 'in_production', 'shipped', 'delivered', 'cancelled') THEN
      RAISE EXCEPTION 'Invalid order status: %', NEW.status;
    END IF;
    IF NEW.fulfillment_status NOT IN ('unfulfilled', 'partially_fulfilled', 'fulfilled') THEN
      RAISE EXCEPTION 'Invalid fulfillment status: %', NEW.fulfillment_status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'custom_kits' THEN
    IF NEW.status NOT IN ('draft', 'ready', 'shared', 'archived') THEN
      RAISE EXCEPTION 'Invalid kit status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded', 'revoked') THEN
      RAISE EXCEPTION 'Invalid token status: %', NEW.status;
    END IF;
  END IF;

  IF TG_TABLE_NAME = 'quote_approval_tokens' THEN
    IF NEW.status NOT IN ('active', 'expired', 'responded') THEN
      RAISE EXCEPTION 'Invalid approval token status: %', NEW.status;
    END IF;
  END IF;

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.move_collection_item_to_trash() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _user_id UUID;
BEGIN
  SELECT user_id INTO _user_id FROM public.collections WHERE id = OLD.collection_id;
  IF _user_id IS NULL THEN
    RETURN OLD;
  END IF;

  INSERT INTO public.collection_items_trash (
    original_id, collection_id, user_id, product_id,
    color_name, color_hex, thumbnail_url, notes, sort_order
  ) VALUES (
    OLD.id, OLD.collection_id, _user_id, OLD.product_id,
    OLD.color_name, OLD.color_hex, OLD.thumbnail_url, OLD.notes, OLD.sort_order
  );
  RETURN OLD;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.invalidate_used_approval_token() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  -- When a response is recorded, mark as expired to prevent reuse
  IF NEW.responded_at IS NOT NULL AND OLD.responded_at IS NULL THEN
    NEW.status := 'responded';
    -- Set expires_at to now to prevent any further use
    NEW.expires_at := now();
  END IF;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.notify_quote_client_response() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  notif_title TEXT;
  notif_message TEXT;
  notif_type TEXT;
BEGIN
  -- Only trigger when responded_at changes from null
  IF OLD.responded_at IS NOT NULL OR NEW.responded_at IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.response = 'approved' THEN
    notif_title := '🎉 Cliente aprovou o orçamento!';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' aprovou o orçamento via link de aprovação.';
    notif_type := 'success';
  ELSIF NEW.response = 'rejected' THEN
    notif_title := '😔 Cliente recusou o orçamento';
    notif_message := COALESCE(NEW.client_name, 'O cliente') || ' recusou o orçamento via link de aprovação.';
    notif_type := 'warning';
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.workspace_notifications (user_id, title, message, type, category, action_url)
  VALUES (NEW.seller_id, notif_title, notif_message, notif_type, 'quotes', '/orcamentos');

  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.dispatch_quote_webhook_event() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public', 'extensions'
    AS $$
DECLARE
  _event text;
  _payload jsonb;
  _project_url text := 'https://nmojwpihnslkssljowjh.supabase.co';
BEGIN
  IF TG_TABLE_NAME = 'quotes' THEN
    IF TG_OP = 'INSERT' THEN
      _event := 'quote.created';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
      _event := 'quote.' || NEW.status;
    ELSE
      RETURN NEW;
    END IF;
    _payload := jsonb_build_object(
      'id', NEW.id, 'quote_number', NEW.quote_number, 'status', NEW.status,
      'client_name', NEW.client_name, 'client_email', NEW.client_email,
      'total', NEW.total, 'seller_id', NEW.seller_id, 'updated_at', NEW.updated_at
    );
  ELSIF TG_TABLE_NAME = 'orders' THEN
    IF TG_OP = 'INSERT' THEN _event := 'order.created'; ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object(
      'id', NEW.id, 'order_number', NEW.order_number, 'status', NEW.status,
      'client_name', NEW.client_name, 'total', NEW.total, 'seller_id', NEW.seller_id
    );
  ELSIF TG_TABLE_NAME = 'discount_approval_requests' THEN
    IF TG_OP = 'INSERT' THEN _event := 'discount.requested';
    ELSIF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status IN ('approved','rejected') THEN
      _event := 'discount.' || NEW.status;
    ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object(
      'id', NEW.id, 'quote_id', NEW.quote_id,
      'requested_discount_percent', NEW.requested_discount_percent,
      'status', NEW.status, 'seller_id', NEW.seller_id
    );
  ELSIF TG_TABLE_NAME = 'kit_share_tokens' THEN
    IF TG_OP = 'INSERT' THEN _event := 'kit.shared'; ELSE RETURN NEW; END IF;
    _payload := jsonb_build_object(
      'id', NEW.id, 'kit_id', NEW.kit_id, 'token', NEW.token,
      'client_name', NEW.client_name, 'seller_id', NEW.seller_id
    );
  ELSE
    RETURN NEW;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM public.outbound_webhooks WHERE active = true AND _event = ANY(events)
  ) THEN
    RETURN NEW;
  END IF;

  PERFORM extensions.http_post(
    url := _project_url || '/functions/v1/webhook-dispatcher',
    body := jsonb_build_object('event', _event, 'payload', _payload)::text,
    params := '{}'::jsonb,
    headers := jsonb_build_object('Content-Type', 'application/json'),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_mcp_key_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _is_full BOOLEAN := '*' = ANY(NEW.scopes);
BEGIN
  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
  VALUES (
    COALESCE(NEW.created_by, auth.uid()),
    CASE WHEN _is_full THEN 'mcp_key.issued_full' ELSE 'mcp_key.issued' END,
    'mcp_api_key', NEW.id::text,
    jsonb_build_object(
      'name', NEW.name, 'key_prefix', NEW.key_prefix, 'scopes', NEW.scopes,
      'is_full_access', _is_full, 'expires_at', NEW.expires_at,
      'created_by', NEW.created_by, 'auto_logged', true
    )
  );
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_mcp_key_revoke() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
    VALUES (
      auth.uid(), 'mcp_key.revoked', 'mcp_api_key', NEW.id::text,
      jsonb_build_object(
        'name', NEW.name, 'key_prefix', NEW.key_prefix, 'scopes', NEW.scopes,
        'revoked_at', NEW.revoked_at, 'auto_logged', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.audit_mcp_api_keys_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action text; v_user_id uuid; v_resource_id text; v_details jsonb;
  v_changed jsonb := '{}'::jsonb;
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_user_id := COALESCE(OLD.created_by, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := OLD.id::text;
    v_action := 'mcp_key.db_deleted';
    v_details := jsonb_build_object(
      'name', OLD.name, 'key_prefix', OLD.key_prefix, 'scopes', to_jsonb(OLD.scopes),
      'was_revoked', (OLD.revoked_at IS NOT NULL), 'created_by', OLD.created_by
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id := COALESCE(NEW.created_by, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := NEW.id::text;
    v_action := 'mcp_key.db_inserted';
    v_details := jsonb_build_object(
      'name', NEW.name, 'key_prefix', NEW.key_prefix, 'scopes', to_jsonb(NEW.scopes),
      'is_full', (NEW.scopes @> ARRAY['*']::text[]),
      'expires_at', NEW.expires_at, 'rotated_from', NEW.rotated_from, 'created_by', NEW.created_by
    );
  ELSE
    v_user_id := COALESCE(auth.uid(), NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := NEW.id::text;
    IF OLD.name IS DISTINCT FROM NEW.name THEN
      v_changed := v_changed || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
    END IF;
    IF OLD.scopes IS DISTINCT FROM NEW.scopes THEN
      v_changed := v_changed || jsonb_build_object('scopes', jsonb_build_object('old', to_jsonb(OLD.scopes), 'new', to_jsonb(NEW.scopes)));
    END IF;
    IF OLD.expires_at IS DISTINCT FROM NEW.expires_at THEN
      v_changed := v_changed || jsonb_build_object('expires_at', jsonb_build_object('old', OLD.expires_at, 'new', NEW.expires_at));
    END IF;
    IF OLD.revoked_at IS DISTINCT FROM NEW.revoked_at THEN
      v_changed := v_changed || jsonb_build_object('revoked_at', jsonb_build_object('old', OLD.revoked_at, 'new', NEW.revoked_at));
    END IF;
    IF v_changed = '{}'::jsonb THEN RETURN NEW; END IF;
    IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
      v_action := 'mcp_key.db_revoked';
    ELSIF OLD.scopes IS DISTINCT FROM NEW.scopes
          AND (NEW.scopes @> ARRAY['*']::text[])
          AND NOT (COALESCE(OLD.scopes, ARRAY[]::text[]) @> ARRAY['*']::text[]) THEN
      v_action := 'mcp_key.db_scope_escalated';
    ELSE
      v_action := 'mcp_key.db_updated';
    END IF;
    v_details := jsonb_build_object(
      'name', NEW.name, 'key_prefix', NEW.key_prefix, 'changed', v_changed,
      'is_full_now', (NEW.scopes @> ARRAY['*']::text[]), 'created_by', NEW.created_by
    );
  END IF;

  INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details, source, status, created_at)
  VALUES (v_user_id, v_action, 'mcp_api_key', v_resource_id, v_details, 'db_trigger:mcp_api_keys', 'success', now());

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'audit_mcp_api_keys_changes failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.guard_mcp_api_keys_writes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_role TEXT := current_setting('role', true);
  v_actor UUID := auth.uid();
BEGIN
  IF v_role = 'service_role' OR current_user = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;

  PERFORM public.record_mcp_access_violation(
    v_actor, 'unauthorized_direct_write', 'db_trigger:mcp_api_keys', TG_OP,
    COALESCE(NEW.id, OLD.id), NULL, NULL, NULL,
    jsonb_build_object('current_user', current_user, 'role', v_role)
  );

  RAISE EXCEPTION 'Direct writes to mcp_api_keys are not allowed';
END;
$$;


-- ─────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.log_mcp_key_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  actor uuid; changed jsonb := '{}'::jsonb;
  fields text[] := ARRAY[]::text[];
  was_full boolean; is_now_full boolean; escalated boolean := false;
BEGIN
  actor := public.mcp_audit_actor(NEW.created_by);

  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
    VALUES (
      actor, 'mcp_key.revoked', 'mcp_api_key', NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix, 'name', NEW.name, 'scopes', NEW.scopes,
        'is_full_access', '*' = ANY(NEW.scopes), 'revoked_at', NEW.revoked_at
      )
    );
    RETURN NEW;
  END IF;

  IF NEW.name IS DISTINCT FROM OLD.name THEN
    fields := array_append(fields, 'name');
    changed := changed || jsonb_build_object('name', jsonb_build_object('before', OLD.name, 'after', NEW.name));
  END IF;
  IF NEW.description IS DISTINCT FROM OLD.description THEN
    fields := array_append(fields, 'description');
    changed := changed || jsonb_build_object('description', jsonb_build_object('before', OLD.description, 'after', NEW.description));
  END IF;
  IF NEW.expires_at IS DISTINCT FROM OLD.expires_at THEN
    fields := array_append(fields, 'expires_at');
    changed := changed || jsonb_build_object('expires_at', jsonb_build_object('before', OLD.expires_at, 'after', NEW.expires_at));
  END IF;
  IF NEW.scopes IS DISTINCT FROM OLD.scopes THEN
    fields := array_append(fields, 'scopes');
    changed := changed || jsonb_build_object('scopes', jsonb_build_object('before', OLD.scopes, 'after', NEW.scopes));
    was_full := '*' = ANY(COALESCE(OLD.scopes, ARRAY[]::text[]));
    is_now_full := '*' = ANY(COALESCE(NEW.scopes, ARRAY[]::text[]));
    IF NOT was_full AND is_now_full THEN escalated := true; END IF;
  END IF;

  IF array_length(fields, 1) IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
    VALUES (
      actor, 'mcp_key.updated', 'mcp_api_key', NEW.id::text,
      jsonb_build_object(
        'key_prefix', NEW.key_prefix, 'name', NEW.name,
        'fields_changed', fields, 'diff', changed, 'escalated_to_full', escalated
      )
    );

    IF escalated THEN
      INSERT INTO public.admin_audit_log (user_id, action, resource_type, resource_id, details)
      VALUES (
        actor, 'mcp_key.scope_escalated', 'mcp_api_key', NEW.id::text,
        jsonb_build_object(
          'key_prefix', NEW.key_prefix, 'name', NEW.name,
          'before_scopes', OLD.scopes, 'after_scopes', NEW.scopes
        )
      );
    END IF;
  END IF;

  RETURN NEW;
END;
$$;
