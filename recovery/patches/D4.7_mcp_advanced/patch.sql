

-- ═══════════════════════════════════════════════════════════════════
-- FUNCTIONS PATCH D.4.7 MCP Advanced (P2)
-- ═══════════════════════════════════════════════════════════════════

BEGIN;

-- ─── Function: audit_mcp_api_keys_changes() ───
--

CREATE FUNCTION public.audit_mcp_api_keys_changes() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  v_action       text;
  v_user_id      uuid;
  v_resource_id  text;
  v_details      jsonb;
  v_old_scopes   text[];
  v_new_scopes   text[];
  v_old_revoked  timestamptz;
  v_new_revoked  timestamptz;
  v_old_expires  timestamptz;
  v_new_expires  timestamptz;
  v_old_name     text;
  v_new_name     text;
  v_changed      jsonb := '{}'::jsonb;
BEGIN
  -- Resolve identidade: created_by da linha, fallback para auth.uid(), fallback para zero-uuid (system)
  IF TG_OP = 'DELETE' THEN
    v_user_id    := COALESCE(OLD.created_by, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := OLD.id::text;
    v_action     := 'mcp_key.db_deleted';
    v_details    := jsonb_build_object(
      'name',       OLD.name,
      'key_prefix', OLD.key_prefix,
      'scopes',     to_jsonb(OLD.scopes),
      'was_revoked', (OLD.revoked_at IS NOT NULL),
      'created_by', OLD.created_by
    );
  ELSIF TG_OP = 'INSERT' THEN
    v_user_id    := COALESCE(NEW.created_by, auth.uid(), '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := NEW.id::text;
    v_action     := 'mcp_key.db_inserted';
    v_details    := jsonb_build_object(
      'name',         NEW.name,
      'key_prefix',   NEW.key_prefix,
      'scopes',       to_jsonb(NEW.scopes),
      'is_full',      (NEW.scopes @> ARRAY['*']::text[]),
      'expires_at',   NEW.expires_at,
      'rotated_from', NEW.rotated_from,
      'created_by',   NEW.created_by
    );
  ELSE -- UPDATE
    v_user_id    := COALESCE(auth.uid(), NEW.created_by, '00000000-0000-0000-0000-000000000000'::uuid);
    v_resource_id := NEW.id::text;

    v_old_scopes  := OLD.scopes;
    v_new_scopes  := NEW.scopes;
    v_old_revoked := OLD.revoked_at;
    v_new_revoked := NEW.revoked_at;
    v_old_expires := OLD.expires_at;
    v_new_expires := NEW.expires_at;
    v_old_name    := OLD.name;
    v_new_name    := NEW.name;

    -- Detecta o que mudou para um diff conciso
    IF v_old_name IS DISTINCT FROM v_new_name THEN
      v_changed := v_changed || jsonb_build_object('name', jsonb_build_object('old', v_old_name, 'new', v_new_name));
    END IF;
    IF v_old_scopes IS DISTINCT FROM v_new_scopes THEN
      v_changed := v_changed || jsonb_build_object('scopes', jsonb_build_object('old', to_jsonb(v_old_scopes), 'new', to_jsonb(v_new_scopes)));
    END IF;
    IF v_old_expires IS DISTINCT FROM v_new_expires THEN
      v_changed := v_changed || jsonb_build_object('expires_at', jsonb_build_object('old', v_old_expires, 'new', v_new_expires));
    END IF;
    IF v_old_revoked IS DISTINCT FROM v_new_revoked THEN
      v_changed := v_changed || jsonb_build_object('revoked_at', jsonb_build_object('old', v_old_revoked, 'new', v_new_revoked));
    END IF;

    -- Sem mudanças relevantes (ex.: somente touch em colunas auditadas externamente como last_used_at)
    -- Não auditamos: barulho desnecessário e last_used_at é registrado pelo mcp-server.
    IF v_changed = '{}'::jsonb THEN
      RETURN NEW;
    END IF;

    -- Sub-ação semântica para facilitar busca
    IF v_old_revoked IS NULL AND v_new_revoked IS NOT NULL THEN
      v_action := 'mcp_key.db_revoked';
    ELSIF v_old_scopes IS DISTINCT FROM v_new_scopes
          AND (v_new_scopes @> ARRAY['*']::text[])
          AND NOT (COALESCE(v_old_scopes, ARRAY[]::text[]) @> ARRAY['*']::text[]) THEN
      v_action := 'mcp_key.db_scope_escalated';
    ELSE
      v_action := 'mcp_key.db_updated';
    END IF;

    v_details := jsonb_build_object(
      'name',       NEW.name,
      'key_prefix', NEW.key_prefix,
      'changed',    v_changed,
      'is_full_now', (NEW.scopes @> ARRAY['*']::text[]),
      'created_by', NEW.created_by
    );
  END IF;

  -- Insere com source identificando trigger (edge functions usam 'mcp-keys-*')
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id,
    details, source, status, created_at
  ) VALUES (
    v_user_id,
    v_action,
    'mcp_api_key',
    v_resource_id,
    v_details,
    'db_trigger:mcp_api_keys',
    'success',
    now()
  );

  RETURN COALESCE(NEW, OLD);
EXCEPTION WHEN OTHERS THEN
  -- Nunca bloquear a operação principal por falha de auditoria
  RAISE WARNING 'audit_mcp_api_keys_changes failed: %', SQLERRM;
  RETURN COALESCE(NEW, OLD);
END;
$$;


--

-- ─── Function: audit_mcp_key_insert() ───
--

CREATE FUNCTION public.audit_mcp_key_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  _is_full BOOLEAN := '*' = ANY(NEW.scopes);
BEGIN
  INSERT INTO public.admin_audit_log (
    user_id, action, resource_type, resource_id, details
  ) VALUES (
    COALESCE(NEW.created_by, auth.uid()),
    CASE WHEN _is_full THEN 'mcp_key.issued_full' ELSE 'mcp_key.issued' END,
    'mcp_api_key',
    NEW.id::text,
    jsonb_build_object(
      'name', NEW.name,
      'key_prefix', NEW.key_prefix,
      'scopes', NEW.scopes,
      'is_full_access', _is_full,
      'expires_at', NEW.expires_at,
      'created_by', NEW.created_by,
      'auto_logged', true
    )
  );
  RETURN NEW;
END;
$$;


--

-- ─── Function: audit_mcp_key_revoke() ───
--

CREATE FUNCTION public.audit_mcp_key_revoke() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  IF OLD.revoked_at IS NULL AND NEW.revoked_at IS NOT NULL THEN
    INSERT INTO public.admin_audit_log (
      user_id, action, resource_type, resource_id, details
    ) VALUES (
      auth.uid(),
      'mcp_key.revoked',
      'mcp_api_key',
      NEW.id::text,
      jsonb_build_object(
        'name', NEW.name,
        'key_prefix', NEW.key_prefix,
        'scopes', NEW.scopes,
        'revoked_at', NEW.revoked_at,
        'auto_logged', true
      )
    );
  END IF;
  RETURN NEW;
END;
$$;


--

COMMIT;
